/**
 * Merchant brand colour handling.
 *
 * The colour is chosen by the merchant, so it can be anything — including pale
 * yellow. Text placed on it has to be picked per-merchant or some storefronts
 * would ship unreadable buttons.
 */

/** Perceived brightness (ITU-R BT.601), 0–255. */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Falls back to near-black rather than trusting an unvalidated stored value. */
export function safeBrandColor(color: string | null | undefined): string {
  return color && HEX.test(color) ? color : "#111111";
}

/** Readable text colour for content sitting on the brand colour. */
export function onBrandColor(color: string): string {
  return luminance(safeBrandColor(color)) > 150 ? "#111111" : "#ffffff";
}

/**
 * CSS variables for a storefront subtree.
 *
 * Set once on the layout wrapper and consumed with Tailwind arbitrary values
 * (`bg-[var(--brand)]`), which keeps the merchant's colour out of class names
 * — those are generated at build time and cannot vary per request.
 */
export function brandStyle(color: string | null | undefined): React.CSSProperties {
  const brand = safeBrandColor(color);
  return {
    "--brand": brand,
    "--on-brand": onBrandColor(brand),
  } as React.CSSProperties;
}
