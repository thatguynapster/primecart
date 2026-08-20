import Image from "next/image";
import Link from "next/link";
import {
  FacebookLogo,
  InstagramLogo,
  MagnifyingGlass,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";

import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { brandStyle } from "@/lib/storefront/brand";
import { getBestSellingCategories } from "@/lib/storefront/bestsellers";
import { listStorefrontCategories } from "@/lib/storefront/catalogue";
import { CartSheet } from "@/components/store/cart-sheet";

/**
 * Storefront shell.
 *
 * Reached only through the proxy, which rewrites `<shop>.primecart.app/*` to
 * `/store/<shop>/*`. Everything here is public — a shopper is never signed in.
 *
 * Mobile-first throughout: the customer is on the phone the merchant sent the
 * link to.
 */
export default async function StorefrontLayout({
  children,
  params,
}: LayoutProps<"/store/[subdomain]">) {
  const { subdomain } = await params;
  const merchant = await getMerchantBySubdomain(subdomain);

  // The proxy already 404s unknown shops and diverts inactive ones; this
  // guards direct hits on the internal path.
  if (!merchant || !merchant.isActive) notFound();

  const [categories, bestSellingCategories] = await Promise.all([
    listStorefrontCategories(merchant.id),
    getBestSellingCategories(merchant.id),
  ]);

  return (
    <div
      style={brandStyle(merchant.primaryColor)}
      className="flex min-h-full flex-col bg-white text-neutral-900"
    >
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6 justify-between">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
            {merchant.logoUrl ? (
              <Image
                src={merchant.logoUrl}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold"
                style={{ background: "var(--brand)", color: "var(--on-brand)" }}
              >
                {merchant.businessName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="hidden truncate text-[15px] font-semibold tracking-tight sm:inline">
              {merchant.businessName}
            </span>
          </Link>

          {/* Reference section 1: nav links as category names. Data-driven per
              merchant rather than the reference's hardcoded electronics list —
              hidden below xl, where the search box (kept visible at every
              width per the owner's instruction) needs the room instead. */}
          {categories.length > 0 && (
            <nav className="hidden min-w-0 shrink-0 items-center gap-5 overflow-x-auto xl:flex">
              <Link
                href="/"
                className="shrink-0 text-[13.5px] font-medium text-neutral-600 hover:text-neutral-900"
              >
                Home
              </Link>
              {categories.slice(0, 5).map((category) => (
                <Link
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className="shrink-0 text-[13.5px] font-medium text-neutral-600 hover:text-neutral-900"
                >
                  {category}
                </Link>
              ))}
            </nav>
          )}

          {/* Search always lives here, never on the page itself (14.15) — a
              category filter switching it out from under the shopper, or
              search only appearing on some pages, was the exact "bad UX"
              flagged. Submits a plain GET to the dedicated products listing. */}
          <div className="flex gap-3">
            <form action="/products" className="min-w-0 max-w-44 flex-1">
              <label className="flex items-center gap-2 rounded-full border border-neutral-300 px-3.5 py-2 focus-within:border-neutral-900">
                <MagnifyingGlass size={15} className="flex-none text-neutral-400" />
                <input
                  type="search"
                  name="q"
                  placeholder="Search"
                  aria-label="Search products"
                  className="w-full min-w-0 border-0 bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
                />
              </label>
            </form>

            <CartSheet subdomain={subdomain} primaryColor={merchant.primaryColor} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Reference section 11 — dark background, the shop name fading into
          an oversized wordmark at the bottom, a light-divided bottom bar with
          "Powered by PrimeCart" and payment-method marks (14.19). Reduced to
          one link column (decided 2026-08-18): Shop/Company/Policy & Info
          cut, Categories kept and driven by what actually sells rather than
          a static list. */}
      <footer className="relative overflow-hidden bg-neutral-950 text-neutral-300">
        <div className="relative mx-auto max-w-5xl px-4 pt-12 pb-40 sm:px-6 sm:pt-16 sm:pb-52">
          <div className="flex flex-wrap gap-10">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold tracking-tight text-white">
                {merchant.businessName}
              </p>
              {merchant.description && (
                <p className="mt-2 max-w-md text-[13px] leading-relaxed text-neutral-400">
                  {merchant.description}
                </p>
              )}

              {/* Reference section 11: social icons under the tagline (14.20) — each
                  independently optional, so a merchant who's only set up one still
                  gets a footer that looks intentional rather than half-empty. */}
              {(merchant.facebookUrl || merchant.instagramUrl || merchant.whatsappNumber) && (
                <div className="mt-4 flex items-center gap-3">
                  {merchant.facebookUrl && (
                    <a
                      href={merchant.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="text-neutral-400 transition-colors hover:text-white"
                    >
                      <FacebookLogo size={18} weight="fill" />
                    </a>
                  )}
                  {merchant.instagramUrl && (
                    <a
                      href={merchant.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="text-neutral-400 transition-colors hover:text-white"
                    >
                      <InstagramLogo size={18} weight="fill" />
                    </a>
                  )}
                  {merchant.whatsappNumber && (
                    <a
                      href={`https://wa.me/${merchant.whatsappNumber.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                      className="text-neutral-400 transition-colors hover:text-white"
                    >
                      <WhatsappLogo size={18} weight="fill" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {bestSellingCategories.length > 0 && (
              <div className="min-w-32">
                <p className="text-[11.5px] font-semibold tracking-wide text-neutral-400 uppercase">
                  Categories
                </p>
                <ul className="mt-3 space-y-2">
                  {bestSellingCategories.map((category) => (
                    <li key={category.name}>
                      <Link
                        href={`/products?category=${encodeURIComponent(category.name)}`}
                        className="text-[13px] text-neutral-400 hover:text-white"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* The oversized wordmark dissolving into the footer's own
            background top-to-bottom — a gradient fill on the text itself
            (`bg-clip-text`), not a flat-opacity block clipped by a
            container edge, which read as the text getting cut off mid-glyph
            rather than fading away. Purely decorative, so hidden from screen
            readers. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-16 translate-y-[12%] bg-linear-to-b from-neutral-800 to-neutral-950 bg-clip-text text-center leading-none font-black whitespace-nowrap text-transparent select-none"
          style={{ fontSize: "16vw" }}
        >
          {merchant.businessName}
        </div>

        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
            <p className="text-[12px] text-neutral-400">Powered by <Link href="https://primecart.app" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2">PrimeCart</Link></p>
            <div className="flex items-center gap-1.5">
              {["Visa", "Mastercard", "Mobile Money"].map((method) => (
                <span
                  key={method}
                  className="rounded-sm border border-white/15 px-2 py-1 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
