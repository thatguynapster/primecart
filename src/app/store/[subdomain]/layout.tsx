import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { brandStyle } from "@/lib/storefront/brand";
import { getBestSellingCategories } from "@/lib/storefront/bestsellers";
import { listStorefrontCategories } from "@/lib/storefront/catalogue";
import { CartButton } from "@/components/store/cart-button";

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
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
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
            <span className="truncate text-[15px] font-semibold tracking-tight">
              {merchant.businessName}
            </span>
          </Link>

          {/* Reference section 1: nav links as category names. Data-driven per
              merchant rather than the reference's hardcoded electronics list —
              hidden below the header's own breakpoint on small screens, where
              there isn't room for both branding and a nav row. */}
          {categories.length > 0 && (
            <nav className="hidden min-w-0 items-center gap-5 overflow-x-auto lg:flex">
              <Link
                href="/"
                className="shrink-0 text-[13.5px] font-medium text-neutral-600 hover:text-neutral-900"
              >
                Home
              </Link>
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category}
                  href={`/?category=${encodeURIComponent(category)}`}
                  className="shrink-0 text-[13.5px] font-medium text-neutral-600 hover:text-neutral-900"
                >
                  {category}
                </Link>
              ))}
            </nav>
          )}

          <CartButton subdomain={subdomain} />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap gap-10">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{merchant.businessName}</p>
              {merchant.description && (
                <p className="mt-1 max-w-md text-[13px] text-neutral-500">
                  {merchant.description}
                </p>
              )}
            </div>

            {/* Reference section 11, reduced to one column (decided
                2026-08-18): Shop/Company/Policy & Info cut, Categories kept
                and driven by what actually sells rather than a static list. */}
            {bestSellingCategories.length > 0 && (
              <div className="min-w-32">
                <p className="text-[11.5px] font-semibold tracking-wide text-neutral-400 uppercase">
                  Categories
                </p>
                <ul className="mt-3 space-y-2">
                  {bestSellingCategories.map((category) => (
                    <li key={category.name}>
                      <Link
                        href={`/?category=${encodeURIComponent(category.name)}`}
                        className="text-[13px] text-neutral-600 hover:text-neutral-900"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="mt-8 text-[12px] text-neutral-400">
            Powered by PrimeCart
          </p>
        </div>
      </footer>
    </div>
  );
}
