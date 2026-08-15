import { getRootDomain } from "@/lib/domain";
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
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">
        Shop settings
      </h1>
      <p className="mt-2 text-[14px] text-neutral-600">
        How your shop looks to customers.
      </p>

      <div className="mt-8 space-y-6">
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
      </div>

      <p className="mt-6 text-[13px] text-neutral-500">
        Changes appear on your shop within a few minutes.
      </p>
    </main>
  );
}
