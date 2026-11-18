"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { nextPeriodStart, parseInterval, pricePesewas } from "@/lib/billing/plans";
import {
  merchantIdOfReference,
  subscriptionReference,
  verifyAndApplySubscriptionPayment,
  type ApplyOutcome,
} from "@/lib/billing/subscription";
import { getDashboardOrigin } from "@/lib/domain";
import { requireMerchant } from "@/lib/merchant/current";
import { PaystackError, initializeSubscriptionTransaction } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

export type BillingFormState = { error?: string };

/**
 * Starts a prepaid subscription payment (D-18). Works while lapsed: the
 * lapsed-dashboard gate exempts billing.
 *
 * The client names an interval and nothing else. Period start and price are
 * computed here from the merchant's own record, through the same
 * `nextPeriodStart`/`pricePesewas` the apply step re-checks against, so the
 * two can't disagree. The quote travels in Paystack metadata and is verified
 * again when the payment is applied.
 */
export async function startSubscriptionPayment(
  _prev: BillingFormState,
  formData: FormData
): Promise<BillingFormState> {
  const merchant = await requireMerchant();

  const interval = parseInterval(formData.get("interval"));
  if (!interval) return { error: "Choose monthly, quarterly or yearly." };

  const now = new Date();
  const periodStart = nextPeriodStart(merchant, now);
  const amount = pricePesewas(merchant, interval, periodStart);
  const reference = subscriptionReference(merchant.id, now);

  await prisma.subscriptionPayment.create({
    data: {
      merchantId: merchant.id,
      reference,
      interval,
      amount: amount / 100,
      quotedPeriodStart: periodStart,
      status: "PENDING",
    },
  });

  let authorizationUrl: string;
  try {
    const transaction = await initializeSubscriptionTransaction({
      email: merchant.email,
      amountInPesewas: amount,
      reference,
      callbackUrl: `${getDashboardOrigin()}/dashboard/billing?ref=${reference}`,
      metadata: {
        type: "subscription",
        merchantId: merchant.id,
        interval,
        quotedPesewas: amount,
        periodStart: periodStart.toISOString(),
      },
    });
    authorizationUrl = transaction.authorization_url;
  } catch (error) {
    await prisma.subscriptionPayment.updateMany({
      where: { reference, status: "PENDING" },
      data: { status: "FAILED" },
    });
    if (error instanceof PaystackError) {
      return { error: "We couldn't start the payment just now. Please try again." };
    }
    throw error;
  }

  // Preselects the same option next time.
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { billingInterval: interval },
  });

  redirect(authorizationUrl);
}

/**
 * "Check payment" beside a payment still showing pending: for a merchant who
 * paid but closed the tab before coming back. Same verify-and-apply as the
 * webhook. Only ever for the signed-in merchant's own references.
 */
export async function checkSubscriptionPayment(reference: string): Promise<ApplyOutcome> {
  const merchant = await requireMerchant();
  if (merchantIdOfReference(reference) !== merchant.id) return "unknown";

  const outcome = await verifyAndApplySubscriptionPayment(reference);
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard", "layout");
  return outcome;
}
