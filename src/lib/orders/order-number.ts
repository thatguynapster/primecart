import { randomInt } from "node:crypto";

/**
 * Human-typeable order numbers.
 *
 * Merchants read these out over WhatsApp and search for them by hand, so
 * short and unambiguous beats a strictly sequential counter — which would
 * also need a dedicated counter document and a transaction to stay race-safe
 * under concurrent orders, for a guarantee nothing in the handover asks for.
 *
 * Format: PC-YYMMDD-XXXX. Four base-36 characters give ~1.68M combinations per
 * day per merchant; not database-unique, but collision odds at MVP order
 * volumes are negligible, and a rare clash is cosmetic — `orderNumber` is a
 * display label, not a lookup key (Order.id is).
 */
export function generateOrderNumber(date: Date = new Date()): string {
  const stamp = date.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
  const suffix = randomInt(0, 36 ** 4).toString(36).toUpperCase().padStart(4, "0");
  return `PC-${stamp}-${suffix}`;
}
