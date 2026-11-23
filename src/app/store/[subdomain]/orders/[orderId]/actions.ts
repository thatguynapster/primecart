"use server";

import { redirect } from "next/navigation";

import { getStorefrontOrigin } from "@/lib/domain";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { initializeTransaction, PaystackError } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { withinLimit } from "@/lib/rate-limit";

export type PayNowState = { error?: string };

/**
 * T10 — "Pay now" on the storefront order page: a fresh Paystack link for a
 * checkout-on order whose 24-hour stock hold is still running.
 *
 * Each attempt gets its own reference, `PCART-<orderId>-<timestamp>`, since
 * Paystack references are single-use. paymentRef is overwritten with the
 * newest one; the webhook still settles a payment made on an older link by
 * recovering the order id from the reference.
 *
 * Same amount, subaccount and 3% `transaction_charge` as the original
 * checkout: `initializeTransaction` computes the fee itself from the amount,
 * and the amount is the order's own snapshot total, never a client value.
 */
export async function startOrderPayment(
  subdomain: string,
  orderId: string
): Promise<PayNowState> {
  const storefront = await getMerchantBySubdomain(subdomain);
  if (!storefront) return { error: "This store could not be found." };

  const order = await prisma.order.findFirst({
    where: { merchantId: storefront.id, id: orderId },
    include: { customer: true },
  });
  if (!order) return { error: "This order could not be found." };

  const payable =
    order.status === "PENDING" &&
    order.paymentStatus === "UNPAID" &&
    order.stockReserved === true &&
    order.paymentMethod === "PAYSTACK" &&
    order.reservedUntil != null &&
    order.reservedUntil.getTime() > Date.now();
  if (!payable) {
    return { error: "This order can no longer be paid online. Refresh the page." };
  }

  const allowed = await withinLimit({
    name: "pay-now",
    identifier: order.id,
    limit: 10,
    windowMinutes: 60,
  });
  if (!allowed) {
    return { error: "Too many payment attempts. Please wait a while and try again." };
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: storefront.id },
    select: { paystackSubaccountCode: true },
  });
  const email = order.customer?.email;
  if (!merchant?.paystackSubaccountCode || !email) {
    return { error: "This store cannot take payment right now. Please contact the seller." };
  }

  const reference = `PCART-${order.id}-${Date.now()}`;
  let authorizationUrl: string;
  try {
    const transaction = await initializeTransaction({
      email,
      amountInPesewas: Math.round(order.total * 100),
      subaccount: merchant.paystackSubaccountCode,
      reference,
      callbackUrl: `${getStorefrontOrigin(subdomain)}/orders/${order.id}`,
      metadata: { orderId: order.id, merchantId: storefront.id },
    });
    authorizationUrl = transaction.authorization_url;
  } catch (error) {
    if (error instanceof PaystackError) {
      return { error: "We could not start payment just now. Please try again." };
    }
    throw error;
  }

  const { count } = await prisma.order.updateMany({
    where: { id: order.id, status: "PENDING", paymentStatus: "UNPAID" },
    data: { paymentRef: reference },
  });
  if (count === 0) {
    return { error: "This order was just updated. Refresh the page." };
  }

  redirect(authorizationUrl);
}
