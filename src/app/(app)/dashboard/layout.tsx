import { redirect } from "next/navigation";

import Link from "next/link";

import { SideRail } from "@/components/dashboard/nocturne/side-rail";
import { getBillingState, type BillingState } from "@/lib/billing/state";
import { countOrdersNeedingAction } from "@/lib/dashboard/queries";
import { hasCompletedOnboarding, requireMerchant } from "@/lib/merchant/current";

/**
 * Merchant shell — Nocturne.
 *
 * Two columns: sticky side rail, then the section. The rail is a client
 * component because it owns the collapsed preference; everything it needs from
 * the server is passed in, so no data fetching crosses the boundary.
 *
 * `font-nk` scopes Inter to the dashboard. The marketing site and storefront
 * keep Archivo/Geist and their light palette.
 */
export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const merchant = await requireMerchant();

  // The merchant record exists from first sign-in; the storefront only after
  // onboarding. Guarding here covers every dashboard page at once.
  if (!hasCompletedOnboarding(merchant)) {
    redirect("/onboarding");
  }

  const ordersNeedingAction = await countOrdersNeedingAction(merchant.id);
  const billing = getBillingState(merchant);

  return (
    // `scheme-dark` is what makes native controls match the theme — file
    // inputs, colour pickers, scrollbars and focus rings are drawn by the
    // browser, not by our classes, and default to the light OS palette
    // otherwise. No amount of Tailwind on the elements themselves fixes it.
    <div className="font-nk scheme-dark flex min-h-full bg-nk-bg text-nk-text">
      <SideRail ordersNeedingAction={ordersNeedingAction} />

      <main className="flex min-w-0 flex-1 flex-col">
        <BillingBanner billing={billing} />
        {children}
      </main>
    </div>
  );
}

/**
 * D-18 — trial / renewal / expired banner on every dashboard page. Quiet
 * through most of the trial, more prominent in the last 3 days and once
 * lapsed. Nothing shows for an active plan with more than a week left.
 */
function BillingBanner({ billing }: { billing: BillingState }) {
  const days = `${billing.daysLeft} ${billing.daysLeft === 1 ? "day" : "days"}`;

  let message: string | null = null;
  let cta = "Choose a plan";
  let urgent = false;

  if (billing.status === "TRIAL") {
    message = `${days} left in your free trial`;
    urgent = billing.daysLeft <= 3;
  } else if (billing.status === "ACTIVE" && billing.endsAt && billing.daysLeft <= 7) {
    message = `Your plan ends in ${days}`;
    cta = "Renew";
    urgent = billing.daysLeft <= 3;
  } else if (billing.status === "LAPSED") {
    message = "Your plan has expired. Your shop is still online and taking orders";
    cta = "Renew to manage your shop";
    urgent = true;
  }

  if (!message) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-6 py-2.5 text-sm ${
        urgent
          ? "border-nk-accent-700 bg-nk-accent-900 text-nk-accent-100"
          : "border-nk-neutral-800 bg-nk-neutral-900 text-nk-neutral-300"
      }`}
    >
      <span>{message}</span>
      <Link
        href="/dashboard/billing"
        className={`font-medium underline underline-offset-4 ${
          urgent ? "text-nk-accent-200" : "text-nk-text"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
