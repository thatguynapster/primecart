"use client";

import { ShoppingCartSimple } from "@phosphor-icons/react/dist/ssr";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CartView } from "@/components/store/cart-view";
import { brandStyle } from "@/lib/storefront/brand";
import { cartCount, useCartStore } from "@/lib/storefront/cart";
import { useIsClient } from "@/lib/use-is-client";

/**
 * Cart as a slideover (14.17) rather than a dedicated `/cart` page — closing
 * it returns the shopper to exactly the page/scroll position they were at,
 * which navigating to a separate route can't do. The trigger is icon-only
 * with a live count, matching the reference's icon-first header.
 *
 * `primaryColor` is re-applied here rather than inherited: `SheetContent` is
 * portaled to `document.body` (outside the layout's `--brand`/`--on-brand`
 * wrapper), so without this the "Pay" button and every other brand-coloured
 * element inside the sheet silently loses its background — the CSS variables
 * simply don't exist in that part of the DOM tree.
 */
export function CartSheet({
  subdomain,
  primaryColor,
}: {
  subdomain: string;
  primaryColor: string;
}) {
  const useStore = useCartStore(subdomain);
  const lines = useStore((state) => state.lines);
  const isOpen = useStore((state) => state.isOpen);
  const setCartOpen = useStore((state) => state.setCartOpen);
  const isClient = useIsClient();

  // Withheld until mount — the count lives in localStorage, which the server
  // can't see, so rendering it immediately would mean a hydration mismatch.
  const count = isClient ? cartCount(lines) : 0;

  return (
    <Sheet open={isOpen} onOpenChange={setCartOpen}>
      <SheetTrigger
        aria-label="Open cart"
        className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 transition-colors hover:border-neutral-500"
      >
        <ShoppingCartSimple size={18} />
        {count > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 grid min-w-4.5 place-items-center rounded-full px-1 text-[10.5px] font-semibold"
            style={{ background: "var(--brand)", color: "var(--on-brand)" }}
          >
            {count}
          </span>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md"
        style={brandStyle(primaryColor)}
      >
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          <CartView subdomain={subdomain} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
