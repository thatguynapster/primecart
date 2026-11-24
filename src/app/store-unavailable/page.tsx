import Image from "next/image";

import { getDashboardOrigin } from "@/lib/domain";

export const metadata = {
  title: "Storefront no longer active — PrimeCart",
  description: "This storefront is no longer active.",
  robots: { index: false },
};

/**
 * Shown in place of a storefront that is switched off (`isActive` false) or
 * whose plan lapsed long enough ago (D-25).
 *
 * Deliberately distinct from the 404 for an unknown subdomain: this shop is
 * real. The copy says nothing about billing — a shopper doesn't need to know.
 * Served on the shop's own subdomain, so links go to the root domain.
 */
export default function StoreUnavailablePage() {
  const home = getDashboardOrigin();

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F5F4] text-neutral-900">
      <header className="px-5 py-5 sm:px-8">
        <a href={home} className="inline-flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={26} height={26} className="rounded-[5px]" priority />
          <span className="font-display text-[17px] font-bold tracking-tight">PrimeCart</span>
        </a>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display max-w-lg text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">
          This storefront is no longer active
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-neutral-600">
          It isn&rsquo;t available to browse or order from. If you&rsquo;ve
          already ordered, please contact the seller directly.
        </p>
        <p className="mt-8 text-[13.5px] text-neutral-600">
          Is this your shop?{" "}
          <a
            href={`${home}/dashboard/billing`}
            className="font-medium text-neutral-900 underline underline-offset-4"
          >
            Sign in
          </a>
        </p>
      </main>

      <footer className="px-5 py-6 text-center text-[12.5px] text-neutral-500 sm:px-8">
        Powered by{" "}
        <a href={home} className="font-medium text-neutral-900 underline underline-offset-4">
          PrimeCart
        </a>
      </footer>
    </div>
  );
}
