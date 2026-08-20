"use client";

import { useState } from "react";
import { Check, ShoppingCartSimple } from "@phosphor-icons/react/dist/ssr";

import { useCartStore } from "@/lib/storefront/cart";

/**
 * The reference's product-card icon (14.5/spec §5) — corrected 2026-08-19
 * from an earlier "wishlist" misreading; it's a quick add-to-cart, not a
 * saved-items feature. Adds the product's first in-stock option directly
 * from the grid, no variant picker — the same simplification the reference
 * card itself makes.
 */
export function AddToCartIconButton({
  subdomain,
  productId,
  variantId,
  productName,
  variantName,
  price,
  imageUrl,
}: {
  subdomain: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  price: number;
  imageUrl: string | null;
}) {
  const add = useCartStore(subdomain)((state) => state.add);
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      aria-label={`Add ${productName} to cart`}
      onClick={() => {
        add(
          { productId, variantId, productName, variantName, price, imageUrl },
          1
        );
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-full bg-white text-neutral-900 shadow-md ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-95"
    >
      {added ? (
        <Check size={15} weight="bold" style={{ color: "var(--brand)" }} />
      ) : (
        <ShoppingCartSimple size={15} weight="bold" />
      )}
    </button>
  );
}
