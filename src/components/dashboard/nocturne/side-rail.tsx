"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CaretLeft,
  CaretRight,
  ChartBar,
  Gear,
  House,
  Package,
  Receipt,
  Users,
  type Icon,
} from "@phosphor-icons/react";

import { btnPrimary } from "@/components/dashboard/nocturne/ui";
import {
  setRailCollapsed,
  useRailCollapsed,
} from "@/lib/dashboard/rail-preference";

type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  /** Rendered as a count badge — orders needing action. */
  badge?: number;
};

/**
 * The merchant shell's side rail.
 *
 * Expanded 216px, collapsed 64px. The collapsed flag is persisted so it
 * survives navigation, per the handoff — but it is read after mount rather
 * than during render, since localStorage does not exist on the server.
 */
export function SideRail({
  ordersNeedingAction,
  trialDaysLeft,
  showTrialCard,
}: {
  ordersNeedingAction: number;
  trialDaysLeft: number;
  showTrialCard: boolean;
}) {
  const pathname = usePathname();
  const collapsed = useRailCollapsed();

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: House },
    {
      href: "/dashboard/orders",
      label: "Orders",
      icon: Receipt,
      badge: ordersNeedingAction,
    },
    { href: "/dashboard/products", label: "Products", icon: Package },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
    { href: "/dashboard/analytics", label: "Analytics", icon: ChartBar },
    { href: "/dashboard/settings", label: "Shop settings", icon: Gear },
  ];

  const expanded = !collapsed;

  return (
    <aside
      style={{ width: collapsed ? 64 : 216 }}
      className="sticky top-0 flex h-screen flex-none flex-col gap-4.5 overflow-hidden border-r border-nk-neutral-800 bg-nk-neutral-900 px-2.5 py-4 transition-[width] duration-150 ease-out"
    >
      <div className="flex items-center gap-2.5 px-2 py-1">
        <span className="grid size-6.5 flex-none place-items-center rounded-lg border border-nk-accent text-sm font-semibold text-nk-accent-300">
          P
        </span>
        {expanded && (
          <span className="text-base font-medium tracking-tight whitespace-nowrap">
            PrimeCart
          </span>
        )}
      </div>

      <nav className="flex flex-col gap-0.5">
        {nav.map((item) => {
          // `/dashboard` would otherwise match every child route.
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={`flex w-full items-center gap-2.75 rounded-md px-2.5 py-2 text-sm whitespace-nowrap transition-colors ${active
                ? "bg-nk-accent-900 text-nk-accent-200 shadow-[inset_2px_0_0_0_var(--color-nk-accent)]"
                : "text-nk-neutral-400 hover:bg-nk-accent-900/50"
                }`}
            >
              <span className="grid w-4.25 flex-none place-items-center">
                <Icon size={17} weight={active ? "fill" : "regular"} />
              </span>
              {expanded && <span>{item.label}</span>}
              {expanded && item.badge ? (
                <span className="ml-auto rounded-lg border border-nk-accent-700 px-1.5 text-xs text-nk-accent-300">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-2">
        {expanded && showTrialCard && (
          <div className="rounded-md border border-nk-neutral-800 p-2.75">
            <div className="mb-1.25 text-xs font-medium tracking-widest text-nk-neutral-500 uppercase">
              Trial
            </div>
            <div className="mb-2.5 text-xs text-nk-neutral-300">
              {trialDaysLeft === 0
                ? "Your free trial has ended."
                : `${trialDaysLeft} ${trialDaysLeft === 1 ? "day" : "days"} left on your free trial.`}
            </div>
            <Link href="/billing" className={btnPrimary("w-full")}>
              Subscribe
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setRailCollapsed(!collapsed)}
          title={collapsed ? "Expand panel" : "Collapse panel"}
          aria-expanded={expanded}
          className="flex cursor-pointer items-center gap-2.75 rounded-md px-2.5 py-2 text-xs text-nk-neutral-500 whitespace-nowrap transition-colors hover:bg-nk-accent-900/50"
        >
          <span className="grid w-4.25 flex-none place-items-center">
            {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
          </span>
          {expanded && <span>Collapse panel</span>}
        </button>
      </div>
    </aside>
  );
}
