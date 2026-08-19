import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { UserButton } from "@clerk/nextjs";

import { btnPrimary, btnSecondary } from "@/components/dashboard/nocturne/ui";
import { ShopLink } from "@/components/dashboard/nocturne/shop-link";

/**
 * Sticky top bar: section title and subtitle on the left, tools on the right.
 *
 * Clerk's UserButton replaces the prototype's initials circle — it carries the
 * real session and the sign-out menu, which a static avatar would not.
 *
 * `shopUrl`/`shopLabel` are required (not optional) — every page that renders
 * TopBar has a completed storefront by the time it gets here (the dashboard
 * layout redirects anyone without one to onboarding first), so there is never
 * a real case with nothing to link.
 */
export function TopBar({
  title,
  subtitle,
  shopUrl,
  shopLabel,
}: {
  title: string;
  subtitle: string;
  shopUrl: string;
  shopLabel: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-nk-neutral-800 bg-nk-bg/90 px-6 py-3 backdrop-blur-md">
      <div className="min-w-0">
        <div className="truncate text-lg leading-tight font-medium tracking-tight">
          {title}
        </div>
        <div className="truncate text-xs text-nk-neutral-500">
          {subtitle}
        </div>
      </div>

      <div className="flex-1" />

      <label className="hidden w-75 items-center gap-2 rounded-md border border-nk-neutral-800 bg-nk-surface px-3 py-1.5 lg:flex">
        <MagnifyingGlass size={14} className="flex-none opacity-50" />
        <input
          placeholder="Search orders, products, customers"
          aria-label="Search"
          className="w-full border-0 bg-transparent text-xs text-nk-text outline-none placeholder:text-nk-neutral-600"
        />
      </label>

      <ShopLink shopUrl={shopUrl} label={shopLabel} />

      {/* <button type="button" className={btnSecondary("hidden sm:inline-flex")}>
        Last 30 days
      </button> */}

      <Link href="/dashboard/orders/new" className={btnPrimary()}>
        New order
      </Link>

      <div className="ml-1 flex items-center">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-7.5 ring-1 ring-nk-neutral-700",
            },
          }}
        />
      </div>
    </header>
  );
}
