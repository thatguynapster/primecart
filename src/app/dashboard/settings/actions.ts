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
} from "@/lib/merchant/storefront";
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
