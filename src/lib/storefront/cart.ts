"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * The shopper's cart.
 *
 * Client state only, as the handover specifies — nothing here is trusted. The
 * server re-reads every product's real price and stock when the order is
 * created (Phase 9), so a tampered cart changes what the shopper sees and
 * nothing else.
 *
 * Persisted per subdomain: one browser may visit several PrimeCart shops, and
 * carts must not bleed between them.
 */

export type CartLine = {
  // DEV-7 (Phase 15), §B.2 — a line is identified by variant *and*
  // customization text, not variant alone. Two rings of the same variant
  // engraved differently must never merge into one line with the wrong
  // name/quantity. Uncustomized, this equals the bare variantId, so a cart
  // with no customized lines behaves exactly as before.
  lineKey: string;
  productId: string;
  variantId: string;
  /** Snapshotted for display only; the server re-reads these at checkout. */
  productName: string;
  variantName: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  /** DEV-7. Free text the shopper entered, e.g. a name to engrave. */
  customization?: string | null;
  /** DEV-7. Display only — the server re-reads the product's real fee. */
  customizationFee?: number | null;
};

/**
 * The same key `add` computes internally. Normalizes (trims) the
 * customization text so "Ama" and " Ama " merge into one line, and an empty/
 * whitespace-only string is treated as no customization at all.
 */
export function lineKeyOf(
  variantId: string,
  customization?: string | null
): string {
  const text = customization?.trim() ?? "";
  return text ? `${variantId}::${text}` : variantId;
}

type CartState = {
  lines: CartLine[];
  add: (
    line: Omit<CartLine, "quantity" | "lineKey">,
    quantity: number
  ) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  remove: (lineKey: string) => void;
  clear: () => void;
  // Whether the cart slideover (14.17) is open — shared state rather than
  // local to the header's trigger, so a "View cart" link elsewhere on the
  // page (e.g. after adding an item from the product page) can open the same
  // sheet instance instead of navigating to a page that no longer exists.
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  setCartOpen: (open: boolean) => void;
};

const stores = new Map<string, ReturnType<typeof createCartStore>>();

/** A cart line persisted before DEV-7 (Phase 15) added lineKey. */
type PreLineKeyCartLine = Omit<CartLine, "lineKey">;

function createCartStore(subdomain: string) {
  return create<CartState>()(
    persist(
      (set) => ({
        lines: [],

        add: (line, quantity) =>
          set((state) => {
            const lineKey = lineKeyOf(line.variantId, line.customization);
            const existing = state.lines.find(
              (item) => item.lineKey === lineKey
            );

            if (existing) {
              return {
                lines: state.lines.map((item) =>
                  item.lineKey === lineKey
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                ),
              };
            }

            return { lines: [...state.lines, { ...line, lineKey, quantity }] };
          }),

        setQuantity: (lineKey, quantity) =>
          set((state) => ({
            // Dropping to zero removes the line rather than leaving an empty
            // row the shopper has to tidy up.
            lines:
              quantity <= 0
                ? state.lines.filter((item) => item.lineKey !== lineKey)
                : state.lines.map((item) =>
                    item.lineKey === lineKey ? { ...item, quantity } : item
                  ),
          })),

        remove: (lineKey) =>
          set((state) => ({
            lines: state.lines.filter((item) => item.lineKey !== lineKey),
          })),

        clear: () => set({ lines: [] }),

        isOpen: false,
        openCart: () => set({ isOpen: true }),
        closeCart: () => set({ isOpen: false }),
        setCartOpen: (open) => set({ isOpen: open }),
      }),
      {
        name: `primecart-cart:${subdomain}`,
        storage: createJSONStorage(() => localStorage),
        // Whether the sheet happens to be open is not something worth
        // resuming on a fresh page load — only the cart's contents are.
        partialize: (state) => ({ lines: state.lines }),
        // DEV-7 (Phase 15), §B.2 — a cart saved before `lineKey` existed has
        // none. Every such line was, by definition, uncustomized, so giving
        // it `lineKey = variantId` reproduces exactly the identity it already
        // had (that's the same value `lineKeyOf` returns for no
        // customization) — the migration is a no-op in behavior, only in
        // shape.
        version: 1,
        migrate: (persisted) => {
          const state = persisted as { lines?: PreLineKeyCartLine[] };
          return {
            lines: (state.lines ?? []).map((line) => ({
              ...line,
              lineKey: lineKeyOf(line.variantId, undefined),
            })),
          };
        },
      }
    )
  );
}

/** One store per shop, created on first use. */
export function useCartStore(subdomain: string) {
  let store = stores.get(subdomain);
  if (!store) {
    store = createCartStore(subdomain);
    stores.set(subdomain, store);
  }
  return store;
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce(
    (sum, line) => sum + (line.price + (line.customizationFee ?? 0)) * line.quantity,
    0
  );
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
