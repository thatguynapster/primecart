import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { brandStyle } from "@/lib/storefront/brand";
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

          <CartButton subdomain={subdomain} />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <p className="text-[13px] font-medium">{merchant.businessName}</p>
          {merchant.description && (
            <p className="mt-1 max-w-md text-[13px] text-neutral-500">
              {merchant.description}
            </p>
          )}
          <p className="mt-4 text-[12px] text-neutral-400">
            Powered by PrimeCart
          </p>
        </div>
      </footer>
    </div>
  );
}
