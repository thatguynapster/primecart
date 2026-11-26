"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Order, OrderStatus } from "@prisma/client";

import { findOrCreateCustomer } from "@/lib/customers/find-or-create";
import { LAPSED_MESSAGE, isLapsed, isLocked } from "@/lib/billing/state";
import { requireMerchant } from "@/lib/merchant/current";
import { addGhs, parseFee } from "@/lib/orders/delivery";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { OversellError, reserveStock, restoreStock, type StockLine } from "@/lib/orders/stock";
import { canCancel, holdsReservedStock, nextStatus } from "@/lib/orders/transitions";
import { validateCustomization } from "@/lib/products/customization";
import { GHANA_PHONE_ERROR, normalizeGhanaPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export type OrderActionResult = { error?: string };

/** "How was it paid?" (T12). Optional; anything else is stored as null. */
const MANUAL_PAYMENT_METHODS = ["MOMO", "CASH", "BANK", "OTHER"] as const;
type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

function parsePaymentMethod(value: unknown): ManualPaymentMethod | null {
  return MANUAL_PAYMENT_METHODS.find((method) => method === value) ?? null;
}

function stockLinesOf(order: Order): StockLine[] {
  return order.lineItems.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
  }));
}

/** Merchant-facing wording for a stock shortfall at confirm time (D-18c). */
function confirmBlockedMessage(error: OversellError): string {
  const detail = error.detail;
  if (detail.kind === "short") {
    return `Only ${detail.available} left of ${detail.productName} (${detail.variantName}) — update your stock or cancel this order.`;
  }
  if (detail.kind === "unavailable") {
    return "An item in this order is no longer active in your catalogue — reactivate it or cancel this order.";
  }
  return "An item in this order just sold out — update your stock or cancel this order.";
}

/**
 * D-18c: a checkout-off order (`stockReserved: false`) takes its stock at the
 * moment the merchant confirms it or marks it paid. Reserves through the same
 * oversell-safe path a checkout uses (which sums quantities by variant), then
 * runs `commit`, an updateMany that must also set `stockReserved: true`.
 *
 * If `commit` loses a race (count 0: someone else confirmed or cancelled the
 * order in between), the stock just taken is put back.
 */
async function takeStockThen(
  merchantId: string,
  order: Order,
  commit: () => Promise<{ count: number }>
): Promise<OrderActionResult> {
  const lines = stockLinesOf(order);
  try {
    await reserveStock(merchantId, lines);
  } catch (error) {
    if (error instanceof OversellError) return { error: confirmBlockedMessage(error) };
    throw error;
  }

  const { count } = await commit();
  if (count === 0) {
    await restoreStock(merchantId, lines).catch((error: unknown) => {
      console.error(`Order ${order.id}: failed to release stock after a lost race:`, error);
    });
  }
  return {};
}

function revalidateOrder(orderId: string) {
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/orders");
}

/**
 * Advances an order to the next step in its fulfilment chain.
 *
 * `nextStatus` is derived server-side from the order's own current status,
 * never accepted from the client — a stale or tampered button cannot skip a
 * step or land on EXPIRED, which is not reachable through this function at
 * all (task 10.7).
 *
 * Confirming a checkout-off order takes its stock, and is blocked with a
 * clear message if the stock has run out since it was placed (D-18c).
 */
export async function advanceOrderStatus(orderId: string): Promise<OrderActionResult> {
  const merchant = await requireMerchant();
  if (isLocked(merchant)) return { error: LAPSED_MESSAGE };

  const order = await prisma.order.findFirst({
    where: { merchantId: merchant.id, id: orderId },
  });
  if (!order) return { error: "Order not found." };

  const next = nextStatus(order.status);
  if (!next) return {};

  let result: OrderActionResult = {};

  if (next === "CONFIRMED" && order.stockReserved === false) {
    result = await takeStockThen(merchant.id, order, () =>
      prisma.order.updateMany({
        where: {
          id: orderId,
          merchantId: merchant.id,
          status: order.status,
          stockReserved: false,
        },
        data: { status: next, reservedUntil: null, stockReserved: true },
      })
    );
  } else {
    const data: { status: OrderStatus; reservedUntil?: null } = { status: next };
    if (next === "CONFIRMED") data.reservedUntil = null;

    await prisma.order.updateMany({
      where: { id: orderId, merchantId: merchant.id, status: order.status },
      data,
    });
  }

  revalidateOrder(orderId);
  return result;
}

/**
 * Cancels an order. Stock goes back only if this order actually holds it:
 * `stockReserved: true`, or a legacy order (null) in a state that held
 * stock as before. A checkout-off order cancelled before confirmation never
 * took any, so nothing is returned (D-18c).
 */
export async function cancelOrder(orderId: string): Promise<OrderActionResult> {
  const merchant = await requireMerchant();
  if (isLocked(merchant)) return { error: LAPSED_MESSAGE };

  const order = await prisma.order.findFirst({
    where: { merchantId: merchant.id, id: orderId },
  });
  if (!order) return { error: "Order not found." };
  if (!canCancel(order.status)) return {};

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, merchantId: merchant.id, status: order.status },
    data: { status: "CANCELLED", reservedUntil: null },
  });

  const holdsStock =
    order.stockReserved === true ||
    (order.stockReserved == null && holdsReservedStock(order.status));

  if (count > 0 && holdsStock) {
    await restoreStock(merchant.id, stockLinesOf(order)).catch((error: unknown) => {
      console.error(`Order ${orderId}: failed to release stock on cancel:`, error);
    });
  }

  revalidateOrder(orderId);
  return {};
}

/**
 * Records a payment the merchant confirmed outside Paystack — MoMo sent
 * directly, cash on delivery, a bank transfer. A PENDING order also advances
 * to CONFIRMED since a confirmed payment is exactly what that step means,
 * mirroring the webhook's own settlement — and for a checkout-off order that
 * takes its stock (D-18c), blocked if it has run out.
 *
 * `method` is the optional "How was it paid?" answer (T12): lets the merchant
 * look up a disputed payment later and shows the owner how much money moves
 * outside checkout. Skipping it still marks the order paid.
 *
 * EXPIRED and CANCELLED orders are left alone: those need the manual-review
 * path already documented for the webhook, not a silent status flip.
 */
export async function markOrderPaid(
  orderId: string,
  method?: string | null
): Promise<OrderActionResult> {
  const merchant = await requireMerchant();
  if (isLocked(merchant)) return { error: LAPSED_MESSAGE };

  const order = await prisma.order.findFirst({
    where: { merchantId: merchant.id, id: orderId },
  });
  if (!order) return { error: "Order not found." };
  if (order.paymentStatus !== "UNPAID") return {};
  if (order.status === "CANCELLED" || order.status === "EXPIRED") {
    return { error: "This order is closed. It can't be marked paid." };
  }

  const paymentMethod = parsePaymentMethod(method);
  const status = order.status === "PENDING" ? "CONFIRMED" : order.status;

  let result: OrderActionResult = {};

  if (order.status === "PENDING" && order.stockReserved === false) {
    result = await takeStockThen(merchant.id, order, () =>
      prisma.order.updateMany({
        where: {
          id: orderId,
          merchantId: merchant.id,
          status: "PENDING",
          paymentStatus: "UNPAID",
          stockReserved: false,
        },
        data: {
          paymentStatus: "PAID",
          status,
          reservedUntil: null,
          stockReserved: true,
          paymentMethod,
          paymentRef: null,
        },
      })
    );
  } else {
    await prisma.order.updateMany({
      where: { id: orderId, merchantId: merchant.id, paymentStatus: "UNPAID" },
      // paymentRef cleared: any Paystack link still open for this order is
      // now stale, and the webhook flags a payment on it as a duplicate
      // rather than treating it as a redelivery.
      data: {
        paymentStatus: "PAID",
        status,
        reservedUntil: null,
        paymentMethod,
        paymentRef: null,
      },
    });
  }

  revalidateOrder(orderId);
  return result;
}

/**
 * Sets the delivery fee on an unpaid checkout-off order, until the merchant
 * confirms it or marks it paid. Never on a checkout-on order: its Paystack
 * links are for a fixed amount. Open to lapsed merchants, like confirming.
 */
export async function setDeliveryFee(
  orderId: string,
  value: string
): Promise<OrderActionResult> {
  const merchant = await requireMerchant();
  if (isLocked(merchant)) return { error: LAPSED_MESSAGE };

  const fee = parseFee(value);
  if (fee == null) return { error: "Enter an amount like 25 or 25.50. Use 0 for free." };

  const order = await prisma.order.findFirst({
    where: { merchantId: merchant.id, id: orderId },
  });
  if (!order) return { error: "Order not found." };
  if (order.deliveryKind === "PICKUP") return { error: "A pickup order has no delivery fee." };

  // The where clause is the guard: nothing changes if the order was paid,
  // confirmed or cancelled in the meantime.
  const { count } = await prisma.order.updateMany({
    where: {
      id: orderId,
      merchantId: merchant.id,
      status: "PENDING",
      paymentStatus: "UNPAID",
      stockReserved: false,
    },
    data: { deliveryFee: fee, total: addGhs(order.subtotal, fee) },
  });

  revalidateOrder(orderId);
  return count === 0 ? { error: "The delivery fee on this order can't be changed any more." } : {};
}

// ---------------------------------------------------------------------------
// Manual order creation
// ---------------------------------------------------------------------------

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

type ManualLine = {
  productId: string;
  variantId: string;
  quantity: number;
  customization?: string;
};

function parseLines(formData: FormData): ManualLine[] {
  const productIds = formData.getAll("lineProductId").map(String);
  const variantIds = formData.getAll("lineVariantId").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);
  // Parallel array — not every line has a customization input shown (only
  // products with allowCustomization get one, §B.5), but FormData.getAll
  // only returns entries for inputs the form actually rendered, so the
  // indices would drift from productIds/variantIds without a matching empty
  // slot per line. The form is expected to always submit one entry per line.
  const customizations = formData.getAll("lineCustomization").map(String);

  const lines: ManualLine[] = [];
  for (let i = 0; i < productIds.length; i += 1) {
    const quantity = Number(quantities[i]);
    if (!productIds[i] || !variantIds[i] || !Number.isInteger(quantity) || quantity <= 0) {
      continue;
    }
    lines.push({
      productId: productIds[i],
      variantId: variantIds[i],
      quantity,
      customization: customizations[i],
    });
  }
  return lines;
}

export async function createManualOrder(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const merchant = await requireMerchant();
  if (isLapsed(merchant)) return { error: LAPSED_MESSAGE };

  const source = formData.get("source") === "WHATSAPP" ? "WHATSAPP" : "MANUAL";
  const name = String(formData.get("name") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const phone = normalizeGhanaPhone(rawPhone) ?? "";
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const markPaid = formData.get("markPaid") === "on";
  const rawDeliveryFee = String(formData.get("deliveryFee") ?? "").trim();
  const deliveryFee = rawDeliveryFee ? parseFee(rawDeliveryFee) : null;

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Enter the customer's name.";
  if (!rawPhone) fieldErrors.phone = "Enter a phone number.";
  else if (!phone) fieldErrors.phone = GHANA_PHONE_ERROR;

  if (rawDeliveryFee && deliveryFee == null) {
    fieldErrors.deliveryFee = "Enter an amount like 25 or 25.50.";
  }

  const requestedLines = parseLines(formData);
  if (requestedLines.length === 0) {
    fieldErrors.lines = "Add at least one item.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Prices and names are re-derived from the live catalogue, exactly as the
  // storefront checkout does — a merchant's form is a request, not a source
  // of truth for money.
  const productIds = [...new Set(requestedLines.map((line) => line.productId))];
  const products = await prisma.product.findMany({
    where: { merchantId: merchant.id, id: { in: productIds } },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  const lineItems: {
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    sku: string | null;
    price: number;
    quantity: number;
    subtotal: number;
    costPrice: number | null;
    customization: string | null;
    customizationLabel: string | null;
    customizationFee: number | null;
  }[] = [];

  for (const line of requestedLines) {
    const product = productById.get(line.productId);
    const variant = product?.variants.find((candidate) => candidate.id === line.variantId);
    if (!product || !variant) {
      return { error: "One of the selected items no longer exists." };
    }

    const customization = validateCustomization(product, line.customization);
    if (!customization.ok) {
      return { error: customization.error };
    }
    const fee = customization.fee ?? 0;

    lineItems.push({
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku ?? null,
      price: variant.price,
      quantity: line.quantity,
      // Includes the per-unit customization surcharge (DEV-7), same rule
      // the storefront checkout follows.
      subtotal: (variant.price + fee) * line.quantity,
      costPrice: variant.costPrice ?? null,
      customization: customization.text,
      customizationLabel: customization.label,
      customizationFee: customization.fee,
    });
  }

  const stockLines: StockLine[] = lineItems.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
  }));

  try {
    await reserveStock(merchant.id, stockLines);
  } catch (error) {
    if (error instanceof OversellError) return { error: error.message };
    throw error;
  }

  const customer = await findOrCreateCustomer(merchant.id, { name, phone, email });

  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);

  const order = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      customerId: customer.id,
      orderNumber: generateOrderNumber(),
      status: markPaid ? "CONFIRMED" : "PENDING",
      source,
      paymentStatus: markPaid ? "PAID" : "UNPAID",
      subtotal,
      total: addGhs(subtotal, deliveryFee ?? 0),
      deliveryFee,
      // 0, not null — this order was never subject to the storefront fee, as
      // opposed to a pre-D-16 storefront order where it's genuinely unknown
      // (see getProfitSummary's fallback in src/lib/dashboard/queries.ts).
      platformFee: 0,
      lineItems,
      shippingAddress: address || city
        ? { name, phone, address, city, region: region || null }
        : undefined,
      // D-18: manual orders take stock at creation and never expire, paid or
      // not. The merchant agreed the sale in person; it stays open until
      // they mark it paid or cancel it.
      reservedUntil: null,
      stockReserved: true,
      notes: notes || null,
    },
  });

  revalidatePath("/dashboard/orders");
  redirect(`/dashboard/orders/${order.id}`);
}
