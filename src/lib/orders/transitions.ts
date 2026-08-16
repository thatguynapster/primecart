import type { OrderStatus } from "@prisma/client";

/**
 * Legal merchant-driven status moves.
 *
 * The forward chain comes straight from the handover: PENDING → CONFIRMED →
 * PROCESSING → SHIPPED → DELIVERED. CANCELLED is reachable from anywhere
 * before SHIPPED — once an order has shipped there is no cancellation flow at
 * MVP, only the delivered/undelivered outcome.
 *
 * EXPIRED never appears here (task 10.7): it is set only by the expiry cron
 * or the late-payment webhook path, never by a merchant action.
 */
const FORWARD: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

const CANCELLABLE_FROM: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING"];

/** The single next step in the fulfilment chain, or null if there is none. */
export function nextStatus(current: OrderStatus): OrderStatus | null {
  return FORWARD[current] ?? null;
}

export function canCancel(current: OrderStatus): boolean {
  return CANCELLABLE_FROM.includes(current);
}

/** Stock was reserved at order creation and is still held in these states. */
export function holdsReservedStock(current: OrderStatus): boolean {
  return CANCELLABLE_FROM.includes(current);
}
