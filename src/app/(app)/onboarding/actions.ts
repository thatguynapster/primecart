"use server";

import { redirect } from "next/navigation";

import { TRIAL_DAYS, addDays } from "@/lib/billing/plans";
import { requireMerchant } from "@/lib/merchant/current";
import { invalidateStorefront } from "@/lib/merchant/lookup";
import { GHANA_PHONE_ERROR, normalizeGhanaPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { checkSubdomainAvailable } from "@/lib/storefront/subdomain";

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/**
 * Completes merchant onboarding: claims a subdomain, starts the 14-day free
 * trial, and switches the storefront on.
 *
 * No payout details here any more (D-18d): checkout is an opt-in add-on that
 * starts off, and the Paystack subaccount is created only when the merchant
 * switches it on in settings.
 *
 * The merchant is taken from the Clerk session, never from the form — a
 * merchantId submitted by the client would let one merchant write to another's
 * record (task 3.12).
 */
export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const merchant = await requireMerchant();

  const businessName = String(formData.get("businessName") ?? "").trim();
  const subdomainRaw = String(formData.get("subdomain") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "#000000").trim();

  // Shoppers message this number about their orders, so the shop can't open
  // without one.
  const whatsappNumber = normalizeGhanaPhone(
    String(formData.get("whatsappNumber") ?? "")
  );

  const fieldErrors: Record<string, string> = {};
  if (!whatsappNumber) fieldErrors.whatsappNumber = GHANA_PHONE_ERROR;

  if (!businessName) {
    fieldErrors.businessName = "Enter your business name.";
  } else if (businessName.length > 100) {
    fieldErrors.businessName = "Use at most 100 characters.";
  }

  const subdomainCheck = await checkSubdomainAvailable(subdomainRaw);
  if (!subdomainCheck.ok) {
    fieldErrors.subdomain = subdomainCheck.reason;
  }

  if (!HEX_COLOUR.test(primaryColor)) {
    fieldErrors.primaryColor = "Choose a colour.";
  }

  // The `!subdomainCheck.ok` arm is what narrows the check to its success shape
  // for the rest of this function.
  if (Object.keys(fieldErrors).length > 0 || !subdomainCheck.ok) {
    return { fieldErrors };
  }

  const subdomain = subdomainCheck.value;

  // D-18: the trial is set once. A merchant who somehow onboards again (or
  // was already given a trial by the deploy backfill) keeps the dates they
  // have, and a founding plan is never downgraded to STANDARD here.
  const now = new Date();
  const subscription = {
    ...(merchant.plan == null && { plan: "STANDARD" }),
    // Keyed on the date, not the status: a stale Phase 13 status (13–24 Aug
    // 2026 sign-ups) must not stop the trial from starting.
    ...(merchant.trialEndsAt == null &&
      merchant.currentPeriodEnd == null && {
        subscriptionStatus: "TRIAL",
        trialEndsAt: addDays(now, TRIAL_DAYS),
      }),
    ...(merchant.storefrontPaymentsEnabled == null && {
      storefrontPaymentsEnabled: false,
    }),
  };

  try {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        ...subscription,
        // Setting the whole composite works through Prisma Client; only
        // partial updates of a single embedded field require $runCommandRaw.
        storefront: {
          set: {
            subdomain,
            businessName,
            description: description || null,
            primaryColor,
            whatsappNumber,
            // Live immediately — storefronts are not manually reviewed, and a
            // lapse never changes it: D-24 only stops new orders.
            isActive: true,
          },
        },
      },
    });
  } catch {
    // The unique index on storefront.subdomain is the real guard; another
    // merchant can claim the address between the check above and this write.
    return {
      fieldErrors: {
        subdomain: "That address was just taken. Try another one.",
      },
    };
  }

  // The proxy caches subdomain lookups for five minutes, including misses —
  // without this the new shop 404s for up to five minutes (task 3.11).
  invalidateStorefront(subdomain);

  redirect("/dashboard");
}

/** Live availability check for the address field. */
export async function checkSubdomain(
  raw: string
): Promise<{ ok: boolean; reason?: string }> {
  // Guard even a read: this probes which shop names exist.
  await requireMerchant();

  const result = await checkSubdomainAvailable(raw);
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}
