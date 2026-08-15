import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { getRootDomain } from "@/lib/domain";
import {
  hasCompletedOnboarding,
  requireMerchant,
} from "@/lib/merchant/current";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/settings", label: "Shop settings" },
];

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const merchant = await requireMerchant();

  // The merchant record exists from first sign-in; the storefront only after
  // onboarding. Guarding here covers every dashboard page at once.
  if (!hasCompletedOnboarding(merchant)) {
    redirect("/onboarding");
  }

  const shopUrl = `${merchant.storefront!.subdomain}.${getRootDomain()}`;

  return (
    <div className="min-h-full bg-[#F5F5F4] text-neutral-900">
      <header className="border-b border-neutral-200/70 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt=""
                width={24}
                height={24}
                className="rounded-[5px]"
              />
              <span className="font-display text-[16px] font-bold tracking-tight">
                PrimeCart
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-[13.5px] text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={`https://${shopUrl}`}
              target="_blank"
              rel="noreferrer"
              className="hidden font-mono text-[12.5px] text-neutral-500 hover:text-neutral-900 sm:block"
            >
              {shopUrl}
            </a>
            <UserButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
