import Link from "next/link";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import { Card } from "@/components/dashboard/nocturne/ui";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { daysUntil, isPast } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant/current";
import {
  getSubaccount,
  listGhanaianBanks,
  type PaystackSubaccountDetails,
} from "@/lib/paystack";
import { isImageUploadConfigured } from "@/lib/r2";
import {
  BannerForm,
  HeroForm,
  LogoForm,
  PayoutForm,
  ShopDetailsForm,
} from "./settings-forms";

export const metadata = {
  title: "Shop settings — PrimeCart",
};

export default async function SettingsPage() {
  const merchant = await requireMerchant();
  // The dashboard layout redirects anyone without a storefront to onboarding.
  const storefront = merchant.storefront!;

  const [banks, currentPayout] = await Promise.all([
    listGhanaianBanks(),
    getCurrentPayout(merchant.paystackSubaccountCode),
  ]);

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

          <PayoutForm
            banks={banks}
            hasSubaccount={Boolean(merchant.paystackSubaccountCode)}
            current={currentPayout}
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

/**
 * Best-effort fetch of the merchant's current payout account, so the Payout
 * details card can show what's on file. `null` both when nothing has ever
 * been set (a real "no subaccount yet" state — including a merchant
 * provisioned by a script rather than onboarding) and when Paystack simply
 * couldn't be reached just now — either way the form below still works,
 * since it doesn't need this value to submit a create-or-update.
 */
async function getCurrentPayout(
  subaccountCode: string | null
): Promise<PaystackSubaccountDetails | null> {
  if (!subaccountCode) return null;
  try {
    return await getSubaccount(subaccountCode);
  } catch (error) {
    console.error(`Could not fetch subaccount ${subaccountCode}:`, error);
    return null;
  }
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
