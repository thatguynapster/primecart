import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { requireDashboardMerchant } from "@/lib/billing/gate";
import {
  getSubaccount,
  listGhanaianBanks,
  type PaystackSubaccountDetails,
} from "@/lib/paystack";
import { isImageUploadConfigured } from "@/lib/r2";
import { DeliveryForm } from "./delivery-form";
import {
  BannerForm,
  CheckoutAddonForm,
  HeroForm,
  LogoForm,
  PayoutForm,
  ReturnsPolicyForm,
  ShopDetailsForm,
  SocialsForm,
} from "./settings-forms";

export const metadata = {
  title: "Shop settings — PrimeCart",
};

export default async function SettingsPage() {
  const merchant = await requireDashboardMerchant();
  // The dashboard layout redirects anyone without a storefront to onboarding.
  const storefront = merchant.storefront!;

  const [banks, currentPayout] = await Promise.all([
    // Best-effort: a Paystack blip must not take the whole settings page down.
    listGhanaianBanks().catch((error: unknown) => {
      console.error("Could not load the bank list from Paystack:", error);
      return [];
    }),
    getCurrentPayout(merchant.paystackSubaccountCode),
  ]);
  const hasSubaccount = Boolean(merchant.paystackSubaccountCode);

  return (
    <>
      <TopBar
        title="Shop settings"
        subtitle="How your shop looks to customers"
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
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

          <CheckoutAddonForm
            enabled={merchant.storefrontPaymentsEnabled === true}
            hasSubaccount={hasSubaccount}
            banks={banks}
          />

          {/* Payout details only matter once there's a subaccount; before
              that, the checkout card above collects them as it switches on. */}
          {hasSubaccount && (
            <PayoutForm banks={banks} hasSubaccount current={currentPayout} />
          )}

          <DeliveryForm options={merchant.deliveryOptions} />

          <ReturnsPolicyForm policy={storefront.returnsPolicy} />

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

