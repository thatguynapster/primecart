"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product, ProductVariant } from "@prisma/client";

import { formatGhs } from "@/lib/format";
import { imagesForVariant } from "@/lib/storefront/catalogue";
import { useCartStore } from "@/lib/storefront/cart";

/**
 * Option picker, gallery and add-to-cart.
 *
 * The gallery follows the selected option (DEV-5): picking Red shows the red
 * photos. An option that has picked none falls back to the product's full set,
 * which is what you want when the options are sizes.
 */
export function ProductBuy({
  subdomain,
  product,
  variants,
}: {
  subdomain: string;
  product: Product;
  variants: ProductVariant[];
}) {
  const useStore = useCartStore(subdomain);
  const add = useStore((state) => state.add);
  const inCart = useStore((state) => state.lines);

  // Open on something buyable rather than a sold-out option.
  const [variantId, setVariantId] = useState(
    () => (variants.find((v) => v.stock > 0) ?? variants[0]).id
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const gallery = useMemo(
    () => imagesForVariant(product, variant),
    [product, variant]
  );

  const alreadyInCart =
    inCart.find((line) => line.variantId === variant.id)?.quantity ?? 0;
  // Never let the cart promise more than the shop has.
  const remaining = Math.max(0, variant.stock - alreadyInCart);
  const soldOut = variant.stock === 0;

  const image = gallery[Math.min(imageIndex, gallery.length - 1)];

  function selectVariant(next: ProductVariant) {
    setVariantId(next.id);
    setImageIndex(0);
    setQuantity(1);
    setAdded(false);
  }

  function addToCart() {
    add(
      {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name,
        price: variant.price,
        imageUrl: gallery[0] ?? null,
      },
      Math.min(quantity, remaining)
    );
    setAdded(true);
  }

  return (
    <div className="grid gap-8 sm:gap-10 lg:grid-cols-2">
      {/* gallery */}
      <div>
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
          {image ? (
            <Image
              key={image}
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 480px"
              className="object-cover"
              priority
            />
          ) : (
            <span className="grid h-full place-items-center text-[13px] text-neutral-400">
              No photo
            </span>
          )}
        </div>

        {gallery.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {gallery.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => setImageIndex(index)}
                aria-label={`Photo ${index + 1}`}
                className={
                  index === imageIndex
                    ? "relative aspect-square overflow-hidden rounded-lg ring-2 ring-neutral-900"
                    : "relative aspect-square overflow-hidden rounded-lg opacity-60 ring-1 ring-neutral-200 transition-opacity hover:opacity-100"
                }
              >
                <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* buy */}
      <div>
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
          {product.name}
        </h1>

        <p className="mt-3 text-xl font-semibold">{formatGhs(variant.price)}</p>

        {product.description && (
          <p className="mt-5 text-[14.5px] leading-relaxed text-neutral-600">
            {product.description}
          </p>
        )}

        {variants.length > 1 && (
          <div className="mt-7">
            <p className="text-[13px] font-medium text-neutral-500">Options</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {variants.map((option) => {
                const selected = option.id === variant.id;
                const optionSoldOut = option.stock === 0;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectVariant(option)}
                    className={
                      selected
                        ? "rounded-xl border-2 px-4 py-2 text-[13.5px] font-medium"
                        : "rounded-xl border border-neutral-300 px-4 py-2 text-[13.5px] transition-colors hover:border-neutral-500"
                    }
                    style={selected ? { borderColor: "var(--brand)" } : undefined}
                  >
                    {option.name}
                    {optionSoldOut && (
                      <span className="ml-1.5 text-[11px] text-neutral-400">
                        sold out
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-7">
          {soldOut ? (
            <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[14px] text-neutral-600">
              This option is sold out.
            </p>
          ) : remaining === 0 ? (
            <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[14px] text-neutral-600">
              You already have all {variant.stock} of these in your cart.
            </p>
          ) : (
            <>
              {variant.stock <= variant.lowStockThreshold && (
                <p className="mb-3 text-[13px] text-neutral-500">
                  Only {variant.stock} left.
                </p>
              )}

              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-neutral-300">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Less"
                    className="px-3.5 py-2.5 text-[15px] disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center font-mono text-[14px] tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
                    aria-label="More"
                    className="px-3.5 py-2.5 text-[15px] disabled:opacity-40"
                    disabled={quantity >= remaining}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={addToCart}
                  className="flex-1 rounded-xl px-6 py-3 text-[14px] font-medium"
                  style={{
                    background: "var(--brand)",
                    color: "var(--on-brand)",
                  }}
                >
                  Add to cart
                </button>
              </div>
            </>
          )}
        </div>

        {added && (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-[13.5px] text-neutral-600">
            Added to your cart.
            <Link href="/cart" className="font-medium underline underline-offset-4">
              View cart
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
