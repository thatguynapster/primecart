"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { nextPeriodStart, parseInterval, pricePesewas } from "@/lib/billing/plans";
import {
  merchantIdOfReference,
  subscriptionReference,
  verifyAndApplySubscriptionPayment,
  type ApplyOutcome,
} from "@/lib/billing/subscription";
import { getDashboardOrigin } from "@/lib/domain";
import { TERMS_VERSION } from "@/lib/legal";
import { requireMerchant } from "@/lib/merchant/current";
import { PaystackError, initializeSubscriptionTransaction } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

export type BillingFormState = { error?: string };

/**
 * Starts a prepaid subscription payment (D-18). Works while lapsed: the
 * lapsed-dashboard gate exempts billing.
 *
 * The client names an interval and nothing else. Period start and price are
 * computed here from the merchant's own record, through the same
 * `nextPeriodStart`/`pricePesewas` the apply step re-checks against, so the
 * two can't disagree. The quote travels in Paystack metadata and is verified
 * again when the payment is applied.
 */
export async function startSubscriptionPayment(
  _prev: BillingFormState,
  formData: FormData
): Promise<BillingFormState> {
  const merchant = await requireMerchant();

  const interval = parseInterval(formData.get("interval"));
  if (!interval) return { error: "Choose monthly, quarterly or yearly." };

  const now = new Date();
  const periodStart = nextPeriodStart(merchant, now);
  const amount = pricePesewas(merchant, interval, periodStart);
  const reference = subscriptionReference(merchant.id, now);

  // Pressing Pay agrees to the Terms and asks for the time to start at once
  // (the note under the button). Kept with the payment and the merchant.
  await prisma.subscriptionPayment.create({
    data: {
      merchantId: merchant.id,
      reference,
      interval,
      amount: amount / 100,
      quotedPeriodStart: periodStart,
      status: "PENDING",
      termsVersion: TERMS_VERSION,
    },
  });
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { termsVersion: TERMS_VERSION, termsAcceptedAt: now },
  });

  let authorizationUrl: string;
  try {
    const transaction = await initializeSubscriptionTransaction({
      email: merchant.email,
      amountInPesewas: amount,
      reference,
      callbackUrl: `${getDashboardOrigin()}/dashboard/billing?ref=${reference}`,
      metadata: {
        type: "subscription",
        merchantId: merchant.id,
        interval,
        quotedPesewas: amount,
        periodStart: periodStart.toISOString(),
      },
    });
    authorizationUrl = transaction.authorization_url;
  } catch (error) {
    await prisma.subscriptionPayment.updateMany({
      where: { reference, status: "PENDING" },
      data: { status: "FAILED" },
    });
    if (error instanceof PaystackError) {
      return { error: "We couldn't start the payment just now. Please try again." };
    }
    throw error;
  }

  await prisma.subscriptionPayment.updateMany({
    where: { reference, status: "PENDING" },
    data: { authorizationUrl },
  });

  // This payment replaces any earlier one left unpaid, so history shows one
  // pending row, not a trail of abandoned ones. Only after Paystack accepted
  // the new one: if it had failed, the old one stays to be continued.
  // SUPERSEDED rows still apply if their old link is ever paid.
  await prisma.subscriptionPayment.updateMany({
    where: { merchantId: merchant.id, status: "PENDING", reference: { not: reference } },
    data: { status: "SUPERSEDED" },
  });

  // Preselects the same option next time.
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { billingInterval: interval },
  });

  redirect(authorizationUrl);
}

/** Paystack's hosted checkout. Anything else stored there is never followed. */
function isPaystackCheckout(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "checkout.paystack.com";
  } catch {
    return false;
  }
}

export type ResumeState = { error?: string; outcome?: ApplyOutcome };

/**
 * "Continue payment" on a payment left unpaid: back to the same Paystack
 * checkout, same reference and amount, so nothing new is created. Asks
 * Paystack first: if it was in fact paid (tab closed before returning), it's
 * applied here instead of sending the merchant to pay twice.
 */
export async function resumeSubscriptionPayment(
  _prev: ResumeState,
  formData: FormData
): Promise<ResumeState> {
  const merchant = await requireMerchant();
  const reference = String(formData.get("reference") ?? "");
  if (merchantIdOfReference(reference) !== merchant.id) {
    return { error: "This payment can't be continued." };
  }

  const payment = await prisma.subscriptionPayment.findUnique({ where: { reference } });
  if (
    !payment ||
    payment.merchantId !== merchant.id ||
    payment.status !== "PENDING" ||
    !payment.authorizationUrl ||
    !isPaystackCheckout(payment.authorizationUrl)
  ) {
    return { error: "This payment can't be continued. Start a new one above." };
  }

  const outcome = await verifyAndApplySubscriptionPayment(reference);
  if (outcome !== "pending") {
    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard", "layout");
    return { outcome };
  }

  redirect(payment.authorizationUrl);
}

/**
 * "Check payment" beside a payment still showing pending: for a merchant who
 * paid but closed the tab before coming back. Same verify-and-apply as the
 * webhook. Only ever for the signed-in merchant's own references.
 */
export async function checkSubscriptionPayment(reference: string): Promise<ApplyOutcome> {
  const merchant = await requireMerchant();
  if (merchantIdOfReference(reference) !== merchant.id) return "unknown";

  const outcome = await verifyAndApplySubscriptionPayment(reference);
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard", "layout");
  return outcome;
}
