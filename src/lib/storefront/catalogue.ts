import type { Product, ProductVariant } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { variantImages } from "@/lib/products/variants";

/**
 * The public catalogue.
 *
 * Distinct from the dashboard's product queries in one important way: archived
 * products and archived options must never appear, and neither must anything
 * belonging to another merchant. A shopper is anonymous, so `merchantId` comes
 * from the subdomain the proxy resolved — never from anything they can set.
 */

/** A variant a shopper may actually buy. */
export function sellableVariants(product: Product): ProductVariant[] {
  return product.variants.filter((variant) => variant.isActive);
}

/** Lowest and highest price across sellable options. */
export function priceRange(product: Product): { min: number; max: number } | null {
  const prices = sellableVariants(product).map((variant) => variant.price);
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function totalStock(product: Product): number {
  return sellableVariants(product).reduce(
    (sum, variant) => sum + variant.stock,
    0
  );
}

/**
 * The photos to show for a given option.
 *
 * An option that has picked none falls back to the product's full set — which
 * is the right behaviour when options are sizes rather than colours, and the
 * same rule the dashboard preview uses.
 */
export function imagesForVariant(
  product: Product,
  variant: ProductVariant | undefined
): string[] {
  if (!variant) return product.images;
  const picked = variantImages(variant).filter((url) =>
    product.images.includes(url)
  );
  return picked.length > 0 ? picked : product.images;
}

/** Products on sale, newest first. Archived products are excluded outright. */
export async function listStorefrontProducts(
  merchantId: string,
  options: { search?: string; category?: string; limit?: number } = {}
): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: {
      merchantId,
      isActive: true,
      ...(options.category ? { category: options.category } : {}),
      ...(options.search
        ? { name: { contains: options.search, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    // Headroom for the sellable-variant filter below, so a limited fetch
    // doesn't come up short just because a few of the newest products
    // happen to be sold out everywhere.
    ...(options.limit ? { take: options.limit * 2 } : {}),
  });

  // A product whose options are all archived has nothing to sell, so it would
  // be a dead end for the shopper.
  const sellable = products.filter(
    (product) => sellableVariants(product).length > 0
  );

  return options.limit ? sellable.slice(0, options.limit) : sellable;
}

export async function getStorefrontProduct(
  merchantId: string,
  productId: string
): Promise<Product | null> {
  const product = await prisma.product.findFirst({
    where: { merchantId, id: productId, isActive: true },
  });

  if (!product || sellableVariants(product).length === 0) return null;
  return product;
}

export async function listStorefrontCategories(
  merchantId: string
): Promise<string[]> {
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

/** The "Featured Collection" section — merchant-curated via Product.isFeatured. */
export async function listFeaturedProducts(
  merchantId: string,
  limit = 8
): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { merchantId, isActive: true, isFeatured: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return products.filter((product) => sellableVariants(product).length > 0);
}

export type CategoryTile = { name: string; imageUrl: string | null };

/**
 * "Shop by Category" tile images (14.1, decided 2026-08-19): auto-derived
 * from each category's newest product photo — no category-image field exists
 * on the schema, and a merchant-assigned image is deferred to a later
 * version. `null` when the category's products happen to have no photos yet;
 * the tile still renders, just without an image.
 */
export async function listCategoryTiles(merchantId: string): Promise<CategoryTile[]> {
  const products = await prisma.product.findMany({
    where: { merchantId, isActive: true, category: { not: null } },
    select: { category: true, images: true },
    orderBy: { createdAt: "desc" },
  });

  const imageByCategory = new Map<string, string | null>();
  for (const product of products) {
    if (!product.category || imageByCategory.has(product.category)) continue;
    imageByCategory.set(product.category, product.images[0] ?? null);
  }

  return [...imageByCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, imageUrl]) => ({ name, imageUrl }));
}
