import type { Merchant } from "@prisma/client";

import {
  nextPeriodStart,
  parseInterval,
  periodFor,
  pricePesewas,
  quoteCovers,
} from "@/lib/billing/plans";
import { invalidateStorefront } from "@/lib/merchant/lookup";
import { PaystackError, metadataOf, verifyTransaction } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

/**
 * Applying a subscription payment (D-18, brief T6).
 *
 * One function, called from two places that can race: the Paystack webhook,
 * and the billing page when the merchant's browser comes back (`?ref=`) or
 * they press "Check payment". Paystack only retries a webhook that didn't
 * return 200, so if the webhook acknowledges but fails to apply (a bug, an
 * amount mismatch it logs), the return path is the second chance. Both go
 * through here, keyed on the reference, so whichever arrives first wins and
 * the other is a no-op.
 *
 * Idempotency is a claim on the SubscriptionPayment row: PENDING -> APPLYING
 * by an updateMany that only matches PENDING. Only the winner extends the
 * subscription.
 */

/** `PCSUB-<merchantId>-<timestamp>`: only `-` and alphanumerics, per Paystack. */
export const SUBSCRIPTION_REFERENCE_PREFIX = "PCSUB-";
const SUBSCRIPTION_REFERENCE = /^PCSUB-([0-9a-f]{24})-[0-9]+$/;

export function subscriptionReference(merchantId: string, now: Date): string {
  return `${SUBSCRIPTION_REFERENCE_PREFIX}${merchantId}-${now.getTime()}`;
}

/** The merchant id a subscription reference was issued for, or null. */
export function merchantIdOfReference(reference: string): string | null {
  return SUBSCRIPTION_REFERENCE.exec(reference)?.[1] ?? null;
}

export type ApplyOutcome =
  /** This call extended the subscription. */
  | "applied"
  /** Already applied (or being applied) by another call. Nothing to do. */
  | "already"
  /** Not paid yet (abandoned, ongoing) or Paystack couldn't be asked. */
  | "pending"
  /** Paystack says the payment failed. */
  | "failed"
  /** Paid, but something didn't match. Logged, flagged REVIEW, not applied. */
  | "review"
  /** Not one of ours. */
  | "unknown";

/**
 * Statuses a paid Paystack transaction can still be applied from. SUPERSEDED
 * is included on purpose: replacing an abandoned payment hides it, but if the
 * merchant later pays its old link that money must still buy time.
 */
const APPLICABLE = ["PENDING", "FAILED", "SUPERSEDED"];

async function markReview(reference: string, why: string): Promise<ApplyOutcome> {
  console.error(`Subscription payment ${reference}: NOT applied, needs review — ${why}`);
  await prisma.subscriptionPayment.updateMany({
    where: { reference, status: { in: APPLICABLE } },
    data: { status: "REVIEW" },
  });
  return "review";
}

/**
 * Extends `currentPeriodEnd` from wherever it is *now*, with an optimistic
 * check that nothing else moved it in between (two different payments landing
 * at once must stack, not overwrite each other).
 */
async function extendSubscription(
  merchantId: string,
  interval: NonNullable<ReturnType<typeof parseInterval>>
): Promise<{ periodStart: Date; periodEnd: Date } | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) return null;

    const now = new Date();
    const { periodStart, periodEnd } = periodFor(interval, nextPeriodStart(merchant, now));

    const unchanged = merchant.currentPeriodEnd
      ? { currentPeriodEnd: merchant.currentPeriodEnd }
      : { OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { isSet: false } }] };

    const { count } = await prisma.merchant.updateMany({
      where: { id: merchantId, ...unchanged },
      data: {
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: periodEnd,
        billingInterval: interval,
      },
    });
    if (count === 1) {
      // A closed shop takes orders again at once (D-24).
      if (merchant.storefront) invalidateStorefront(merchant.storefront.subdomain);
      return { periodStart, periodEnd };
    }
  }
  return null;
}

export async function verifyAndApplySubscriptionPayment(
  reference: string
): Promise<ApplyOutcome> {
  const refMerchantId = merchantIdOfReference(reference);
  if (!refMerchantId) return "unknown";

  const existing = await prisma.subscriptionPayment.findUnique({ where: { reference } });
  if (existing && !APPLICABLE.includes(existing.status)) {
    return "already"; // SUCCESS, APPLYING or REVIEW
  }

  let tx;
  try {
    tx = await verifyTransaction(reference);
  } catch (error) {
    if (error instanceof PaystackError) return "pending";
    throw error;
  }

  if (tx.status !== "success") {
    if (tx.status === "failed" || tx.status === "reversed") {
      await prisma.subscriptionPayment.updateMany({
        where: { reference, status: "PENDING" },
        data: { status: "FAILED" },
      });
      return "failed";
    }
    return "pending";
  }

  // ---- paid: check everything before extending anything ---------------------
  const meta = metadataOf(tx.metadata);
  const interval = parseInterval(meta.interval);
  const quotedPesewas = Number(meta.quotedPesewas);
  const paidPesewas = Number(tx.amount);

  if (meta.type !== "subscription") return markReview(reference, "metadata.type is not subscription");
  if (meta.merchantId !== refMerchantId) return markReview(reference, "metadata.merchantId doesn't match the reference");
  if (!interval) return markReview(reference, `unknown interval ${String(meta.interval)}`);
  if (tx.currency !== "GHS") return markReview(reference, `currency ${tx.currency}`);
  if (!Number.isInteger(quotedPesewas) || quotedPesewas <= 0) return markReview(reference, "no quote in metadata");
  // Number(): the amount can arrive as a string (found live on orders).
  if (paidPesewas !== quotedPesewas) {
    return markReview(reference, `paid ${paidPesewas} but quoted ${quotedPesewas}`);
  }

  const merchant: Merchant | null = await prisma.merchant.findUnique({
    where: { id: refMerchantId },
  });
  if (!merchant) return markReview(reference, "merchant not found");

  // The PENDING row is written when payment starts. If that write somehow
  // never happened, rebuild it from the metadata we sent Paystack ourselves.
  let record = existing;
  if (!record) {
    const quotedStart = new Date(String(meta.periodStart));
    try {
      record = await prisma.subscriptionPayment.create({
        data: {
          merchantId: merchant.id,
          reference,
          interval,
          amount: quotedPesewas / 100,
          quotedPeriodStart: Number.isNaN(quotedStart.getTime()) ? new Date() : quotedStart,
          status: "PENDING",
        },
      });
    } catch {
      // Unique reference: a concurrent call created it first.
      record = await prisma.subscriptionPayment.findUnique({ where: { reference } });
      if (!record) throw new Error(`Subscription payment ${reference}: could not create or read its record`);
    }
  }

  if (record.merchantId !== merchant.id) return markReview(reference, "record belongs to another merchant");
  if (record.interval !== interval) return markReview(reference, `record interval ${record.interval}, metadata ${interval}`);
  if (Math.round(record.amount * 100) !== quotedPesewas) return markReview(reference, "record amount differs from the quote");

  // The quote must cover the real price for the period start it was priced
  // for. Stops a tampered or stale quote (e.g. a founding price after the
  // deal ended), but accepts a list-price quote for a merchant who became
  // founding before paying it.
  const expected = pricePesewas(merchant, interval, record.quotedPeriodStart);
  if (!quoteCovers(quotedPesewas, expected)) {
    return markReview(reference, `quote ${quotedPesewas} but price for that period start is ${expected}`);
  }

  // ---- claim, then extend ------------------------------------------------------
  const claimed = await prisma.subscriptionPayment.updateMany({
    where: { reference, status: { in: APPLICABLE } },
    data: { status: "APPLYING", channel: tx.channel ?? null },
  });
  if (claimed.count === 0) return "already";

  const period = await extendSubscription(merchant.id, interval);
  if (!period) {
    // Stays APPLYING: visible on the billing page as "being processed", and
    // in the logs, for the owner to resolve by hand. Never re-applied
    // automatically, so it can't double-extend.
    console.error(
      `Subscription payment ${reference}: claimed but could not extend merchant ${merchant.id}. Needs manual fix.`
    );
    return "review";
  }

  await prisma.subscriptionPayment.update({
    where: { reference },
    data: {
      status: "SUCCESS",
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(),
    },
  });

  console.log(
    `Subscription payment ${reference}: applied ${interval} for merchant ${merchant.id}, ` +
      `${period.periodStart.toISOString()} -> ${period.periodEnd.toISOString()}`
  );
  return "applied";
}
