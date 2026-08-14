import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { oid, runEmbeddedUpdate } from "@/lib/db/embedded";

/**
 * Variant writes.
 *
 * Variants are embedded in Product, so Prisma Client cannot update individual
 * fields inside them — verified: `variants: { update: ... }` is rejected. Every
 * write here goes through runEmbeddedUpdate, which scopes on merchantId and
 * throws when the filter matches nothing (a raw update that matches no document
 * returns ok:1 and looks like success).
 *
 * Positional `$[v]` array filters target one variant by id rather than `$`,
 * which only ever matches the first array element that satisfied the query.
 */

export type VariantInput = {
  name: string;
  sku?: string | null;
  price: number;
  stock: number;
  lowStockThreshold: number;
  attributes: Record<string, string>;
};

/**
 * Ids are generated here rather than relying on the schema's `@default(cuid())`.
 * Defaults are applied by Prisma Client, and variants pushed through
 * $runCommandRaw bypass it entirely — so generating them in one place keeps the
 * format consistent however the variant was created.
 */
export function newVariantId(): string {
  return randomUUID();
}

/** Builds a complete variant document, applying the same defaults as the schema. */
export function buildVariant(input: VariantInput) {
  return {
    id: newVariantId(),
    name: input.name,
    sku: input.sku?.trim() || null,
    price: input.price,
    stock: input.stock,
    lowStockThreshold: input.lowStockThreshold,
    attributes: input.attributes,
    isActive: true,
    // Always written, so no variant created by this app can hit the null case
    // that `variantImages` guards against.
    imageUrls: [],
  };
}

/**
 * A variant's photo references, tolerating documents written before the field
 * existed.
 *
 * Prisma types `imageUrls` as `string[]`, but a document missing the field
 * reads back as `null` — verified against MongoDB. The type is therefore a lie
 * for any such document, and `.map`/`.length` on it would throw. Read through
 * here rather than touching the property directly.
 */
export function variantImages(variant: {
  imageUrls?: string[] | null;
}): string[] {
  return variant.imageUrls ?? [];
}

export async function addVariant(
  merchantId: string,
  productId: string,
  input: VariantInput
): Promise<string> {
  const variant = buildVariant(input);

  await runEmbeddedUpdate({
    collection: "Product",
    merchantId,
    filter: { _id: oid(productId) },
    update: { $push: { variants: variant } },
  });

  return variant.id;
}

export async function updateVariant(
  merchantId: string,
  productId: string,
  variantId: string,
  fields: Partial<Omit<VariantInput, "stock">>
): Promise<void> {
  // Built mutably, then handed over as an InputJsonObject — that type's index
  // signature is read-only, so it cannot be assembled in place.
  const set: Record<string, Prisma.InputJsonValue | null> = {};

  if (fields.name !== undefined) set["variants.$[v].name"] = fields.name;
  if (fields.sku !== undefined) {
    set["variants.$[v].sku"] = fields.sku?.trim() || null;
  }
  if (fields.price !== undefined) set["variants.$[v].price"] = fields.price;
  if (fields.lowStockThreshold !== undefined) {
    set["variants.$[v].lowStockThreshold"] = fields.lowStockThreshold;
  }
  if (fields.attributes !== undefined) {
    set["variants.$[v].attributes"] = fields.attributes;
  }

  if (Object.keys(set).length === 0) return;

  await runEmbeddedUpdate({
    collection: "Product",
    merchantId,
    filter: { _id: oid(productId), "variants.id": variantId },
    update: { $set: set },
    arrayFilters: [{ "v.id": variantId }],
  });
}

/**
 * Sets stock to an absolute figure — the merchant recounting a shelf.
 *
 * Distinct from the reservation logic in Phase 9, which uses $inc so that
 * concurrent orders cannot overwrite each other's arithmetic.
 */
export async function setVariantStock(
  merchantId: string,
  productId: string,
  variantId: string,
  stock: number
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Product",
    merchantId,
    filter: { _id: oid(productId), "variants.id": variantId },
    update: { $set: { "variants.$[v].stock": Math.max(0, stock) } },
    arrayFilters: [{ "v.id": variantId }],
  });
}

/**
 * Sets which of the product's photos belong to this option.
 *
 * These are references, not uploads — callers must pass URLs that already
 * exist in the parent product's `images`.
 */
export async function setVariantImages(
  merchantId: string,
  productId: string,
  variantId: string,
  imageUrls: string[]
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Product",
    merchantId,
    filter: { _id: oid(productId), "variants.id": variantId },
    update: { $set: { "variants.$[v].imageUrls": imageUrls } },
    arrayFilters: [{ "v.id": variantId }],
  });
}

/**
 * Drops a photo reference from every variant of a product.
 *
 * Called when the photo itself is deleted — otherwise variants keep pointing
 * at an image that no longer exists, and the storefront renders a broken one.
 * `$[]` touches every element, so this is one write regardless of variant count.
 */
export async function removeImageFromAllVariants(
  merchantId: string,
  productId: string,
  imageUrl: string
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Product",
    merchantId,
    filter: { _id: oid(productId) },
    update: { $pull: { "variants.$[].imageUrls": imageUrl } },
    // A product with no variants referencing it is a legitimate no-op.
    requireMatch: false,
  });
}

/**
 * Archives a variant. Never deleted: historical order line items reference it
 * by id, and order history must stay readable.
 */
export async function setVariantActive(
  merchantId: string,
  productId: string,
  variantId: string,
  isActive: boolean
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Product",
    merchantId,
    filter: { _id: oid(productId), "variants.id": variantId },
    update: { $set: { "variants.$[v].isActive": isActive } },
    arrayFilters: [{ "v.id": variantId }],
  });
}
