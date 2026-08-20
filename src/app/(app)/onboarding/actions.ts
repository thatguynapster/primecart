"use server";

import { redirect } from "next/navigation";

import { requireMerchant } from "@/lib/merchant/current";
import { invalidateStorefront } from "@/lib/merchant/lookup";
import { PaystackError, createSubaccount } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { checkSubdomainAvailable } from "@/lib/storefront/subdomain";

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/**
 * Completes merchant onboarding: claims a subdomain, creates the Paystack
 * subaccount, and switches the storefront on.
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
  const bankCode = String(formData.get("bankCode") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();

  const fieldErrors: Record<string, string> = {};

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

  if (!bankCode) {
    fieldErrors.bankCode = "Choose where you want to be paid.";
  }

  if (!accountNumber) {
    fieldErrors.accountNumber = "Enter your account or mobile money number.";
  } else if (!/^[0-9]{5,20}$/.test(accountNumber)) {
    fieldErrors.accountNumber = "Use digits only.";
  }

  // The `!subdomainCheck.ok` arm is what narrows the check to its success shape
  // for the rest of this function.
  if (Object.keys(fieldErrors).length > 0 || !subdomainCheck.ok) {
    return { fieldErrors };
  }

  const subdomain = subdomainCheck.value;

  // Paystack first. If this fails the merchant simply retries; the reverse
  // order would leave a live storefront that cannot take payment.
  let subaccountCode: string;
  try {
    const subaccount = await createSubaccount({
      businessName,
      bankCode,
      accountNumber,
    });
    subaccountCode = subaccount.subaccount_code;
  } catch (error) {
    if (error instanceof PaystackError) {
      // Paystack's own message names the real problem ("Account number is
      // invalid", "Settlement Bank is invalid"), but not reliably which field
      // it belongs to — so it is shown against the payout section rather than
      // pinned to the wrong input.
      return { error: `Paystack could not verify these details: ${error.message}` };
    }
    return {
      error:
        "Could not reach Paystack just now. Check your details and try again.",
    };
  }

  try {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        paystackSubaccountCode: subaccountCode,
        // Setting the whole composite works through Prisma Client; only
        // partial updates of a single embedded field require $runCommandRaw.
        storefront: {
          set: {
            subdomain,
            businessName,
            description: description || null,
            primaryColor,
            // Live immediately — storefronts are not manually reviewed. It is
            // only switched off if the subscription lapses.
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
