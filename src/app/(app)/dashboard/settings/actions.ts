"use server";

import { revalidatePath } from "next/cache";

import { requireMerchant } from "@/lib/merchant/current";
import {
  setStorefrontBannerImage,
  setStorefrontHeroImage,
  setStorefrontLogo,
  updateStorefrontBanner,
  updateStorefrontBranding,
  updateStorefrontHero,
  updateStorefrontSocials,
} from "@/lib/merchant/storefront";
import { PaystackError, createSubaccount, updateSubaccount } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import {
  ImageUploadError,
  deleteImage,
  uploadMerchantBannerImage,
  uploadMerchantHeroImage,
  uploadMerchantLogo,
} from "@/lib/r2";

export type SettingsState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Changes value on each success, so the form can confirm and reset. */
  savedAt?: number;
};

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/**
 * Shop appearance: name, description, colour.
 *
 * The subdomain is deliberately not editable. It is a public address customers
 * may already have saved or shared, and changing it would silently break every
 * link the merchant has sent out.
 */
export async function updateShopDetails(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const businessName = String(formData.get("businessName") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!businessName) {
    fieldErrors.businessName = "Enter your shop name.";
  } else if (businessName.length > 100) {
    fieldErrors.businessName = "Use at most 100 characters.";
  }
  if (!HEX_COLOUR.test(primaryColor)) {
    fieldErrors.primaryColor = "Choose a colour.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await updateStorefrontBranding(merchant.id, storefront.subdomain, {
    businessName,
    description: description || null,
    primaryColor,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { savedAt: Date.now() };
}

export async function uploadLogo(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a logo first." };
  }

  let url: string;
  try {
    url = await uploadMerchantLogo({ merchantId: merchant.id, file });
  } catch (error) {
    if (error instanceof ImageUploadError) return { error: error.message };
    return { error: "Could not upload that logo. Try again." };
  }

  const previous = storefront.logoUrl;
  await setStorefrontLogo(merchant.id, storefront.subdomain, url);

  // Only after the new one is safely in place, so a failure never leaves the
  // shop with no logo at all.
  if (previous) await deleteImage(previous);

  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}

export async function removeLogo(): Promise<void> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront?.logoUrl) return;

  await setStorefrontLogo(merchant.id, storefront.subdomain, null);
  await deleteImage(storefront.logoUrl);

  revalidatePath("/dashboard/settings");
}

// ---------------------------------------------------------------------------
// Hero (Phase 14)
// ---------------------------------------------------------------------------

export async function updateHero(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const headline = String(formData.get("headline") ?? "").trim();
  const subheading = String(formData.get("subheading") ?? "").trim();

  await updateStorefrontHero(merchant.id, storefront.subdomain, {
    headline: headline || null,
    subheading: subheading || null,
  });

  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}

export async function uploadHeroImage(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first." };
  }

  let url: string;
  try {
    url = await uploadMerchantHeroImage({ merchantId: merchant.id, file });
  } catch (error) {
    if (error instanceof ImageUploadError) return { error: error.message };
    return { error: "Could not upload that image. Try again." };
  }

  const previous = storefront.heroImageUrl;
  await setStorefrontHeroImage(merchant.id, storefront.subdomain, url);
  if (previous) await deleteImage(previous);

  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}

export async function removeHeroImage(): Promise<void> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront?.heroImageUrl) return;

  await setStorefrontHeroImage(merchant.id, storefront.subdomain, null);
  await deleteImage(storefront.heroImageUrl);

  revalidatePath("/dashboard/settings");
}

// ---------------------------------------------------------------------------
// Mid-page banner (Phase 14)
// ---------------------------------------------------------------------------

export async function updateBanner(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const headline = String(formData.get("headline") ?? "").trim();
  const subheading = String(formData.get("subheading") ?? "").trim();

  await updateStorefrontBanner(merchant.id, storefront.subdomain, {
    headline: headline || null,
    subheading: subheading || null,
  });

  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}

export async function uploadBannerImage(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first." };
  }

  let url: string;
  try {
    url = await uploadMerchantBannerImage({ merchantId: merchant.id, file });
  } catch (error) {
    if (error instanceof ImageUploadError) return { error: error.message };
    return { error: "Could not upload that image. Try again." };
  }

  const previous = storefront.bannerImageUrl;
  await setStorefrontBannerImage(merchant.id, storefront.subdomain, url);
  if (previous) await deleteImage(previous);

  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}

export async function removeBannerImage(): Promise<void> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront?.bannerImageUrl) return;

  await setStorefrontBannerImage(merchant.id, storefront.subdomain, null);
  await deleteImage(storefront.bannerImageUrl);

  revalidatePath("/dashboard/settings");
}

// ---------------------------------------------------------------------------
// Payout details
// ---------------------------------------------------------------------------

/**
 * Adds or changes where storefront sales get paid out.
 *
 * The onboarding flow (`src/app/onboarding/actions.ts`) is the only other
 * place that ever creates a subaccount — this mirrors its validation and its
 * "Paystack first" ordering (never write a subaccount code the create call
 * didn't actually confirm), but branches into an update when one already
 * exists rather than always creating a new one. A merchant provisioned
 * without a subaccount at all (e.g. a database seeded directly rather than
 * through onboarding) lands in the create branch here, same as if they were
 * onboarding for the first time.
 */
export async function updatePayoutDetails(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const bankCode = String(formData.get("bankCode") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!bankCode) {
    fieldErrors.bankCode = "Choose where you want to be paid.";
  }
  if (!accountNumber) {
    fieldErrors.accountNumber = "Enter your account or mobile money number.";
  } else if (!/^[0-9]{5,20}$/.test(accountNumber)) {
    fieldErrors.accountNumber = "Use digits only.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    if (merchant.paystackSubaccountCode) {
      await updateSubaccount(merchant.paystackSubaccountCode, {
        businessName: storefront.businessName,
        bankCode,
        accountNumber,
      });
    } else {
      const subaccount = await createSubaccount({
        businessName: storefront.businessName,
        bankCode,
        accountNumber,
      });
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { paystackSubaccountCode: subaccount.subaccount_code },
      });
    }
  } catch (error) {
    if (error instanceof PaystackError) {
      return { error: `Paystack could not verify these details: ${error.message}` };
    }
    return {
      error: "Could not reach Paystack just now. Check your details and try again.",
    };
  }

  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}

// ---------------------------------------------------------------------------
// Socials (14.20)
// ---------------------------------------------------------------------------

const URL_LIKE = /^https?:\/\/.+/i;
const WHATSAPP_NUMBER = /^\+?[0-9]{7,15}$/;

export async function updateSocials(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const facebookUrl = String(formData.get("facebookUrl") ?? "").trim();
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
  const whatsappNumber = String(formData.get("whatsappNumber") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (facebookUrl && !URL_LIKE.test(facebookUrl)) {
    fieldErrors.facebookUrl = "Enter a full link, starting with https://";
  }
  if (instagramUrl && !URL_LIKE.test(instagramUrl)) {
    fieldErrors.instagramUrl = "Enter a full link, starting with https://";
  }
  if (whatsappNumber && !WHATSAPP_NUMBER.test(whatsappNumber)) {
    fieldErrors.whatsappNumber = "Enter digits only, with an optional leading +.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await updateStorefrontSocials(merchant.id, storefront.subdomain, {
    facebookUrl: facebookUrl || null,
    instagramUrl: instagramUrl || null,
    whatsappNumber: whatsappNumber || null,
  });

  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}
