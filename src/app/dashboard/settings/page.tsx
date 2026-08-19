import Link from "next/link";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import { Card } from "@/components/dashboard/nocturne/ui";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { daysUntil, isPast } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant/current";
import { isImageUploadConfigured } from "@/lib/r2";
import { BannerForm, HeroForm, LogoForm, ShopDetailsForm } from "./settings-forms";

export const metadata = {
  title: "Shop settings — PrimeCart",
};

export default async function SettingsPage() {
  const merchant = await requireMerchant();
  // The dashboard layout redirects anyone without a storefront to onboarding.
  const storefront = merchant.storefront!;

  return (
    <>
      <TopBar
        title="Shop settings"
        subtitle="How your shop looks to customers"
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="space-y-6">
          <LogoForm
            logoUrl={storefront.logoUrl}
            businessName={storefront.businessName}
            configured={isImageUploadConfigured()}
          />

          <ShopDetailsForm
            businessName={storefront.businessName}
            description={storefront.description}
            primaryColor={storefront.primaryColor}
            shopUrl={`${storefront.subdomain}.${getRootDomain()}`}
          />

          <HeroForm
            headline={storefront.heroHeadline}
            subheading={storefront.heroSubheading}
            imageUrl={storefront.heroImageUrl}
            configured={isImageUploadConfigured()}
          />

          <BannerForm
            headline={storefront.bannerHeadline}
            subheading={storefront.bannerSubheading}
            imageUrl={storefront.bannerImageUrl}
            configured={isImageUploadConfigured()}
          />

          <BillingCard
            status={merchant.subscriptionStatus}
            trialExpiresAt={merchant.trialExpiresAt}
            renewsAt={merchant.subscriptionRenewsAt}
          />
        </div>

        <p className="mt-6 text-sm text-nk-neutral-500">
          Changes appear on your shop within a few minutes.
        </p>
      </main>
    </>
  );
}

/** How near an expiry/renewal date is before the card switches to the loud, bordered treatment. */
const WARNING_WINDOW_DAYS = 5;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" });
}

/** Task 13.12 — merchant-facing subscription status, alongside the sidebar's trial-only card. */
function BillingCard({
  status,
  trialExpiresAt,
  renewsAt,
}: {
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  trialExpiresAt: Date;
  /** Paystack's own next_payment_date, fetched after activation — null until a real subscription has one. */
  renewsAt: Date | null;
}) {
  const trialDaysLeft = daysUntil(trialExpiresAt);

  let detail: string;
  let urgent = false;
  let actionLabel: string | null = null;

  if (status === "TRIAL") {
    detail =
      trialDaysLeft === 0
        ? "Your free trial ends today. Subscribe now to keep your shop online."
        : `${trialDaysLeft} ${trialDaysLeft === 1 ? "day" : "days"} left on your free trial.`;
    urgent = trialDaysLeft <= WARNING_WINDOW_DAYS;
    actionLabel = "Subscribe now";
  } else if (status === "ACTIVE") {
    if (renewsAt) {
      const overdue = isPast(renewsAt);
      const renewalDaysLeft = daysUntil(renewsAt);
      detail = overdue
        ? `Your renewal payment was due ${formatDate(renewsAt)} and hasn't gone through yet — check your card on file before your shop goes offline.`
        : `Renews ${formatDate(renewsAt)}${
            renewalDaysLeft <= WARNING_WINDOW_DAYS
              ? ` — in ${renewalDaysLeft} ${renewalDaysLeft === 1 ? "day" : "days"}`
              : ""
          }.`;
      urgent = overdue || renewalDaysLeft <= WARNING_WINDOW_DAYS;
    } else {
      detail = "Your subscription is active.";
    }
  } else if (status === "EXPIRED") {
    detail = "Your subscription has lapsed. Your storefront is offline until you resubscribe.";
    urgent = true;
    actionLabel = "Reactivate my shop";
  } else {
    detail = "Your subscription was cancelled. Your storefront is offline until you resubscribe.";
    urgent = true;
    actionLabel = "Reactivate my shop";
  }

  return (
    <Card className="p-6">
      <h2 className="text-base font-medium tracking-tight text-nk-text">Billing</h2>

      {urgent ? (
        <div className="mt-3 rounded-md border border-nk-accent-700 bg-nk-accent-900 px-4 py-3">
          <p className="text-sm font-medium text-nk-accent-200">{detail}</p>
        </div>
      ) : (
        <p className="mt-1.5 text-sm text-nk-neutral-400">{detail}</p>
      )}

      {actionLabel && (
        <Link
          href="/billing"
          className="mt-4 inline-flex rounded-md border border-nk-accent bg-transparent px-4 py-2 text-sm font-medium text-nk-accent transition-colors hover:bg-nk-accent/12"
        >
          {actionLabel}
        </Link>
      )}
    </Card>
  );
}
