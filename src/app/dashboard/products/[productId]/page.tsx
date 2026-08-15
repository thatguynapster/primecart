import Link from "next/link";
import { notFound } from "next/navigation";

import { requireMerchant } from "@/lib/merchant/current";
import { getProduct, listCategories } from "@/lib/products/queries";
import { variantImages } from "@/lib/products/variants";
import { isImageUploadConfigured } from "@/lib/r2";
import { ProductEditor } from "./product-editor";
import { ProductImages } from "./product-images";

export default async function ProductDetailPage({
  params,
}: PageProps<"/dashboard/products/[productId]">) {
  const merchant = await requireMerchant();
  const { productId } = await params;

  // Scoped by merchantId, so another merchant's id is indistinguishable from a
  // product that does not exist.
  const product = await getProduct(merchant.id, productId);
  if (!product) notFound();

  const categories = await listCategories(merchant.id);

  // Which options have picked each photo — so removing one can say what it
  // will affect before the object is deleted for good.
  const usage: Record<string, string[]> = {};
  for (const variant of product.variants) {
    for (const url of variantImages(variant)) {
      (usage[url] ??= []).push(variant.name);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/dashboard/products"
        className="text-sm text-nk-neutral-500 hover:text-nk-text"
      >
        ← Products
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-medium tracking-tighter">
          {product.name}
        </h1>
        {!product.isActive && (
          <span className="rounded-full border border-nk-neutral-800 px-2.5 py-1 text-xs font-medium tracking-wide text-nk-neutral-500 uppercase">
            Archived
          </span>
        )}
      </div>

      <div className="mt-8 space-y-8">
        <ProductImages
          productId={product.id}
          images={product.images}
          usage={usage}
          configured={isImageUploadConfigured()}
        />
        <ProductEditor product={product} categories={categories} />
      </div>
    </main>
  );
}
