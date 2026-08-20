import Image from "next/image";
import Link from "next/link";
import type { Product } from "@prisma/client";

import type { StorefrontMerchant } from "@/lib/merchant/lookup";
import { ProductCard } from "@/components/store/product-card";

/**
 * Homepage sections for the redesigned storefront (Phase 14). Order follows
 * the reference image, minus the excluded/deferred sections: Hero → Category
 * tiles → Best Sellers → Featured Collection → mid-page banner → New
 * Arrivals. Every section renders correctly for any of the three shop types
 * from merchant data alone — nothing here assumes a specific category.
 */

// ---------------------------------------------------------------------------
// Hero (section 2) and mid-page banner (section 8) share one visual: a
// full-bleed image with a headline/subheading/CTA overlay. The hero always
// renders (falling back to business name + description); the banner is a
// second, independent slot that only appears once the merchant adds an image.
// ---------------------------------------------------------------------------

function BannerBlock({
  headline,
  subheading,
  imageUrl,
  cta,
  large,
}: {
  headline: string;
  subheading: string | null;
  imageUrl: string | null;
  cta?: { label: string; href: string };
  /** The hero runs taller than the mid-page banner, matching the reference. */
  large: boolean;
}) {
  return (
    <section
      className={`relative flex items-center overflow-hidden ${large ? "min-h-87.5 sm:min-h-100" : "min-h-62.5 sm:min-h-75"}`}
      style={!imageUrl ? { background: "var(--brand)" } : undefined}
    >
      {imageUrl && (
        <>
          <Image
            src={imageUrl}
            alt=""
            fill
            priority={large}
            sizes="100vw"
            quality={90}
            className="object-cover"
          />
          {/* Darkens the photo so white text stays readable regardless of
              what the merchant uploaded — the reference achieves the same
              readability with styled photography we can't guarantee here. */}
          <div className="absolute inset-0 bg-black/40" />
        </>
      )}

      <div className="relative mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-md">
          <h1
            className={`font-semibold tracking-tight text-balance ${large ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}
            style={{ color: imageUrl ? "#ffffff" : "var(--on-brand)" }}
          >
            {headline}
          </h1>
          {subheading && (
            <p
              className="mt-3 text-[15px] leading-relaxed"
              style={{
                color: imageUrl ? "rgba(255,255,255,0.85)" : "var(--on-brand)",
                opacity: imageUrl ? 1 : 0.85,
              }}
            >
              {subheading}
            </p>
          )}
          {cta && (
            <Link
              href={cta.href}
              className="mt-6 inline-flex rounded-full bg-white px-6 py-2.5 text-[13.5px] font-semibold text-neutral-900 transition-transform hover:scale-[1.02]"
            >
              {cta.label} →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function Hero({ merchant }: { merchant: StorefrontMerchant }) {
  return (
    <BannerBlock
      large
      headline={merchant.heroHeadline || merchant.businessName}
      subheading={merchant.heroSubheading || merchant.description}
      imageUrl={merchant.heroImageUrl}
      cta={{ label: "Explore Products", href: "#new-arrivals" }}
    />
  );
}

export function MidPageBanner({ merchant }: { merchant: StorefrontMerchant }) {
  // Skipped only when the merchant hasn't touched this section at all —
  // corrected 2026-08-19: originally gated on bannerImageUrl alone, so
  // setting just a headline (no photo yet) silently showed nothing, which
  // read as broken rather than "optional." Same shape as the hero now: any
  // content renders, with a solid-brand-colour fallback when there's no image.
  if (!merchant.bannerHeadline && !merchant.bannerImageUrl) return null;

  return (
    <BannerBlock
      large={false}
      headline={merchant.bannerHeadline || merchant.businessName}
      subheading={merchant.bannerSubheading}
      imageUrl={merchant.bannerImageUrl}
    />
  );
}

// ---------------------------------------------------------------------------
// Category tiles (section 4)
// ---------------------------------------------------------------------------

export function CategoryTiles({
  tiles,
}: {
  tiles: { name: string; imageUrl: string | null }[];
}) {
  if (tiles.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h2 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
        Shop by Category
      </h2>

      <div className="mt-7 flex gap-3.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible lg:grid-cols-6">
        {tiles.map((tile) => (
          <Link
            key={tile.name}
            href={`/products?category=${encodeURIComponent(tile.name)}`}
            className="group relative aspect-square w-32 flex-none overflow-hidden rounded-xl bg-neutral-100 sm:w-auto"
          >
            {tile.imageUrl ? (
              <Image
                src={tile.imageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 128px, 200px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="absolute inset-0" style={{ background: "var(--brand)", opacity: 0.15 }} />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/0 to-black/0" />
            <span className="absolute bottom-2.5 left-2.5 text-[13px] font-semibold text-white">
              {tile.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Best Sellers (section 5) and Featured Collection (section 7) — same
// heading + grid treatment. Reference shows a "View all Product →" link in
// both; now that /products exists (14.18) it has somewhere real to point.
// ---------------------------------------------------------------------------

export function ProductSection({
  id,
  title,
  subdomain,
  products,
}: {
  id?: string;
  title: string;
  subdomain: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <section id={id} className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        <Link
          href="/products"
          className="shrink-0 text-[13px] font-medium text-neutral-600 hover:text-neutral-900"
        >
          View all →
        </Link>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} subdomain={subdomain} product={product} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// New Arrivals (section 9) — its own in-page category tabs, a local filter
// distinct from the page-level `category` param (which switches the whole
// page into category/search results mode).
// ---------------------------------------------------------------------------

export function NewArrivals({
  subdomain,
  categories,
  activeCategory,
  products,
}: {
  subdomain: string;
  categories: string[];
  activeCategory?: string;
  products: Product[];
}) {
  return (
    <section
      id="new-arrivals"
      className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <h2 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
        New Arrivals
      </h2>

      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/#new-arrivals"
            className={
              !activeCategory
                ? "rounded-full border border-neutral-900 bg-neutral-900 px-3.5 py-1.5 text-[13px] text-white"
                : "rounded-full border border-neutral-300 px-3.5 py-1.5 text-[13px] transition-colors hover:border-neutral-500"
            }
          >
            All Product
          </Link>
          {categories.map((category) => (
            <Link
              key={category}
              href={`/?arrivals=${encodeURIComponent(category)}#new-arrivals`}
              className={
                activeCategory === category
                  ? "rounded-full border border-neutral-900 bg-neutral-900 px-3.5 py-1.5 text-[13px] text-white"
                  : "rounded-full border border-neutral-300 px-3.5 py-1.5 text-[13px] transition-colors hover:border-neutral-500"
              }
            >
              {category}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="mt-10 text-center text-[14px] text-neutral-500">
          Nothing here yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} subdomain={subdomain} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
