import type { Customer, Order } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Customer reads outside the reporting aggregations in dashboard/queries.ts.
 *
 * merchantId always comes from the Clerk session via requireMerchant, and is
 * always the first filter condition — a customer id from the client is only
 * ever used together with it, so a guessed id belonging to another merchant
 * matches nothing.
 */

export async function getCustomer(
  merchantId: string,
  customerId: string
): Promise<Customer | null> {
  return prisma.customer.findFirst({
    where: { merchantId, id: customerId },
  });
}

/** A customer's full order history, most recent first. */
export async function getCustomerOrders(
  merchantId: string,
  customerId: string
): Promise<Order[]> {
  return prisma.order.findMany({
    where: { merchantId, customerId },
    orderBy: { createdAt: "desc" },
  });
}
