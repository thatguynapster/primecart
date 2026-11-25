/**
 * Merchant brand colour handling.
 *
 * The colour is chosen by the merchant, so it can be anything — including pale
 * yellow. Text placed on it has to be picked per-merchant or some storefronts
 * would ship unreadable buttons.
 */

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White text needs at least this contrast (WCAG's floor for bold buttons). */
const MIN_WHITE_CONTRAST = 3;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Falls back to near-black rather than trusting an unvalidated stored value. */
export function safeBrandColor(color: string | null | undefined): string {
  return color && HEX.test(color) ? color : "#111111";
}

/** Readable text colour for content sitting on the brand colour. */
export function onBrandColor(color: string): string {
  const whiteContrast = 1.05 / (luminance(safeBrandColor(color)) + 0.05);
  return whiteContrast < MIN_WHITE_CONTRAST ? "#111111" : "#ffffff";
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
