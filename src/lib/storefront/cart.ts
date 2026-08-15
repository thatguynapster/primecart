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
  productId: string;
  variantId: string;
  /** Snapshotted for display only; the server re-reads these at checkout. */
  productName: string;
  variantName: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "quantity">, quantity: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const stores = new Map<string, ReturnType<typeof createCartStore>>();

function createCartStore(subdomain: string) {
  return create<CartState>()(
    persist(
      (set) => ({
        lines: [],

        add: (line, quantity) =>
          set((state) => {
            const existing = state.lines.find(
              (item) => item.variantId === line.variantId
            );

            if (existing) {
              return {
                lines: state.lines.map((item) =>
                  item.variantId === line.variantId
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                ),
              };
            }

            return { lines: [...state.lines, { ...line, quantity }] };
          }),

        setQuantity: (variantId, quantity) =>
          set((state) => ({
            // Dropping to zero removes the line rather than leaving an empty
            // row the shopper has to tidy up.
            lines:
              quantity <= 0
                ? state.lines.filter((item) => item.variantId !== variantId)
                : state.lines.map((item) =>
                    item.variantId === variantId ? { ...item, quantity } : item
                  ),
          })),

        remove: (variantId) =>
          set((state) => ({
            lines: state.lines.filter((item) => item.variantId !== variantId),
          })),

        clear: () => set({ lines: [] }),
      }),
      {
        name: `primecart-cart:${subdomain}`,
        storage: createJSONStorage(() => localStorage),
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
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
