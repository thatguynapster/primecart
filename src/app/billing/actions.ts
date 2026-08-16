"use server";

import { randomUUID } from "node:crypto";

import { getDashboardOrigin } from "@/lib/domain";
import { requireMerchant } from "@/lib/merchant/current";
import { PaystackError, initializePlanTransaction } from "@/lib/paystack";

export type StartCheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

/**
 * Starts a PrimeCart subscription payment (13.5).
 *
 * Charges the merchant's own account, not a storefront sale — no subaccount,
 * no per-transaction fee, unlike `checkout()` in the storefront cart. The
 * merchant is taken from the Clerk session, never a form field, so this can
 * only ever start a payment for the signed-in merchant's own account.
 */
export async function startSubscriptionCheckout(): Promise<StartCheckoutResult> {
  const merchant = await requireMerchant();

  const planCode = process.env.PAYSTACK_PLAN_CODE;
  if (!planCode) {
    return { ok: false, error: "Subscriptions are not configured yet. Try again shortly." };
  }

  try {
    const transaction = await initializePlanTransaction({
      email: merchant.email,
      planCode,
      reference: `sub_${merchant.id}_${randomUUID()}`,
      callbackUrl: `${getDashboardOrigin()}/billing/callback`,
      metadata: { merchantId: merchant.id, purpose: "subscription" },
    });

    return { ok: true, redirectUrl: transaction.authorization_url };
  } catch (error) {
    if (error instanceof PaystackError) return { ok: false, error: error.message };
    return { ok: false, error: "Could not start checkout just now. Please try again." };
  }
}
