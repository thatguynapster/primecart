import { createHash } from "node:crypto";

import type { Metadata } from "next";

import { getStorefrontOrigin } from "@/lib/domain";
import type { StorefrontMerchant } from "@/lib/merchant/lookup";

/**
 * Link previews (WhatsApp, Instagram, Facebook). Images are kept small: large
 * ones are skipped by WhatsApp.
 */

/** Bump when the card's design changes, so cached cards are replaced. */
const DESIGN = 2;

function version(...parts: (string | null)[]): string {
  return createHash("sha256")
    .update(JSON.stringify([DESIGN, ...parts]))
    .digest("hex")
    .slice(0, 12);
}

/** A product's photo, or the shop's card if it has none. */
export function productPreviewUrl(
  origin: string,
  product: { id: string; images: string[] }
): string {
  const photo = product.images[0] ?? null;
  return `${origin}/og?product=${product.id}&v=${version(photo)}`;
}

/** Link-preview tags for the shop's own pages, using the generated card. */
export function shopPreview(merchant: StorefrontMerchant, photoUrl: string | null): Metadata {
  const origin = getStorefrontOrigin(merchant.subdomain);
  const title = merchant.businessName;
  const description = merchant.description ?? `Shop ${merchant.businessName} online.`;

  // Changes whenever the card would look different, so the old one can be
  // cached for long.
  const image = `${origin}/og?v=${version(
    merchant.businessName,
    merchant.description,
    merchant.primaryColor,
    merchant.logoUrl,
    photoUrl
  )}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: origin,
      siteName: title,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
