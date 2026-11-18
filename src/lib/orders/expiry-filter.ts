import type { Prisma } from "@prisma/client";

/**
 * Lower bound for "has a hold". On MongoDB, Prisma compiles date filters to
 * aggregation comparisons, where `null` sorts below every date — so
 * `reservedUntil: { lt: now }` alone also matches `reservedUntil: null`.
 * Checkout-off and manual orders store exactly that ("never expires", D-18c),
 * and the 5-minute sweep was expiring them (found on dev 2026-11-18). Any
 * real hold is after the epoch; null and a missing field never are.
 */
export const HAS_HOLD = new Date(0);

/**
 * Orders whose payment hold has run out. Dependency-free (type import only)
 * so `npm run test:db` runs this exact filter through Prisma.
 */
export function abandonedOrderWhere(now: Date) {
  return {
    status: "PENDING",
    paymentStatus: "UNPAID",
    reservedUntil: { gt: HAS_HOLD, lt: now },
  } satisfies Prisma.OrderWhereInput;
}
