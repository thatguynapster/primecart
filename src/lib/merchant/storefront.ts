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
