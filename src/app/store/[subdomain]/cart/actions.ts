"use server";

import { findOrCreateCustomer } from "@/lib/customers/find-or-create";
import { getStorefrontOrigin } from "@/lib/domain";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { expireOrder } from "@/lib/orders/expire";
import { OversellError, reserveStock, restoreStock } from "@/lib/orders/stock";
import { initializeTransaction, PaystackError } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

/**
 * Storefront checkout.
 *
 * Called directly from the cart page's client component — not bound to a
 * `<form action>`, since the payload is structured cart data rather than a
 * flat FormData — the same pattern the dashboard already uses for actions
 * like `removeLogo()`.
 *
 * Nothing from the client is trusted except *which* products and quantities
 * were chosen. Price, name, SKU and stock are all re-read from the live
 * catalogue here — the cart's own copies are for display only.
 */

export type CheckoutLine = {
  productId: string;
  variantId: string;
  quantity: number;
};

export type CheckoutInput = {
  lines: CheckoutLine[];
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region?: string;
  notes?: string;
};

export type CheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

const RESERVATION_MINUTES = 30;

export async function checkout(
  subdomain: string,
  input: CheckoutInput
): Promise<CheckoutResult> {
  // ---- validation ---------------------------------------------------------
  if (input.lines.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      return { ok: false, error: "Invalid quantity in cart." };
    }
  }

  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const city = input.city.trim();
  const region = input.region?.trim() || null;
  const notes = input.notes?.trim() || null;

  if (!name || !email || !phone || !address || !city) {
    return {
      ok: false,
      error: "Fill in your name, email, phone, address and city.",
    };
  }

  // ---- merchant -------------------------------------------------------------
  const storefront = await getMerchantBySubdomain(subdomain);
  if (!storefront || !storefront.isActive) {
    return { ok: false, error: "This store is not accepting orders right now." };
  }

  // Fresh, not the 5-minute cache — this is the payment-critical value, read
  // once per checkout rather than on every storefront page view.
  const merchant = await prisma.merchant.findUnique({
    where: { id: storefront.id },
    select: { id: true, paystackSubaccountCode: true },
  });
  if (!merchant?.paystackSubaccountCode) {
    return { ok: false, error: "This store cannot accept payments yet." };
  }
  const merchantId = merchant.id;

  // ---- re-derive every line from the live catalogue --------------------------
  const productIds = [...new Set(input.lines.map((line) => line.productId))];
  const products = await prisma.product.findMany({
    where: { merchantId, id: { in: productIds }, isActive: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  const matched: {
    productId: string;
    variantId: string;
    quantity: number;
    productName: string;
    variantName: string;
    sku: string | null;
    price: number;
  }[] = [];

  for (const line of input.lines) {
    const product = productById.get(line.productId);
    const variant = product?.variants.find(
      (candidate) => candidate.id === line.variantId && candidate.isActive
    );
    if (!product || !variant) {
      return {
        ok: false,
        error: "One of the items in your cart is no longer available.",
      };
    }
    matched.push({
      productId: product.id,
      variantId: variant.id,
      quantity: line.quantity,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      price: variant.price,
    });
  }

  // ---- reserve stock: all lines or none --------------------------------------
  try {
    await reserveStock(merchantId, matched);
  } catch (error) {
    if (error instanceof OversellError) return { ok: false, error: error.message };
    throw error;
  }

  // ---- customer + order -------------------------------------------------------
  const lineItems = matched.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    productName: line.productName,
    variantName: line.variantName,
    sku: line.sku,
    price: line.price,
    quantity: line.quantity,
    subtotal: line.price * line.quantity,
  }));
  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);

  let orderId: string;
  try {
    const customer = await findOrCreateCustomer(merchantId, { name, email, phone });

    const order = await prisma.order.create({
      data: {
        merchantId,
        customerId: customer.id,
        orderNumber: generateOrderNumber(),
        status: "PENDING",
        source: "STOREFRONT",
        paymentStatus: "UNPAID",
        subtotal,
        total: subtotal, // MVP has no delivery fee or discount to add on top.
        lineItems,
        shippingAddress: { name, phone, address, city, region },
        reservedUntil: new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000),
        notes,
      },
    });
    orderId = order.id;
  } catch (error) {
    // The order never reached the database, so nothing will expire it later —
    // the reservation this call made has to be released by hand.
    await restoreStock(merchantId, matched).catch(() => {});
    throw error;
  }

  // ---- Paystack -----------------------------------------------------------
  const reference = `PCART-${orderId}`;

  try {
    const transaction = await initializeTransaction({
      email,
      amountInPesewas: Math.round(subtotal * 100),
      subaccount: merchant.paystackSubaccountCode,
      reference,
      callbackUrl: `${getStorefrontOrigin(subdomain)}/orders/${orderId}`,
      metadata: { orderId, merchantId },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentRef: reference },
    });

    return { ok: true, redirectUrl: transaction.authorization_url };
  } catch (error) {
    // Paystack could not be reached, or rejected the request. The reservation
    // will never be completed by a payment that was never started — that is
    // the same outcome as one that timed out, so it gets the same treatment:
    // release the stock and mark the order EXPIRED, right now rather than in
    // 30 minutes.
    await expireOrder(orderId).catch(() => {});

    if (error instanceof PaystackError) {
      return {
        ok: false,
        error: "We could not start payment for this order. Please try again.",
      };
    }
    throw error;
  }
}
