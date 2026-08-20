import type { Prisma, Product } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Product reads.
 *
 * Every function takes merchantId as its first argument and applies it as the
 * first filter condition. merchantId always comes from the Clerk session via
 * requireMerchant — never from a route param or form field, or one merchant
 * could read another's catalogue by guessing an id.
 */

export type ProductFilters = {
  /** Omit to include archived products. */
  activeOnly?: boolean;
  category?: string;
  /** Case-insensitive match on product name. */
  search?: string;
};

export async function listProducts(
  merchantId: string,
  filters: ProductFilters = {}
): Promise<Product[]> {
  const where: Prisma.ProductWhereInput = { merchantId };

  if (filters.activeOnly) where.isActive = true;
  if (filters.category) where.category = filters.category;
  if (filters.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  return prisma.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

/** A single product, or null if it does not belong to this merchant. */
export async function getProduct(
  merchantId: string,
  productId: string
): Promise<Product | null> {
  return prisma.product.findFirst({
    where: { merchantId, id: productId },
  });
}

/** Distinct categories in use, for the filter control. */
export async function listCategories(merchantId: string): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { merchantId, isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return rows
    .map((row) => row.category)
    .filter((category): category is string => Boolean(category));
}

// ---------------------------------------------------------------------------
// Low stock
// ---------------------------------------------------------------------------

export type LowStockVariant = {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
};

type LowStockRaw = {
  cursor?: {
    firstBatch?: Array<{
      _id: { $oid: string };
      productName: string;
      variantId: string;
      variantName: string;
      sku: string | null;
      stock: number;
      lowStockThreshold: number;
    }>;
  };
};

/**
 * Active variants at or below their own low-stock threshold.
 *
 * Done as an aggregation rather than by loading every product and filtering in
 * JavaScript: the threshold is per-variant, so the comparison is between two
 * fields of the same document ($expr), which Prisma Client cannot express.
 */
export async function listLowStockVariants(
  merchantId: string
): Promise<LowStockVariant[]> {
  const result = (await prisma.$runCommandRaw({
    aggregate: "Product",
    pipeline: [
      // merchantId first, and only live products.
      { $match: { merchantId: { $oid: merchantId }, isActive: true } },
      { $unwind: "$variants" },
      {
        $match: {
          "variants.isActive": true,
          $expr: { $lte: ["$variants.stock", "$variants.lowStockThreshold"] },
        },
      },
      {
        $project: {
          productName: "$name",
          variantId: "$variants.id",
          variantName: "$variants.name",
          sku: "$variants.sku",
          stock: "$variants.stock",
          lowStockThreshold: "$variants.lowStockThreshold",
        },
      },
      { $sort: { stock: 1, productName: 1 } },
    ],
    cursor: {},
  })) as LowStockRaw;

  const batch = result.cursor?.firstBatch ?? [];

  return batch.map((row) => ({
    productId: row._id.$oid,
    productName: row.productName,
    variantId: row.variantId,
    variantName: row.variantName,
    sku: row.sku ?? null,
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
  }));
}

/** Whether a variant is at or below its threshold. Used for row badges. */
export function isLowStock(variant: {
  stock: number;
  lowStockThreshold: number;
}): boolean {
  return variant.stock <= variant.lowStockThreshold;
}
