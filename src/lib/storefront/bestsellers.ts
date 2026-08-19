import type { Product } from "@prisma/client";

import { aggregate, oid } from "@/lib/db/aggregate";
import { prisma } from "@/lib/prisma";
import { sellableVariants } from "@/lib/storefront/catalogue";

/**
 * Storefront "Best Sellers" (14.8) and the footer's best-selling-categories
 * column (14.12) — both derived from paid orders, same technique as the
 * dashboard's own getBestSellers, but grouped by productId rather than a
 * snapshotted productName so the result can link back to a real product.
 *
 * Empty (no paid orders yet) is a legitimate, expected state for a new shop —
 * callers render nothing for the section rather than a placeholder.
 */

type SoldRow = { productId: string; sold: number };

/**
 * Every paid line item, grouped by product, most sold first. Uncapped by
 * design — the footer's category rollup needs the full sales picture, not
 * just the top handful a product grid would show.
 */
async function soldByProduct(merchantId: string): Promise<SoldRow[]> {
  return aggregate<SoldRow>("Order", [
    { $match: { merchantId: oid(merchantId), paymentStatus: "PAID" } },
    { $unwind: "$lineItems" },
    {
      $group: {
        _id: "$lineItems.productId",
        sold: { $sum: "$lineItems.quantity" },
      },
    },
    { $sort: { sold: -1 } },
    { $project: { _id: 0, productId: "$_id", sold: 1 } },
  ]);
}

export async function getStorefrontBestSellers(
  merchantId: string,
  limit = 8
): Promise<Product[]> {
  const rows = await soldByProduct(merchantId);
  if (rows.length === 0) return [];

  const top = rows.slice(0, limit * 2); // headroom for archived/sold-out drops below
  const products = await prisma.product.findMany({
    where: {
      merchantId,
      isActive: true,
      id: { in: top.map((row) => row.productId) },
    },
  });

  const byId = new Map(products.map((product) => [product.id, product]));

  return top
    .map((row) => byId.get(row.productId))
    .filter((product): product is Product => Boolean(product))
    .filter((product) => sellableVariants(product).length > 0)
    .slice(0, limit);
}

export type CategorySales = { name: string; sold: number };

/** Footer "Categories" column (14.12): categories ranked by units sold. */
export async function getBestSellingCategories(
  merchantId: string,
  limit = 6
): Promise<CategorySales[]> {
  const rows = await soldByProduct(merchantId);
  if (rows.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { merchantId, id: { in: rows.map((row) => row.productId) } },
    select: { id: true, category: true },
  });
  const categoryById = new Map(products.map((p) => [p.id, p.category]));

  const soldByCategory = new Map<string, number>();
  for (const row of rows) {
    const category = categoryById.get(row.productId);
    if (!category) continue;
    soldByCategory.set(category, (soldByCategory.get(category) ?? 0) + row.sold);
  }

  return [...soldByCategory.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, sold]) => ({ name, sold }));
}
