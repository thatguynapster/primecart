import { prisma } from "@/lib/prisma";
import { restoreStock } from "@/lib/orders/stock";

/**
 * Releasing an abandoned reservation.
 *
 * Two callers reach this: the 5-minute cron sweep (`expireAbandonedOrders`),
 * and checkout's own failure path when Paystack's initialize call throws —
 * a reservation that never got the chance to time out is the same outcome as
 * one that did.
 */

/**
 * Restores stock and marks one order EXPIRED (DEV-2: distinct from CANCELLED,
 * which is the merchant's own deliberate action).
 *
 * The status flip happens *before* the stock restore, not after, and it is
 * itself the concurrency guard: `updateMany`'s `where: { status: "PENDING" }`
 * means only one caller's flip can ever match. Two overlapping cron runs (a
 * slow run still in flight when the next one fires) racing on the same order
 * would otherwise both pass a naive "is it still PENDING" read and both
 * restore the same stock. Whichever call's flip matches zero documents has
 * lost the race and returns immediately, touching no stock.
 */
export async function expireOrder(orderId: string): Promise<void> {
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "EXPIRED", reservedUntil: null },
  });
  if (claimed.count === 0) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  for (const item of order.lineItems) {
    try {
      await restoreStock(order.merchantId, [
        {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      ]);
    } catch (error) {
      // One line failing to restore must not stop the rest of this order, or
      // the other orders in the same sweep, from being processed. Logged for
      // an operator to reconcile by hand — the order is already EXPIRED
      // regardless, so it will not be picked up again by the next sweep.
      console.error(
        `Failed to restore stock for order ${order.id}, ` +
          `${item.productId}/${item.variantId}:`,
        error
      );
    }
  }
}

/**
 * The 5-minute cron sweep: every reservation whose 30-minute window has
 * passed without payment. Deliberately not scoped to one merchant — this is
 * a system job with no request-scoped tenant, the one place in the codebase
 * where a query is not merchantId-first by design (see the Order index this
 * relies on: `[status, paymentStatus, reservedUntil]`, added for exactly
 * this query in Phase 2).
 */
export async function expireAbandonedOrders(): Promise<{ expired: number }> {
  const abandoned = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: "UNPAID",
      reservedUntil: { lt: new Date() },
    },
  });

  for (const order of abandoned) {
    await expireOrder(order.id);
  }

  return { expired: abandoned.length };
}
