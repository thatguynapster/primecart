"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChartBar,
  CreditCard,
  DotsThree,
  Gear,
  House,
  Package,
  Receipt,
  Users,
} from "@phosphor-icons/react";

const TABS = [
  { href: "/dashboard", label: "Overview", icon: House },
  { href: "/dashboard/orders", label: "Orders", icon: Receipt },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
];

const MORE = [
  { href: "/dashboard/analytics", label: "Analytics", icon: ChartBar },
  { href: "/dashboard/settings", label: "Shop settings", icon: Gear },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

/** Phones only: a bottom tab bar in place of the side rail. */
export function MobileNav({ ordersNeedingAction }: { ordersNeedingAction: number }) {
  const pathname = usePathname();
  // Remembers the page it was opened on, so navigating away closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  const moreActive = open || MORE.some((item) => isActive(item.href));

  const tabClass = (active: boolean) =>
    `relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-xs ${
      active ? "text-nk-accent-300" : "text-nk-neutral-400"
    }`;

  return (
    <div className="md:hidden">
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpenOn(null)}
          className="fixed inset-0 z-30 bg-nk-bg/60"
        />
      )}

      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-nk-neutral-800 bg-nk-neutral-900 pb-[env(safe-area-inset-bottom)]"
      >
        {open && (
          <div
            id="mobile-nav-more"
            className="flex flex-col border-b border-nk-neutral-800 p-2"
          >
            {MORE.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpenOn(null)}
                aria-current={isActive(href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm ${
                  isActive(href)
                    ? "bg-nk-accent-900 text-nk-accent-200"
                    : "text-nk-neutral-300"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={tabClass(active)}
              >
                <Icon size={20} weight={active ? "fill" : "regular"} />
                <span className="truncate">{label}</span>
                {href === "/dashboard/orders" && ordersNeedingAction > 0 && (
                  <span className="absolute top-1 left-1/2 ml-2 rounded-full bg-nk-accent-700 px-1.5 text-[10px] leading-4 text-nk-accent-100">
                    {ordersNeedingAction > 99 ? "99+" : ordersNeedingAction}
                    <span className="sr-only"> to act on</span>
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpenOn(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="mobile-nav-more"
            className={tabClass(moreActive)}
          >
            <DotsThree size={20} weight="bold" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
