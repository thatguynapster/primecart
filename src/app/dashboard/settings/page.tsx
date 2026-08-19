import Link from "next/link";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import { Card } from "@/components/dashboard/nocturne/ui";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { daysUntil } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant/current";
import { isImageUploadConfigured } from "@/lib/r2";
import { LogoForm, ShopDetailsForm } from "./settings-forms";

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

          <BillingCard
            status={merchant.subscriptionStatus}
            trialExpiresAt={merchant.trialExpiresAt}
          />
        </div>

        <p className="mt-6 text-sm text-nk-neutral-500">
          Changes appear on your shop within a few minutes.
        </p>
      </main>
    </>
  );
}

/** Task 13.12 — merchant-facing subscription status, alongside the sidebar's trial-only card. */
function BillingCard({
  status,
  trialExpiresAt,
}: {
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  trialExpiresAt: Date;
}) {
  const daysLeft = daysUntil(trialExpiresAt);

  const detail =
    status === "ACTIVE"
      ? "Your subscription is active."
      : status === "EXPIRED"
        ? "Your subscription has lapsed. Your storefront is offline until you resubscribe."
        : daysLeft === 0
          ? "Your free trial ends today."
          : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left on your free trial.`;

  return (
    <Card className="p-6">
      <h2 className="text-base font-medium tracking-tight text-nk-text">Billing</h2>
      <p className="mt-1.5 text-sm text-nk-neutral-400">{detail}</p>
      {status !== "ACTIVE" && (
        <Link
          href="/billing"
          className="mt-4 inline-flex rounded-md border border-nk-accent bg-transparent px-4 py-2 text-sm font-medium text-nk-accent transition-colors hover:bg-nk-accent/12"
        >
          {status === "EXPIRED" ? "Reactivate my shop" : "Subscribe now"}
        </Link>
      )}
    </Card>
  );
}
