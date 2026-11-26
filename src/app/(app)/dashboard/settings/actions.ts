"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { LAPSED_MESSAGE, isLapsed, isLocked } from "@/lib/billing/state";
import { requireMerchant } from "@/lib/merchant/current";
import { invalidateStorefront } from "@/lib/merchant/lookup";
import { cleanReturnsPolicy } from "@/lib/merchant/returns-policy";
import {
  setStorefrontBannerImage,
  setStorefrontHeroImage,
  setStorefrontLogo,
  updateStorefrontBanner,
  updateStorefrontBranding,
  updateStorefrontHero,
  updateStorefrontReturnsPolicy,
  updateStorefrontSocials,
} from "@/lib/merchant/storefront";
import { parseDeliveryForm } from "@/lib/orders/delivery";
import { PaystackError, createSubaccount, updateSubaccount } from "@/lib/paystack";
import { GHANA_PHONE_ERROR, normalizeGhanaPhone } from "@/lib/phone";
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
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };
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
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };
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
  if (isLapsed(merchant)) return;
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
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };
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
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };
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
  if (isLapsed(merchant)) return;
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
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };
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
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };
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
  if (isLapsed(merchant)) return;
  const storefront = merchant.storefront;
  if (!storefront?.bannerImageUrl) return;

  await setStorefrontBannerImage(merchant.id, storefront.subdomain, null);
  await deleteImage(storefront.bannerImageUrl);

  revalidatePath("/dashboard/settings");
}

// ---------------------------------------------------------------------------
// Storefront checkout add-on (D-18a, D-18d)
// ---------------------------------------------------------------------------

function parsePayoutFields(formData: FormData):
  | { ok: true; bankCode: string; accountNumber: string }
  | { ok: false; fieldErrors: Record<string, string> } {
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
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, bankCode, accountNumber };
}

/**
 * Switches storefront checkout on. A merchant with a Paystack subaccount
 * already (including both pre-D-18 merchants) is switched on at once; one
 * without has to give payout details in the same form, and checkout is only
 * enabled after Paystack confirms the subaccount — never a live checkout
 * with nowhere to settle.
 *
 * Subaccounts are created with `percentage_charge: 0` (D-6), via the shared
 * `createSubaccount`. Existing orders are never touched.
 */
export async function enableStorefrontPayments(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  if (!merchant.paystackSubaccountCode) {
    const payout = parsePayoutFields(formData);
    if (!payout.ok) return { fieldErrors: payout.fieldErrors };

    try {
      const subaccount = await createSubaccount({
        businessName: storefront.businessName,
        bankCode: payout.bankCode,
        accountNumber: payout.accountNumber,
      });
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          paystackSubaccountCode: subaccount.subaccount_code,
          storefrontPaymentsEnabled: true,
        },
      });
    } catch (error) {
      if (error instanceof PaystackError) {
        return { error: `Paystack could not verify these details: ${error.message}` };
      }
      return {
        error: "Could not reach Paystack just now. Check your details and try again.",
      };
    }
  } else {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { storefrontPaymentsEnabled: true },
    });
  }

  // Labels on this instance's storefront update at once; other instances
  // within five minutes. Checkout itself always reads the flag fresh.
  invalidateStorefront(storefront.subdomain);
  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}

/** Switches storefront checkout off, immediately. Existing orders are untouched. */
export async function disableStorefrontPayments(): Promise<SettingsState> {
  const merchant = await requireMerchant();
  if (isLocked(merchant)) return { error: LAPSED_MESSAGE };
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { storefrontPaymentsEnabled: false },
  });

  invalidateStorefront(storefront.subdomain);
  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

/** Replaces the shop's whole list. Orders keep their own snapshot. */
export async function updateDelivery(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const ids = formData.getAll("areaId").map(String);
  const names = formData.getAll("areaName").map(String);
  // A row saved a moment ago still has no id in the open form. Matching by
  // name keeps its id, so a buyer mid-checkout isn't told it changed.
  const idByName = new Map(
    merchant.deliveryOptions.map((option) => [option.name.toLowerCase(), option.id])
  );
  const fees = formData.getAll("areaFee").map(String);

  const parsed = parseDeliveryForm(
    {
      areas: names.map((name, i) => ({
        id: ids[i] || (idByName.get(name.trim().toLowerCase()) ?? ""),
        name,
        fee: fees[i] ?? "",
      })),
      pickup: formData.get("pickup") === "on",
      pickupNote: String(formData.get("pickupNote") ?? ""),
      quote: formData.get("quote") === "on",
    },
    new Set(
      merchant.deliveryOptions
        .filter((option) => option.kind === "AREA")
        .map((option) => option.id)
    ),
    randomUUID
  );
  if (!parsed.ok) return { error: parsed.error };

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { deliveryOptions: { set: parsed.options } },
  });

  invalidateStorefront(storefront.subdomain);
  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}

// ---------------------------------------------------------------------------
// Payout details
// ---------------------------------------------------------------------------

/**
 * Adds or changes where storefront sales get paid out.
 *
 * `enableStorefrontPayments` above is the only other place that creates a
 * subaccount (onboarding no longer does, D-18d). This mirrors its validation
 * and its "Paystack first" ordering (never write a subaccount code the create call
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
  if (isLocked(merchant)) return { error: LAPSED_MESSAGE };
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const payout = parsePayoutFields(formData);
  if (!payout.ok) return { fieldErrors: payout.fieldErrors };
  const { bankCode, accountNumber } = payout;

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
export async function updateReturnsPolicy(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const result = cleanReturnsPolicy(formData.get("returnsPolicy"));
  if (!result.ok) return { error: result.error };

  await updateStorefrontReturnsPolicy(merchant.id, storefront.subdomain, result.policy);

  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}

export async function updateSocials(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const merchant = await requireMerchant();
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };
  const storefront = merchant.storefront;
  if (!storefront) return { error: "Finish setting up your shop first." };

  const facebookUrl = String(formData.get("facebookUrl") ?? "").trim();
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
  const rawWhatsapp = String(formData.get("whatsappNumber") ?? "").trim();
  const whatsappNumber = rawWhatsapp ? normalizeGhanaPhone(rawWhatsapp) : null;

  const fieldErrors: Record<string, string> = {};
  if (facebookUrl && !URL_LIKE.test(facebookUrl)) {
    fieldErrors.facebookUrl = "Enter a full link, starting with https://";
  }
  if (instagramUrl && !URL_LIKE.test(instagramUrl)) {
    fieldErrors.instagramUrl = "Enter a full link, starting with https://";
  }
  if (rawWhatsapp && !whatsappNumber) fieldErrors.whatsappNumber = GHANA_PHONE_ERROR;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await updateStorefrontSocials(merchant.id, storefront.subdomain, {
    facebookUrl: facebookUrl || null,
    instagramUrl: instagramUrl || null,
    whatsappNumber,
  });

  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}
