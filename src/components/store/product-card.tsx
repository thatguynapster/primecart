import Image from "next/image";
import Link from "next/link";
import type { Product } from "@prisma/client";

import { formatGhs } from "@/lib/format";
import {
  priceRange,
  sellableVariants,
  totalStock,
} from "@/lib/storefront/catalogue";
import { AddToCartIconButton } from "@/components/store/add-to-cart-icon-button";

/**
 * The one product-card component every storefront grid shares (Best Sellers,
 * Featured Collection, New Arrivals, category/search results) — per the
 * reference doc, this single component determines most of the page's visual
 * identity. Badge pill and wishlist icon are excluded per the owner's
 * 2026-08-17 decision; the add-to-cart icon is kept (corrected 2026-08-19).
 *
 * The add-to-cart button is a sibling of the card's Link, not a descendant —
 * nesting a `<button>` inside an `<a>` is invalid HTML, and in practice the
 * click still bubbled into the Link's own navigation regardless of
 * preventDefault/stopPropagation on the inner element. A shared `relative`
 * wrapper keeps the two visually overlapping without nesting them.
 */
export function ProductCard({
  subdomain,
  product,
}: {
  subdomain: string;
  product: Product;
}) {
  const range = priceRange(product);
  const soldOut = totalStock(product) === 0;
  const firstInStock = sellableVariants(product).find(
    (variant) => variant.stock > 0
  );

  return (
    <div className="group">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
        <Link href={`/products/${product.id}`} className="absolute inset-0">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="grid h-full place-items-center text-[13px] text-neutral-400">
              No photo
            </span>
          )}
        </Link>

        {soldOut && (
          <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-neutral-900/85 px-2.5 py-1 text-[11px] font-medium text-white">
            Sold out
          </span>
        )}

        {firstInStock && (
          <AddToCartIconButton
            subdomain={subdomain}
            productId={product.id}
            variantId={firstInStock.id}
            productName={product.name}
            variantName={firstInStock.name}
            price={firstInStock.price}
            imageUrl={product.images[0] ?? null}
          />
        )}
      </div>

      <Link href={`/products/${product.id}`} className="block">
        {product.category && (
          <p className="mt-3 text-[11.5px] font-medium tracking-wide text-neutral-500 uppercase">
            {product.category}
          </p>
        )}
        <p className="mt-0.5 text-[14px] leading-snug font-medium">
          {product.name}
        </p>
        {range && (
          <p className="mt-0.5 text-[13.5px] text-neutral-600">
            {range.min === range.max
              ? formatGhs(range.min)
              : `${formatGhs(range.min)} – ${formatGhs(range.max)}`}
          </p>
        )}
      </Link>
    </div>
  );
}
