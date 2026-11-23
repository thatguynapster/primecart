"use server";

import { STOREFRONT_PAYMENT_HOLD_HOURS } from "@/lib/billing/plans";
import { findOrCreateCustomer } from "@/lib/customers/find-or-create";
import { getStorefrontOrigin } from "@/lib/domain";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { notifyBuyerOrderReceived, notifyNewOrder } from "@/lib/notifications/events";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { validateCustomization } from "@/lib/products/customization";
import { expireOrder } from "@/lib/orders/expire";
import {
  OversellError,
  checkStockAvailable,
  reserveStock,
  restoreStock,
} from "@/lib/orders/stock";
import {
  initializeTransaction,
  PaystackError,
  storefrontFeePesewas,
} from "@/lib/paystack";
import { GHANA_PHONE_ERROR, normalizeGhanaPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

/**
 * Storefront checkout — two paths since D-18a.
 *
 * Checkout ON (merchant opted in): today's Paystack flow. Stock is reserved
 * at order time and held 24 hours for payment (D-18c); unpaid orders expire
 * via the cron. 3% platform fee, uncapped (D-18b).
 *
 * Checkout OFF (the default): the order is placed unpaid with no payment
 * step. Stock is checked but NOT taken (it's taken when the merchant confirms
 * or marks it paid), no platform fee, and the merchant is emailed at once to
 * arrange payment with the buyer on WhatsApp.
 *
 * Which path applies is read fresh from the database here, never from the
 * client. The cart only uses it for button labels.
 *
 * Called directly from the cart page's client component — not bound to a
 * `<form action>`, since the payload is structured cart data rather than a
 * flat FormData.
 *
 * Nothing from the client is trusted except *which* products and quantities
 * were chosen. Price, name, SKU and stock are all re-read from the live
 * catalogue here; the cart's own copies are for display only.
 */

export type CheckoutLine = {
  productId: string;
  variantId: string;
  quantity: number;
  /** DEV-7. Free text for a product that allows personalisation. */
  customization?: string | null;
};

export type CheckoutInput = {
  lines: CheckoutLine[];
  name: string;
  email: string;
  /** Buyer's WhatsApp number (D-18e). Normalised to +233XXXXXXXXX here. */
  phone: string;
  address: string;
  city: string;
  region?: string;
  notes?: string;
};

export type CheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

const HOLD_MS = STOREFRONT_PAYMENT_HOLD_HOURS * 60 * 60 * 1000;

export async function checkout(
  subdomain: string,
  input: CheckoutInput
): Promise<CheckoutResult> {
  // ---- validation ---------------------------------------------------------
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      return { ok: false, error: "Invalid quantity in cart." };
    }
  }

  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim();
  const rawPhone = String(input.phone ?? "").trim();
  const address = String(input.address ?? "").trim();
  const city = String(input.city ?? "").trim();
  const region = input.region?.trim() || null;
  const notes = input.notes?.trim() || null;

  if (!name || !email || !rawPhone || !address || !city) {
    return {
      ok: false,
      error: "Fill in your name, email, WhatsApp number, address and city.",
    };
  }

  const phone = normalizeGhanaPhone(rawPhone);
  if (!phone) {
    return { ok: false, error: GHANA_PHONE_ERROR };
  }

  // ---- merchant -------------------------------------------------------------
  const storefront = await getMerchantBySubdomain(subdomain);
  if (!storefront || !storefront.isActive) {
    return { ok: false, error: "This store is not accepting orders right now." };
  }

  // Fresh, not the 5-minute cache: these decide whether money is taken,
  // read once per checkout rather than on every storefront page view.
  const merchant = await prisma.merchant.findUnique({
    where: { id: storefront.id },
    select: {
      id: true,
      email: true,
      paystackSubaccountCode: true,
      storefrontPaymentsEnabled: true,
    },
  });
  if (!merchant) {
    return { ok: false, error: "This store is not accepting orders right now." };
  }
  const merchantId = merchant.id;
  const paymentsEnabled = merchant.storefrontPaymentsEnabled === true;

  // Safety net (T5): checkout switched on without a payout account should be
  // impossible (settings creates the subaccount first), but if it happens,
  // refuse rather than start a payment with nowhere to settle.
  if (paymentsEnabled && !merchant.paystackSubaccountCode) {
    return { ok: false, error: "This store cannot accept payments yet." };
  }

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
    costPrice: number | null;
    customization: string | null;
    customizationLabel: string | null;
    customizationFee: number | null;
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

    const customization = validateCustomization(product, line.customization);
    if (!customization.ok) {
      return { ok: false, error: customization.error };
    }

    matched.push({
      productId: product.id,
      variantId: variant.id,
      quantity: line.quantity,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      price: variant.price,
      costPrice: variant.costPrice ?? null,
      customization: customization.text,
      customizationLabel: customization.label,
      customizationFee: customization.fee,
    });
  }

  const lineItems = matched.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    productName: line.productName,
    variantName: line.variantName,
    sku: line.sku,
    price: line.price,
    quantity: line.quantity,
    // Includes the per-unit customization surcharge (DEV-7). Order totals,
    // the Paystack amount and the platform fee all derive from subtotal, so
    // they include it automatically with no other changes.
    subtotal: (line.price + (line.customizationFee ?? 0)) * line.quantity,
    costPrice: line.costPrice,
    customization: line.customization,
    customizationLabel: line.customizationLabel,
    customizationFee: line.customizationFee,
  }));
  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);

  const orderBase = {
    merchantId,
    orderNumber: generateOrderNumber(),
    status: "PENDING" as const,
    source: "STOREFRONT" as const,
    paymentStatus: "UNPAID" as const,
    subtotal,
    total: subtotal, // No delivery fee or discount yet (D-18g).
    lineItems,
    shippingAddress: { name, phone, address, city, region },
    notes,
  };

  // ==== Checkout OFF: place the order, take nothing ===========================
  if (!paymentsEnabled) {
    // Read-only stock check, summed by variant (lines can share a variant via
    // different customizations). Stock is taken on confirm, D-18c.
    try {
      await checkStockAvailable(merchantId, matched);
    } catch (error) {
      if (error instanceof OversellError) return { ok: false, error: error.message };
      throw error;
    }

    const customer = await findOrCreateCustomer(merchantId, { name, email, phone });
    const order = await prisma.order.create({
      data: {
        ...orderBase,
        customerId: customer.id,
        // Only an order that goes through Paystack pays the 3%. Snapshotting
        // it here would understate the merchant's profit.
        platformFee: 0,
        reservedUntil: null, // never expired by the cron
        stockReserved: false,
      },
    });

    const orderUrl = `${getStorefrontOrigin(subdomain)}/orders/${order.id}`;

    // Both swallow their own failures, so neither can fail the order.
    await Promise.all([
      notifyNewOrder({
        merchantEmail: merchant.email,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: name,
        total: order.total,
        paid: false,
        buyerWhatsapp: phone,
        storeName: storefront.businessName,
        lines: lineItems,
      }),
      notifyBuyerOrderReceived({
        buyerEmail: email,
        storeName: storefront.businessName,
        storeWhatsapp: storefront.whatsappNumber,
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderUrl,
        total: order.total,
        lines: lineItems,
      }),
    ]);

    return { ok: true, redirectUrl: orderUrl };
  }

  // ==== Checkout ON: reserve, then Paystack ===================================
  try {
    await reserveStock(merchantId, matched);
  } catch (error) {
    if (error instanceof OversellError) return { ok: false, error: error.message };
    throw error;
  }

  // Snapshotted at the rate in force now (DEV-6), via the same helper
  // `initializeTransaction` uses for `transaction_charge`, so the two can
  // never disagree. 3%, uncapped (D-18b).
  const platformFee = storefrontFeePesewas(Math.round(subtotal * 100)) / 100;

  let orderId: string;
  try {
    const customer = await findOrCreateCustomer(merchantId, { name, email, phone });

    const order = await prisma.order.create({
      data: {
        ...orderBase,
        customerId: customer.id,
        platformFee,
        reservedUntil: new Date(Date.now() + HOLD_MS),
        stockReserved: true,
        paymentMethod: "PAYSTACK",
      },
    });
    orderId = order.id;
  } catch (error) {
    // The order never reached the database, so nothing will expire it later:
    // the reservation this call made has to be released by hand.
    await restoreStock(merchantId, matched).catch(() => {});
    throw error;
  }

  const reference = `PCART-${orderId}`;

  try {
    const transaction = await initializeTransaction({
      email,
      amountInPesewas: Math.round(subtotal * 100),
      subaccount: merchant.paystackSubaccountCode!,
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
    // Paystack could not be reached, or rejected the request. A payment that
    // never started gets the same treatment as one that timed out: release
    // the stock and mark the order EXPIRED, now rather than in 24 hours.
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
