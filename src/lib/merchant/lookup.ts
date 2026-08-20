import type { SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Merchant lookups performed by the proxy on every request.
 *
 * These run in the request path for *all* storefront traffic, so they are
 * cached in memory for five minutes rather than hitting MongoDB each time.
 *
 * The cache is per-instance and non-distributed: a serverless deployment holds
 * one cache per warm instance, and entries simply expire. That is acceptable
 * because the cached facts change rarely (a merchant's subdomain, whether their
 * storefront is active). The cost is a delay of up to five minutes before a
 * change takes effect — so any code that mutates these fields must call the
 * matching invalidate function.
 *
 * Misses are cached too. Without that, requests for a non-existent subdomain —
 * exactly what a scanner or a typo produces — would hit the database on every
 * request.
 */

const CACHE_TTL_MS = 1000 * 60 * 5;

type CacheEntry<T> = { data: T; expiresAt: number };

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry;
}

function writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Storefront resolution: subdomain -> merchant
// ---------------------------------------------------------------------------

export type StorefrontMerchant = {
  id: string;
  subdomain: string;
  isActive: boolean;
  /** Branding, so a storefront page renders from one cached lookup. */
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  description: string | null;
  /** Phase 14 hero content — all optional, the page falls back when unset. */
  heroHeadline: string | null;
  heroSubheading: string | null;
  heroImageUrl: string | null;
  /** Phase 14 mid-page banner — independent content from the hero's. */
  bannerHeadline: string | null;
  bannerSubheading: string | null;
  bannerImageUrl: string | null;
  /** Footer socials (14.20) — each optional, icon only renders once set. */
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappNumber: string | null;
};

const storefrontCache = new Map<string, CacheEntry<StorefrontMerchant | null>>();

/** Resolves a subdomain to its merchant, or null if no storefront claims it. */
export async function getMerchantBySubdomain(
  subdomain: string
): Promise<StorefrontMerchant | null> {
  const cached = readCache(storefrontCache, subdomain);
  if (cached) return cached.data;

  const merchant = await prisma.merchant.findFirst({
    where: { storefront: { is: { subdomain } } },
    select: { id: true, storefront: true },
  });

  const data: StorefrontMerchant | null = merchant?.storefront
    ? {
        id: merchant.id,
        subdomain: merchant.storefront.subdomain,
        isActive: merchant.storefront.isActive,
        businessName: merchant.storefront.businessName,
        logoUrl: merchant.storefront.logoUrl,
        primaryColor: merchant.storefront.primaryColor,
        description: merchant.storefront.description,
        heroHeadline: merchant.storefront.heroHeadline,
        heroSubheading: merchant.storefront.heroSubheading,
        heroImageUrl: merchant.storefront.heroImageUrl,
        bannerHeadline: merchant.storefront.bannerHeadline,
        bannerSubheading: merchant.storefront.bannerSubheading,
        bannerImageUrl: merchant.storefront.bannerImageUrl,
        facebookUrl: merchant.storefront.facebookUrl,
        instagramUrl: merchant.storefront.instagramUrl,
        whatsappNumber: merchant.storefront.whatsappNumber,
      }
    : null;

  writeCache(storefrontCache, subdomain, data);
  return data;
}

export function invalidateStorefront(subdomain: string) {
  storefrontCache.delete(subdomain);
}

// ---------------------------------------------------------------------------
// Subscription gating: clerk user -> subscription status
// ---------------------------------------------------------------------------

const subscriptionCache = new Map<
  string,
  CacheEntry<SubscriptionStatus | null>
>();

/**
 * Subscription status for a signed-in merchant, or null if no merchant record
 * exists yet (a Clerk user who has signed up but not completed onboarding).
 */
export async function getSubscriptionStatus(
  clerkUserId: string
): Promise<SubscriptionStatus | null> {
  const cached = readCache(subscriptionCache, clerkUserId);
  if (cached) return cached.data;

  const merchant = await prisma.merchant.findUnique({
    where: { clerkUserId },
    select: { subscriptionStatus: true },
  });

  const data = merchant?.subscriptionStatus ?? null;
  writeCache(subscriptionCache, clerkUserId, data);
  return data;
}

export function invalidateSubscription(clerkUserId: string) {
  subscriptionCache.delete(clerkUserId);
}
