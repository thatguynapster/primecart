import { redirect } from "next/navigation";

import { SideRail } from "@/components/dashboard/nocturne/side-rail";
import { daysUntil } from "@/lib/format";
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
  const trialDaysLeft = daysUntil(merchant.trialExpiresAt);

  return (
    // `scheme-dark` is what makes native controls match the theme — file
    // inputs, colour pickers, scrollbars and focus rings are drawn by the
    // browser, not by our classes, and default to the light OS palette
    // otherwise. No amount of Tailwind on the elements themselves fixes it.
    <div className="font-nk scheme-dark flex min-h-full bg-nk-bg text-nk-text">
      <SideRail
        ordersNeedingAction={ordersNeedingAction}
        trialDaysLeft={trialDaysLeft}
        showTrialCard={merchant.subscriptionStatus === "TRIAL"}
      />

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
