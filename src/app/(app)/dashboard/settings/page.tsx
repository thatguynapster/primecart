import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
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
  SocialsForm,
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

          <SocialsForm
            facebookUrl={storefront.facebookUrl}
            instagramUrl={storefront.instagramUrl}
            whatsappNumber={storefront.whatsappNumber}
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

