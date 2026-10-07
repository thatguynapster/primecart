/**
 * DEV-7 (Phase 15), §B.3 — shopper-supplied personalisation, validated here so
 * `checkout()` and `createManualOrder()` apply the exact same rules. The fee
 * always comes from the live product, never from the cart or form — "nothing
 * from the client is trusted" applies to customization pricing too.
 */

export type CustomizableProduct = {
  name: string;
  allowCustomization: boolean;
  customizationLabel: string | null;
  customizationMaxLength: number | null;
  customizationRequired: boolean;
  customizationFee: number | null;
};

export type CustomizationResult =
  | {
      ok: true;
      /** Sanitized text, or null when the line carries no customization. */
      text: string | null;
      /** Snapshotted alongside the text, so a later label rename doesn't change what an old order says was asked. */
      label: string | null;
      /** Per-unit surcharge, or null when the line carries no customization. */
      fee: number | null;
    }
  | { ok: false; error: string };

const HARD_MAX_LENGTH = 200;
const DEFAULT_MAX_LENGTH = 30;
const DEFAULT_LABEL = "Personalisation";

/**
 * Validates one line's customization text against its product's config.
 *
 * Rejects (rather than silently dropping) text sent for a product that
 * doesn't allow it — that surfaces a stale cart/form instead of quietly
 * losing what the shopper typed.
 */
export function validateCustomization(
  product: CustomizableProduct,
  rawInput: string | null | undefined
): CustomizationResult {
  // Control characters stripped, not just trimmed — a shopper's keyboard
  // shouldn't be able to put a null byte or similar into an order record.
  const raw = (rawInput ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();

  const label = product.customizationLabel?.trim() || DEFAULT_LABEL;

  if (!product.allowCustomization) {
    if (raw) {
      return { ok: false, error: `${product.name} can't be personalised.` };
    }
    return { ok: true, text: null, label: null, fee: null };
  }

  const max = Math.min(
    product.customizationMaxLength ?? DEFAULT_MAX_LENGTH,
    HARD_MAX_LENGTH
  );

  if (product.customizationRequired && !raw) {
    return { ok: false, error: `Add the ${label} for ${product.name}.` };
  }
  if (raw.length > max) {
    return { ok: false, error: `Keep the ${label} under ${max} characters.` };
  }

  if (!raw) return { ok: true, text: null, label: null, fee: null };

  return {
    ok: true,
    text: raw,
    label,
    fee: product.customizationFee ?? 0,
  };
}
