"use client";

import Link from "next/link";

import { cartCount, useCartStore } from "@/lib/storefront/cart";
import { useIsClient } from "@/lib/use-is-client";

/**
 * Cart link with a live count.
 *
 * The count lives in localStorage, which the server cannot know, so the badge
 * is withheld until after mount. Rendering it immediately would mean the
 * server sends "0" and the client swaps in "3" — a hydration mismatch, and a
 * visible flicker on every page load.
 */
export function CartButton({ subdomain }: { subdomain: string }) {
  const useStore = useCartStore(subdomain);
  const lines = useStore((state) => state.lines);
  const isClient = useIsClient();

  const count = isClient ? cartCount(lines) : 0;

  return (
    <Link
      href="/cart"
      className="relative flex shrink-0 items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-[13.5px] font-medium transition-colors hover:border-neutral-500"
    >
      Cart
      {count > 0 && (
        <span
          className="grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold"
          style={{ background: "var(--brand)", color: "var(--on-brand)" }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
