import { PAYMENT_REMINDER_MINUTES } from "@/lib/billing/plans";
import { getStorefrontOrigin } from "@/lib/domain";
import { notifyPaymentReminder } from "@/lib/notifications/events";
import { prisma } from "@/lib/prisma";

/**
 * T10 — one payment reminder per unpaid checkout-on order, ~30 minutes after
 * it was placed, while its 24-hour stock hold is still running.
 *
 * Runs inside the 5-minute expiry cron, after expiry. Like the expiry sweep,
 * this is a system job with no request-scoped tenant, so it isn't
 * merchantId-first by design.
 *
 * Claim-then-send: `reminderSentAt` is set by an updateMany that only matches
 * while it's still null, so two overlapping cron runs can't both send. A
 * failed send is not retried. The buyer can still pay from the order page,
 * and the merchant has a WhatsApp payment-link button.
 */
const BATCH = 100;

export async function sendPaymentReminders(): Promise<{ reminded: number }> {
  const now = new Date();
  const placedBefore = new Date(now.getTime() - PAYMENT_REMINDER_MINUTES * 60 * 1000);

  const due = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: "UNPAID",
      reservedUntil: { gt: now },
      stockReserved: true,
      paymentMethod: "PAYSTACK",
      reminderSentAt: null,
      createdAt: { lt: placedBefore },
    },
    include: { customer: true },
    take: BATCH,
  });

  let reminded = 0;

  for (const order of due) {
    const claimed = await prisma.order.updateMany({
      where: { id: order.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) continue;

    const email = order.customer?.email;
    if (!email || !order.reservedUntil) continue;

    const merchant = await prisma.merchant.findUnique({
      where: { id: order.merchantId },
      select: { storefront: true },
    });
    const storefront = merchant?.storefront;
    if (!storefront) continue;

    await notifyPaymentReminder({
      buyerEmail: email,
      storeName: storefront.businessName,
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderUrl: `${getStorefrontOrigin(storefront.subdomain)}/orders/${order.id}`,
      total: order.total,
      reservedUntil: order.reservedUntil,
    });
    reminded += 1;
  }

  return { reminded };
}
