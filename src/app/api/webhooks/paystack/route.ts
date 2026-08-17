import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { Order } from "@prisma/client";

import { notifyNeedsReview, notifyNewOrder } from "@/lib/notifications/events";
import { OversellError, reserveStock, restoreStock } from "@/lib/orders/stock";
import { prisma } from "@/lib/prisma";
import { activateSubscription, expireSubscription } from "@/lib/subscription";

/**
 * Paystack webhook — confirms storefront payments and, since Phase 13, the
 * subscription events that gate dashboard access.
 *
 * Signature: Paystack sends `x-paystack-signature`, an HMAC-SHA512 of the raw
 * request body keyed with PAYSTACK_SECRET_KEY, hex-encoded. Verification must
 * run against the exact bytes received — `request.text()`, not the parsed
 * JSON, which could re-serialize differently and silently break every check.
 *
 * Never trust the redirect callback alone; this is the only place an order is
 * actually marked paid, and the only place a subscription is actually marked
 * active.
 */

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");

  // timingSafeEqual throws on mismatched lengths rather than returning false —
  // an attacker-controlled header must never reach it without this check.
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    status?: string;
    // Typed loosely on purpose: JSON.parse gives no runtime guarantee this
    // matches the number the docs and the transaction-verify API imply.
    // Coerced with Number() at the one place it's compared (confirmPaidOrder).
    amount?: number | string;
    // An OBJECT on every charge.success delivery, never absent and never a
    // bare string — verified live via the pre-deploy smoke test, contrary to
    // the assumption a plain `plan?: string` encoded. On an ordinary
    // storefront charge it's `{}`; only a subscription-funding charge has
    // `plan_code` populated inside it. `!event.data.plan` is therefore always
    // false (`{}` is truthy) — the bug that made this endpoint never call
    // confirmPaidOrder for a single real delivery. The discriminator has to
    // be `plan.plan_code`, not the mere presence of the `plan` key.
    plan?: { plan_code?: string } | null;
    subscription_code?: string;
    customer?: { email?: string };
    // invoice.payment_failed nests the subscription under its own key rather
    // than at the top level, unlike subscription.create/disable.
    subscription?: { subscription_code?: string };
    // Set by `startSubscriptionCheckout` at initialize time. The exact,
    // direct way to resolve which merchant a subscription charge belongs to
    // — email is only a fallback, for charges Paystack initiates itself
    // (automatic monthly renewals) that never passed through our own
    // checkout and so never got this metadata attached.
    metadata?: { merchantId?: string };
  };
};

/** Best-effort merchant email lookup — never lets a lookup failure block settlement. */
async function merchantEmail(merchantId: string): Promise<string | null> {
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  return merchant?.email ?? null;
}

function customerNameOf(order: Order): string {
  return order.shippingAddress?.name ?? "Guest";
}

/**
 * A payment confirmed while its order was still PENDING — the ordinary case.
 * The `where` clause is the whole guard: idempotent against a redelivered
 * webhook (`paymentStatus: "UNPAID"`), and race-safe against the expiry cron
 * claiming the same order in the same instant (`status: "PENDING"`). If that
 * race is lost, `count` is 0 and the caller re-reads and re-dispatches.
 */
async function settleFromPending(order: Order): Promise<boolean> {
  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: "PENDING", paymentStatus: "UNPAID" },
    data: { paymentStatus: "PAID", status: "CONFIRMED", reservedUntil: null },
  });

  if (claimed.count > 0) {
    const email = await merchantEmail(order.merchantId);
    if (email) {
      await notifyNewOrder({
        merchantEmail: email,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: customerNameOf(order),
        total: order.total,
      });
    }
  }

  return claimed.count > 0;
}

/**
 * A payment confirmed *after* its order had already expired — the reservation
 * lapsed and the cron already put the stock back, but the customer's payment
 * still went through moments too late to catch it.
 *
 * Recovers automatically where it safely can: attempts to re-reserve the same
 * stock through the exact oversell-safe path a normal checkout uses. If that
 * stock is still there — the common case, since most late webhooks are only
 * a few minutes behind — the order completes exactly as if it had never
 * expired. If the stock is gone (sold to someone else in the interim), the
 * payment is recorded (`paymentStatus: PAID`) but `status` is deliberately
 * left at `EXPIRED` rather than advanced — the money must never be lost track
 * of, but the order must not silently claim stock that does not exist. That
 * state is surfaced dashboard-side by task 10.8's "Needs review" view, and
 * here by notifyNeedsReview — an operator should not have to be staring at
 * the dashboard to find out a payment needs attention.
 */
async function settleFromExpired(order: Order): Promise<void> {
  const lineItems = order.lineItems.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
  }));

  try {
    await reserveStock(order.merchantId, lineItems);
  } catch (error) {
    if (!(error instanceof OversellError)) throw error;

    console.error(
      `Order ${order.id}: payment confirmed after its reservation expired, ` +
        `and the stock is no longer available (${error.message}). Payment is ` +
        `recorded; the order needs manual review to fulfil or refund.`
    );
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: "UNPAID" },
      data: { paymentStatus: "PAID" }, // status intentionally stays EXPIRED
    });

    const email = await merchantEmail(order.merchantId);
    if (email) {
      await notifyNeedsReview({
        merchantEmail: email,
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: "its reservation had already expired and the stock is no longer available. The order needs manual review to fulfil or refund.",
      });
    }
    return;
  }

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: "EXPIRED", paymentStatus: "UNPAID" },
    data: { status: "CONFIRMED", paymentStatus: "PAID", reservedUntil: null },
  });

  if (claimed.count === 0) {
    // Something else changed the order between the reservation above and this
    // write (another delivery of the same webhook racing this one). The
    // reservation this call just made has no order to attach to any more —
    // release it rather than leak a hold nobody will ever clear.
    await restoreStock(order.merchantId, lineItems).catch((rollbackError: unknown) => {
      console.error(`Order ${order.id}: failed to release a stray late-payment reservation:`, rollbackError);
    });
    return;
  }

  const email = await merchantEmail(order.merchantId);
  if (email) {
    await notifyNewOrder({
      merchantEmail: email,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: customerNameOf(order),
      total: order.total,
    });
  }
}

/**
 * Marks an order paid, once, from whatever state it is actually in.
 *
 * Always re-reads the order's current status rather than trusting a value the
 * caller might be holding stale — the whole point of this function is to
 * handle the case where that status changed underneath the payment.
 */
async function confirmPaidOrder(reference: string, amountPesewas?: number | string) {
  const order = await prisma.order.findFirst({ where: { paymentRef: reference } });
  if (!order) {
    console.error(`Paystack webhook: no order for reference ${reference}`);
    return;
  }
  if (order.paymentStatus !== "UNPAID") return; // already settled, by any path

  if (amountPesewas !== undefined) {
    const expected = Math.round(order.total * 100);
    // Number() rather than a strict ===: verified live that a genuine Paystack
    // webhook delivery can carry `amount` as a numeric string even though the
    // transaction-verify REST API returns the same field as a number for the
    // identical transaction — a real production bug found via the pre-deploy
    // smoke test, not a hypothetical. A strict number comparison silently
    // treated every real payment as a mismatch and never confirmed the order.
    const actual = Number(amountPesewas);
    if (expected !== actual) {
      // Flag for a human rather than confirm a payment for the wrong amount.
      console.error(
        `Paystack webhook: amount mismatch for order ${order.id}. ` +
          `Expected ${expected}, got ${amountPesewas} (typeof ${typeof amountPesewas}).`
      );
      return;
    }
  }

  if (order.status === "PENDING") {
    if (await settleFromPending(order)) return;

    // Lost a race with the expiry cron between the read above and the write —
    // re-check what the order actually is now rather than give up.
    const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
    if (!refreshed || refreshed.paymentStatus !== "UNPAID") return;
    return confirmPaidOrder(reference, amountPesewas); // one re-dispatch, on fresh state
  }

  if (order.status === "EXPIRED") {
    return settleFromExpired(order);
  }

  // CANCELLED, or any other status reached with paymentStatus still UNPAID —
  // should not happen under current business logic, but the payment still
  // arrived and must not be lost track of. Flag without touching status or
  // stock: a cancelled order was a deliberate merchant decision, not a lapsed
  // reservation, so auto-reserving behind them would be wrong.
  console.error(
    `Order ${order.id}: payment confirmed while status was ${order.status}. ` +
      `Flagging paymentStatus only — needs manual review.`
  );
  await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: "UNPAID" },
    data: { paymentStatus: "PAID" },
  });

  const email = await merchantEmail(order.merchantId);
  if (email) {
    await notifyNeedsReview({
      merchantEmail: email,
      orderId: order.id,
      orderNumber: order.orderNumber,
      reason: `it arrived while the order's status was ${order.status.toLowerCase()}, which shouldn't normally happen. Please check it.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Subscriptions (Phase 13)
// ---------------------------------------------------------------------------

/**
 * Subscription events carry the merchant's email (the address the checkout
 * was initiated with — `startSubscriptionCheckout` always passes the
 * merchant's own account email) rather than a merchantId, since Paystack's
 * subscription objects know nothing about PrimeCart's own ids. `email` is
 * `@unique` on Merchant, so this is an exact match, not a guess.
 */
async function findMerchantByEmail(email: string | undefined) {
  if (!email) return null;
  return prisma.merchant.findUnique({
    where: { email },
    select: { id: true, email: true, storefront: { select: { subdomain: true } } },
  });
}

/**
 * Resolves which merchant a subscription-related event belongs to.
 * `metadata.merchantId` first — exact, and set by `startSubscriptionCheckout`
 * on every charge it initiates — falling back to email for charges Paystack
 * initiates itself (the automatic monthly renewal), which never pass through
 * our own checkout and so never carry that metadata.
 */
async function resolveSubscriptionMerchant(data: NonNullable<PaystackEvent["data"]>) {
  const merchantId = data.metadata?.merchantId;
  if (merchantId) {
    const byId = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, email: true, storefront: { select: { subdomain: true } } },
    });
    if (byId) return byId;
  }
  return findMerchantByEmail(data.customer?.email);
}

/**
 * `subscription.create` — task 13.8. Fires exactly once per subscription
 * object, right after the very first successful plan-linked charge — never
 * again after that, even on later renewals (verified live: a second real
 * subscription payment against an already-existing subscription produced
 * only `charge.success`, no `subscription.create`). Still worth handling on
 * its own: it's the one event carrying `subscription_code`, so it's what
 * actually stores that field the first time.
 */
async function handleSubscriptionCreated(data: NonNullable<PaystackEvent["data"]>) {
  const merchant = await resolveSubscriptionMerchant(data);
  if (!merchant) {
    console.error(`Paystack webhook: subscription.create for unresolved merchant (email ${data.customer?.email ?? "none"})`);
    return;
  }
  if (!data.subscription_code) {
    console.error(`Paystack webhook: subscription.create for ${merchant.email} has no subscription_code.`);
    return;
  }

  await activateSubscription(merchant, data.subscription_code);
}

/**
 * A plan-linked `charge.success` — the reliable, always-fires signal for a
 * subscription payment, first one and every renewal alike. This is now the
 * primary place `subscriptionStatus` moves to ACTIVE; `subscription.create`
 * above only ever adds to it (storing the code on the first charge). No
 * `subscriptionCode` is passed here — a renewal charge has none of its own
 * to report, and `activateSubscription` leaves whatever's already stored
 * untouched when none is given.
 */
async function handleSubscriptionCharge(data: NonNullable<PaystackEvent["data"]>) {
  const merchant = await resolveSubscriptionMerchant(data);
  if (!merchant) {
    console.error(`Paystack webhook: plan-linked charge.success for unresolved merchant (email ${data.customer?.email ?? "none"})`);
    return;
  }

  await activateSubscription(merchant);
}

/**
 * `invoice.payment_failed` (13.9) and `subscription.disable` (13.10) — a
 * renewal charge failed, or Paystack disabled the subscription outright.
 * Same effect either way: lock the merchant out until they resubscribe.
 *
 * Matched by `paystackSubscriptionCode` first, since that is exact and
 * stable; email is the fallback for the (defensive, shouldn't happen) case
 * where the stored code and the event's don't line up.
 */
async function handleSubscriptionLapsed(data: NonNullable<PaystackEvent["data"]>) {
  const subscriptionCode = data.subscription_code ?? data.subscription?.subscription_code;

  const merchant = subscriptionCode
    ? await prisma.merchant.findFirst({
        where: { paystackSubscriptionCode: subscriptionCode },
        select: { id: true, email: true, storefront: { select: { subdomain: true } } },
      })
    : null;

  const resolved = merchant ?? (await findMerchantByEmail(data.customer?.email));
  if (!resolved) {
    console.error(
      `Paystack webhook: could not resolve a merchant for a lapsed subscription ` +
        `(code ${subscriptionCode ?? "none"}, email ${data.customer?.email ?? "none"}).`
    );
    return;
  }

  await expireSubscription(resolved);
}

export async function POST(request: Request) {
  // Logged before any validation, deliberately — this is the one line that
  // answers "did Paystack actually hit this URL at all" from Vercel's
  // function logs, independent of whether the request goes on to pass
  // signature verification. Added 2026-08-16 after the pre-deploy smoke test
  // found dev.primecart.app had no webhook URL registered with Paystack at
  // all: every payment succeeded on Paystack's side and nothing ever arrived
  // here, which looked identical to "the code is broken" from the dashboard
  // until it was diagnosed. This line is what would have shown that
  // immediately — no request row, at any log level, means "not registered
  // or not reaching this host," not "reached and failed."
  console.log(`Paystack webhook: request received at ${new Date().toISOString()}`);

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is not set — webhook cannot be verified.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-paystack-signature");
  if (!signature) {
    console.error("Paystack webhook: request had no x-paystack-signature header — rejecting.");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, signature, secret)) {
    console.error("Paystack webhook: signature did not verify — rejecting.");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error("Paystack webhook: signature verified but body is not valid JSON — rejecting.");
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  console.log(
    `Paystack webhook: verified event "${event.event}"` +
      (event.data?.reference ? `, reference ${event.data.reference}` : "") +
      (event.data?.subscription_code ? `, subscription ${event.data.subscription_code}` : "")
  );
  // A plan-linked charge (subscription payment) is never a storefront order —
  // `plan` is an object on every charge.success delivery — `{}` on an
  // ordinary storefront charge — so the check must be on `plan_code`, not on
  // the presence of `plan` itself. A plan-linked charge activates the
  // subscription directly (`handleSubscriptionCharge`) rather than going to
  // `confirmPaidOrder`, which would just log "no order for reference" since
  // no Order ever has that reference.
  if (event.event === "charge.success" && event.data?.plan?.plan_code) {
    await handleSubscriptionCharge(event.data);
  } else if (event.event === "charge.success" && event.data?.reference) {
    await confirmPaidOrder(event.data.reference, event.data.amount);
  }

  if (event.event === "subscription.create" && event.data) {
    await handleSubscriptionCreated(event.data);
  }

  if (
    (event.event === "invoice.payment_failed" || event.event === "subscription.disable") &&
    event.data
  ) {
    await handleSubscriptionLapsed(event.data);
  }

  // Every other event is acknowledged without action — nothing else needs a
  // reaction, and a non-2xx here just earns a Paystack retry.
  return NextResponse.json({ received: true });
}
