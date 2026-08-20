import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductBuy } from "@/components/store/product-buy";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import {
  getStorefrontProduct,
  sellableVariants,
} from "@/lib/storefront/catalogue";

export async function generateMetadata({
  params,
}: PageProps<"/store/[subdomain]/products/[productId]">) {
  const { subdomain, productId } = await params;
  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant) return {};

  const product = await getStorefrontProduct(merchant.id, productId);
  if (!product) return {};

  return {
    title: `${product.name} — ${merchant.businessName}`,
    description: product.description ?? undefined,
    openGraph: product.images[0] ? { images: [product.images[0]] } : undefined,
  };
}

export default async function StorefrontProductPage({
  params,
}: PageProps<"/store/[subdomain]/products/[productId]">) {
  const { subdomain, productId } = await params;

  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant || !merchant.isActive) notFound();

  // Scoped to this merchant, so a product id from another shop is simply not
  // found rather than rendering someone else's catalogue.
  const product = await getStorefrontProduct(merchant.id, productId);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/products"
        className="text-[13.5px] text-neutral-500 hover:text-neutral-900"
      >
        ← All products
      </Link>

      <div className="mt-6">
        <ProductBuy
          subdomain={subdomain}
          product={product}
          variants={sellableVariants(product)}
        />
      </div>
    </div>
  );
}
