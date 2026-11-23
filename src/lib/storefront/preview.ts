import { createHash } from "node:crypto";

import type { Metadata } from "next";

import { getStorefrontOrigin } from "@/lib/domain";
import type { StorefrontMerchant } from "@/lib/merchant/lookup";

/**
 * Link previews (WhatsApp, Instagram, Facebook). Images are kept small: large
 * ones are skipped by WhatsApp.
 */

/**
 * An uploaded image through Next's optimiser at 640px. A crawler that doesn't
 * ask for WebP gets a JPEG or PNG, which every preview supports.
 */
export function previewPhotoUrl(origin: string, imageUrl: string): string {
  return `${origin}/_next/image?url=${encodeURIComponent(imageUrl)}&w=640&q=75`;
}

/** Link-preview tags for the shop's own pages, using the generated card. */
export function shopPreview(merchant: StorefrontMerchant, photoUrl: string | null): Metadata {
  const origin = getStorefrontOrigin(merchant.subdomain);
  const title = merchant.businessName;
  const description = merchant.description ?? `Shop ${merchant.businessName} online.`;

  // Changes whenever the card would look different, so the old one can be
  // cached for long.
  const version = createHash("sha256")
    .update(
      JSON.stringify([
        merchant.businessName,
        merchant.description,
        merchant.primaryColor,
        merchant.logoUrl,
        photoUrl,
      ])
    )
    .digest("hex")
    .slice(0, 12);
  const image = `${origin}/og?v=${version}`;

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
