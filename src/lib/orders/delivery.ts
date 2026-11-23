/**
 * Delivery options and fees. Pure (no Prisma, no `@/` imports) so settings,
 * checkout, the cart and the tests all share one set of rules.
 *
 * A shop lists its own areas and prices, and can add two extras: pickup
 * (free, no address) and "agreed on WhatsApp" (the fee is settled directly
 * with the merchant and is not part of the order total unless the merchant
 * adds it). A shop with no options works as before: no choice, no fee.
 */

export type DeliveryKind = "AREA" | "PICKUP" | "QUOTE";

export type DeliveryOption = {
  id: string;
  /** A DeliveryKind; a plain string because that is how MongoDB stores it. */
  kind: string;
  name: string;
  /** GHS. Always 0 for PICKUP and QUOTE. */
  fee: number;
  /** Pickup only: where and when to collect. */
  note: string | null;
};

export const PICKUP_ID = "pickup";
export const QUOTE_ID = "quote";
export const PICKUP_NAME = "Pickup";
export const QUOTE_NAME = "Delivery fee agreed on WhatsApp";

export const MAX_AREAS = 40;
export const MAX_AREA_NAME = 60;
export const MAX_PICKUP_NOTE = 200;
export const MAX_FEE = 10_000;

/** GHS amount from a form: up to 2 decimals, 0 to MAX_FEE. Null if invalid. */
export function parseFee(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return null;
  const fee = Number(text);
  return fee <= MAX_FEE ? fee : null;
}

/** Adds in pesewas, so a total never carries a floating point tail. */
export function addGhs(a: number, b: number): number {
  return (Math.round(a * 100) + Math.round(b * 100)) / 100;
}

export type DeliveryFormResult =
  | { ok: true; options: DeliveryOption[] }
  | { ok: false; error: string };

/**
 * The settings form, as typed. Rows left completely blank are dropped. An
 * area keeps its id only if it already exists, so a client can't choose ids.
 */
export function parseDeliveryForm(
  input: {
    areas: { id: string; name: string; fee: string }[];
    pickup: boolean;
    pickupNote: string;
    quote: boolean;
  },
  existingIds: ReadonlySet<string>,
  newId: () => string
): DeliveryFormResult {
  const areas = input.areas
    .map((area) => ({ ...area, name: area.name.trim(), fee: area.fee.trim() }))
    .filter((area) => area.name || area.fee);

  if (areas.length > MAX_AREAS) {
    return { ok: false, error: `Use at most ${MAX_AREAS} areas.` };
  }

  const options: DeliveryOption[] = [];
  const names = new Set<string>();
  const ids = new Set<string>();

  for (const area of areas) {
    if (!area.name) return { ok: false, error: "Every area needs a name." };
    if (area.name.length > MAX_AREA_NAME) {
      return { ok: false, error: `Keep area names under ${MAX_AREA_NAME} characters.` };
    }
    const key = area.name.toLowerCase();
    if (names.has(key)) {
      return { ok: false, error: `"${area.name}" is listed twice.` };
    }
    names.add(key);

    const fee = parseFee(area.fee);
    if (fee == null) {
      return {
        ok: false,
        error: `Enter a fee for ${area.name}, like 25 or 25.50. Use 0 for free delivery.`,
      };
    }

    const id = existingIds.has(area.id) && !ids.has(area.id) ? area.id : newId();
    ids.add(id);
    options.push({ id, kind: "AREA", name: area.name, fee, note: null });
  }

  if (input.pickup) {
    const note = input.pickupNote.trim();
    if (note.length > MAX_PICKUP_NOTE) {
      return { ok: false, error: `Keep the pickup details under ${MAX_PICKUP_NOTE} characters.` };
    }
    options.push({ id: PICKUP_ID, kind: "PICKUP", name: PICKUP_NAME, fee: 0, note: note || null });
  }
  if (input.quote) {
    options.push({ id: QUOTE_ID, kind: "QUOTE", name: QUOTE_NAME, fee: 0, note: null });
  }

  return { ok: true, options };
}

export type DeliveryChoice =
  | { ok: true; option: DeliveryOption | null; fee: number }
  | { ok: false; error: string };

/**
 * The option a buyer picked, priced from the shop's own list. `shownFee` is
 * only compared, never used as a price: it stops a buyer being charged a fee
 * the merchant changed after the page loaded.
 */
export function chooseDelivery(
  options: DeliveryOption[],
  optionId: unknown,
  shownFee: unknown
): DeliveryChoice {
  const changed = {
    ok: false as const,
    error: "The shop's delivery options just changed. Check your choice and the new total, then try again.",
  };

  if (options.length === 0) {
    return optionId ? changed : { ok: true, option: null, fee: 0 };
  }
  if (!optionId) {
    return { ok: false, error: "Choose how you want to receive your order." };
  }
  const option = options.find((candidate) => candidate.id === optionId);
  if (!option || option.fee !== shownFee) return changed;
  return { ok: true, option, fee: option.fee };
}

/** The delivery part of an order, as shown to buyers and merchants. */
export type OrderDelivery = {
  deliveryKind: string | null;
  deliveryName: string | null;
  deliveryFee: number | null;
};

/** True when the buyer still owes a delivery fee that isn't in the total. */
export function deliveryFeeUnagreed(order: OrderDelivery): boolean {
  return order.deliveryKind === "QUOTE" && order.deliveryFee == null;
}

/**
 * One line for an order summary, or null when the order has no delivery
 * choice or fee (orders from before this existed, most manual orders).
 */
export function deliveryLine(
  order: OrderDelivery
): { label: string; amount: number | null } | null {
  if (order.deliveryKind === "PICKUP") return { label: PICKUP_NAME, amount: 0 };
  if (order.deliveryKind === "QUOTE") return { label: "Delivery", amount: order.deliveryFee };
  if (order.deliveryKind == null && order.deliveryFee == null) return null;
  return {
    label: order.deliveryName ? `Delivery: ${order.deliveryName}` : "Delivery",
    amount: order.deliveryFee ?? 0,
  };
}

/** "Free", "To be agreed", or the formatted amount. */
export function deliveryAmountText(
  amount: number | null,
  format: (amount: number) => string
): string {
  if (amount == null) return "To be agreed";
  return amount === 0 ? "Free" : format(amount);
}
