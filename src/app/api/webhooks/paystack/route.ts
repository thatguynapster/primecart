import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { Order } from "@prisma/client";

import { notifyNeedsReview, notifyNewOrder } from "@/lib/notifications/events";
import { OversellError, reserveStock, restoreStock } from "@/lib/orders/stock";
import { prisma } from "@/lib/prisma";

/**
 * Paystack webhook — confirms storefront payments.
 *
 * Signature: Paystack sends `x-paystack-signature`, an HMAC-SHA512 of the raw
 * request body keyed with PAYSTACK_SECRET_KEY, hex-encoded. Verification must
 * run against the exact bytes received — `request.text()`, not the parsed
 * JSON, which could re-serialize differently and silently break every check.
 *
 * Never trust the redirect callback alone; this is the only place an order is
 * actually marked paid.
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
    amount?: number;
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
async function confirmPaidOrder(reference: string, amountPesewas?: number) {
  const order = await prisma.order.findFirst({ where: { paymentRef: reference } });
  if (!order) {
    console.error(`Paystack webhook: no order for reference ${reference}`);
    return;
  }
  if (order.paymentStatus !== "UNPAID") return; // already settled, by any path

  if (amountPesewas !== undefined) {
    const expected = Math.round(order.total * 100);
    if (expected !== amountPesewas) {
      // Flag for a human rather than confirm a payment for the wrong amount.
      console.error(
        `Paystack webhook: amount mismatch for order ${order.id}. ` +
          `Expected ${expected}, got ${amountPesewas}.`
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

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is not set — webhook cannot be verified.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-paystack-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    await confirmPaidOrder(event.data.reference, event.data.amount);
  }

  // Every other event is acknowledged without action — nothing else in Phase
  // 9 needs a reaction, and a non-2xx here just earns a Paystack retry.
  return NextResponse.json({ received: true });
}
