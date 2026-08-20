import { oid, runEmbeddedUpdate } from "@/lib/db/embedded";
import { invalidateStorefront } from "@/lib/merchant/lookup";

/**
 * Storefront branding writes.
 *
 * `storefront` is an embedded composite, and Prisma Client can only replace it
 * wholesale — `storefront: { update: … }` is rejected. Replacing it here would
 * mean read-modify-write, which risks clobbering `isActive`: Phase 13 flips
 * that field when a subscription lapses, and a merchant saving their shop name
 * at the wrong moment would switch their storefront back on.
 *
 * Setting individual paths avoids that entirely — each write touches only the
 * fields it names.
 */
export type BrandingFields = {
  businessName: string;
  description: string | null;
  primaryColor: string;
};

export async function updateStorefrontBranding(
  merchantId: string,
  subdomain: string,
  fields: BrandingFields
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Merchant",
    // The Merchant collection has no merchantId field — the record id *is* the
    // tenant, so scoping is the _id filter itself.
    filter: { _id: oid(merchantId) },
    update: {
      $set: {
        "storefront.businessName": fields.businessName,
        "storefront.description": fields.description,
        "storefront.primaryColor": fields.primaryColor,
      },
    },
  });

  // The proxy and every storefront page read through a five-minute cache.
  invalidateStorefront(subdomain);
}

export async function setStorefrontLogo(
  merchantId: string,
  subdomain: string,
  logoUrl: string | null
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Merchant",
    filter: { _id: oid(merchantId) },
    update: { $set: { "storefront.logoUrl": logoUrl } },
  });

  invalidateStorefront(subdomain);
}

/**
 * Phase 14 hero and mid-page banner content. Two independent slots sharing
 * the same field shape (headline, subheading, image) — same per-field write
 * pattern as the branding functions above, so saving one never clobbers the
 * other or `isActive`.
 */
export type HeroBannerFields = {
  headline: string | null;
  subheading: string | null;
};

export async function updateStorefrontHero(
  merchantId: string,
  subdomain: string,
  fields: HeroBannerFields
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Merchant",
    filter: { _id: oid(merchantId) },
    update: {
      $set: {
        "storefront.heroHeadline": fields.headline,
        "storefront.heroSubheading": fields.subheading,
      },
    },
  });

  invalidateStorefront(subdomain);
}

export async function setStorefrontHeroImage(
  merchantId: string,
  subdomain: string,
  imageUrl: string | null
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Merchant",
    filter: { _id: oid(merchantId) },
    update: { $set: { "storefront.heroImageUrl": imageUrl } },
  });

  invalidateStorefront(subdomain);
}

export async function updateStorefrontBanner(
  merchantId: string,
  subdomain: string,
  fields: HeroBannerFields
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Merchant",
    filter: { _id: oid(merchantId) },
    update: {
      $set: {
        "storefront.bannerHeadline": fields.headline,
        "storefront.bannerSubheading": fields.subheading,
      },
    },
  });

  invalidateStorefront(subdomain);
}

export async function setStorefrontBannerImage(
  merchantId: string,
  subdomain: string,
  imageUrl: string | null
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Merchant",
    filter: { _id: oid(merchantId) },
    update: { $set: { "storefront.bannerImageUrl": imageUrl } },
  });

  invalidateStorefront(subdomain);
}

/** Footer socials (14.20) — Facebook/Instagram URLs plus a WhatsApp number, each independently optional. */
export type SocialFields = {
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappNumber: string | null;
};

export async function updateStorefrontSocials(
  merchantId: string,
  subdomain: string,
  fields: SocialFields
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Merchant",
    filter: { _id: oid(merchantId) },
    update: {
      $set: {
        "storefront.facebookUrl": fields.facebookUrl,
        "storefront.instagramUrl": fields.instagramUrl,
        "storefront.whatsappNumber": fields.whatsappNumber,
      },
    },
  });

  invalidateStorefront(subdomain);
}

/**
 * Switches a storefront on or off — the effect of a subscription lapsing or
 * reactivating (Phase 13). Same per-field write as the two functions above,
 * for the same reason: writing the whole `storefront` composite here would
 * risk a stale read clobbering branding a merchant just saved.
 */
export async function setStorefrontActive(
  merchantId: string,
  subdomain: string,
  isActive: boolean
): Promise<void> {
  await runEmbeddedUpdate({
    collection: "Merchant",
    filter: { _id: oid(merchantId) },
    update: { $set: { "storefront.isActive": isActive } },
  });

  invalidateStorefront(subdomain);
}
