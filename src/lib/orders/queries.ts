import type { Customer, Order } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Order reads outside the reporting aggregations in dashboard/queries.ts.
 *
 * merchantId always comes from the Clerk session via requireMerchant, and is
 * always the first filter condition — an order id from the client is only
 * ever used together with it, so a guessed id belonging to another merchant
 * matches nothing.
 */

export type OrderWithCustomer = Order & { customer: Customer | null };

export async function getOrder(
  merchantId: string,
  orderId: string
): Promise<OrderWithCustomer | null> {
  return prisma.order.findFirst({
    where: { merchantId, id: orderId },
    include: { customer: true },
  });
}
