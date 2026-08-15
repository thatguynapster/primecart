"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMerchant } from "@/lib/merchant/current";
import { prisma } from "@/lib/prisma";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/products/limits";
import { getProduct } from "@/lib/products/queries";
import {
  ImageUploadError,
  deleteImage,
  uploadProductImage,
  validateImageFile,
} from "@/lib/r2";
import {
  addVariant,
  buildVariant,
  removeImageFromAllVariants,
  setVariantActive,
  setVariantImages,
  setVariantStock,
  updateVariant,
} from "@/lib/products/variants";

/** Files from a multi-file input, ignoring the empty entry an unused input sends. */
function imageFilesFrom(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

/**
 * Product and variant mutations.
 *
 * Every action re-derives the merchant from the Clerk session. A productId from
 * the client is only ever used together with that merchantId, so a guessed id
 * belonging to another merchant matches nothing (task 3.12).
 */

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /**
   * Set on a successful upload. The initial state and a success are otherwise
   * both "no errors", so a changing value is what lets the form tell them
   * apart and clear the file picker.
   */
  uploadedAt?: number;
};

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

type ParsedVariant = {
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  lowStockThreshold: number;
  attributes: Record<string, string>;
};

function parseVariantFields(
  formData: FormData,
  fieldErrors: Record<string, string>
): ParsedVariant | null {
  const name = String(formData.get("variantName") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const stockRaw = String(formData.get("stock") ?? "").trim();
  const thresholdRaw = String(formData.get("lowStockThreshold") ?? "").trim();
  const attributeName = String(formData.get("attributeName") ?? "").trim();
  const attributeValue = String(formData.get("attributeValue") ?? "").trim();

  if (!name) fieldErrors.variantName = "Name this option, e.g. Black or Large.";

  const price = Number(priceRaw);
  if (!priceRaw) {
    fieldErrors.price = "Enter a price.";
  } else if (!Number.isFinite(price) || price < 0) {
    fieldErrors.price = "Enter a price of 0 or more.";
  }

  const stock = stockRaw === "" ? 0 : Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    fieldErrors.stock = "Enter a whole number, 0 or more.";
  }

  const lowStockThreshold =
    thresholdRaw === "" ? DEFAULT_LOW_STOCK_THRESHOLD : Number(thresholdRaw);
  if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
    fieldErrors.lowStockThreshold = "Enter a whole number, 0 or more.";
  }

  if (Object.keys(fieldErrors).length > 0) return null;

  return {
    name,
    sku: sku || null,
    price,
    stock,
    lowStockThreshold,
    attributes:
      attributeName && attributeValue ? { [attributeName]: attributeValue } : {},
  };
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export async function createProduct(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const merchant = await requireMerchant();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Enter a product name.";
  else if (name.length > 140) fieldErrors.name = "Use at most 140 characters.";

  const variant = parseVariantFields(formData, fieldErrors);

  // Photos are checked before anything is written. Uploading needs the product
  // id, so it can only happen after creation — and a rejected file at that
  // point would leave a product behind that the merchant did not get to
  // confirm. Local checks (type, size, count) cost nothing and catch the
  // realistic failures up front.
  const files = imageFilesFrom(formData);
  if (files.length > MAX_IMAGES_PER_PRODUCT) {
    fieldErrors.images = `Up to ${MAX_IMAGES_PER_PRODUCT} photos.`;
  } else {
    for (const file of files) {
      const invalid = validateImageFile(file);
      if (invalid) {
        fieldErrors.images = invalid;
        break;
      }
    }
  }

  if (!variant || Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // A product with no variants has nothing to sell, so the first one is created
  // alongside it. Creating the whole document — embedded array included — works
  // through Prisma Client; only later per-field edits need $runCommandRaw.
  const product = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name,
      description: description || null,
      category: category || null,
      images: [],
      variants: [buildVariant(variant)],
    },
  });

  if (files.length > 0) {
    const urls: string[] = [];
    try {
      for (const file of files) {
        urls.push(
          await uploadProductImage({
            merchantId: merchant.id,
            productId: product.id,
            file,
          })
        );
      }

      await prisma.product.updateMany({
        where: { merchantId: merchant.id, id: product.id },
        data: { images: urls },
      });
    } catch {
      // The product is already saved, so the merchant is sent to it either way
      // rather than losing everything they typed. Anything uploaded before the
      // failure is removed, and they can add photos again from the product page.
      await Promise.all(urls.map(deleteImage));
    }
  }

  revalidatePath("/dashboard/products");
  redirect(`/dashboard/products/${product.id}`);
}

export async function updateProductDetails(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const merchant = await requireMerchant();

  const productId = String(formData.get("productId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!name) return { fieldErrors: { name: "Enter a product name." } };

  // merchantId in the filter is what makes a guessed productId harmless.
  const { count } = await prisma.product.updateMany({
    where: { merchantId: merchant.id, id: productId },
    data: {
      name,
      description: description || null,
      category: category || null,
    },
  });

  if (count === 0) return { error: "That product no longer exists." };

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products");
  return {};
}

export async function setProductArchived(
  productId: string,
  archived: boolean
): Promise<void> {
  const merchant = await requireMerchant();

  await prisma.product.updateMany({
    where: { merchantId: merchant.id, id: productId },
    data: { isActive: !archived },
  });

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products");
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export async function uploadProductImages(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const merchant = await requireMerchant();
  const productId = String(formData.get("productId") ?? "");

  const product = await getProduct(merchant.id, productId);
  if (!product) return { error: "That product no longer exists." };

  const files = imageFilesFrom(formData);

  if (files.length === 0) return { error: "Choose an image first." };
  if (product.images.length + files.length > MAX_IMAGES_PER_PRODUCT) {
    return {
      error: `A product can have up to ${MAX_IMAGES_PER_PRODUCT} photos.`,
    };
  }

  const urls: string[] = [];
  try {
    for (const file of files) {
      urls.push(
        await uploadProductImage({ merchantId: merchant.id, productId, file })
      );
    }
  } catch (error) {
    // Roll back anything already uploaded, so a partial failure does not leave
    // objects in the bucket that no product references.
    await Promise.all(urls.map(deleteImage));

    if (error instanceof ImageUploadError) return { error: error.message };
    return { error: "Could not upload that image. Try again." };
  }

  const { count } = await prisma.product.updateMany({
    where: { merchantId: merchant.id, id: productId },
    data: { images: { push: urls } },
  });

  if (count === 0) {
    await Promise.all(urls.map(deleteImage));
    return { error: "That product no longer exists." };
  }

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products");

  // The photos are now on the product above; the picker clears itself off this.
  return { uploadedAt: Date.now() };
}

export async function removeProductImage(
  productId: string,
  url: string
): Promise<void> {
  const merchant = await requireMerchant();

  const product = await getProduct(merchant.id, productId);
  if (!product) return;

  // Rewriting the whole array rather than $pull keeps this on the typed client;
  // images is a plain String[], not an embedded composite.
  await prisma.product.updateMany({
    where: { merchantId: merchant.id, id: productId },
    data: { images: product.images.filter((image) => image !== url) },
  });

  // Variants reference photos by URL, so any that pointed at this one would be
  // left showing a broken image on the storefront.
  await removeImageFromAllVariants(merchant.id, productId, url);

  await deleteImage(url);

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products");
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export async function createVariant(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const merchant = await requireMerchant();
  const productId = String(formData.get("productId") ?? "");

  const fieldErrors: Record<string, string> = {};
  const variant = parseVariantFields(formData, fieldErrors);

  if (!variant || Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // Confirm ownership before a raw write. runEmbeddedUpdate also scopes on
  // merchantId, but failing here gives the merchant a clearer message.
  const product = await getProduct(merchant.id, productId);
  if (!product) return { error: "That product no longer exists." };

  await addVariant(merchant.id, productId, variant);

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products");
  return {};
}

export async function editVariant(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const merchant = await requireMerchant();
  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "");

  const fieldErrors: Record<string, string> = {};
  const variant = parseVariantFields(formData, fieldErrors);

  if (!variant || Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // Photo references are validated against the product's own images, so a
  // tampered form cannot point a variant at an arbitrary URL.
  const product = await getProduct(merchant.id, productId);
  if (!product) return { error: "That product no longer exists." };

  const selectedImages = formData
    .getAll("imageUrls")
    .map((value) => String(value))
    .filter((url) => product.images.includes(url));

  try {
    await updateVariant(merchant.id, productId, variantId, {
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      lowStockThreshold: variant.lowStockThreshold,
      attributes: variant.attributes,
    });

    await setVariantImages(merchant.id, productId, variantId, selectedImages);

    // Stock is edited separately so an accidental save on this form cannot
    // silently reset a count the merchant did not touch.
    await setVariantStock(merchant.id, productId, variantId, variant.stock);
  } catch {
    return { error: "That option no longer exists." };
  }

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products");
  return {};
}

/** Recount: sets stock to an absolute figure. */
export async function adjustStock(
  productId: string,
  variantId: string,
  stock: number
): Promise<void> {
  const merchant = await requireMerchant();

  await setVariantStock(merchant.id, productId, variantId, stock);

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products");
}

export async function setVariantArchived(
  productId: string,
  variantId: string,
  archived: boolean
): Promise<void> {
  const merchant = await requireMerchant();

  await setVariantActive(merchant.id, productId, variantId, !archived);

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products");
}
