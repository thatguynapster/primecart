"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";

import { findOrCreateCustomer } from "@/lib/customers/find-or-create";
import { requireMerchant } from "@/lib/merchant/current";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { OversellError, reserveStock, restoreStock, type StockLine } from "@/lib/orders/stock";
import { canCancel, holdsReservedStock, nextStatus } from "@/lib/orders/transitions";
import { prisma } from "@/lib/prisma";

const RESERVATION_MINUTES = 30;

/**
 * Advances an order to the next step in its fulfilment chain.
 *
 * `nextStatus` is derived server-side from the order's own current status,
 * never accepted from the client — a stale or tampered button cannot skip a
 * step or land on EXPIRED, which is not reachable through this function at
 * all (task 10.7).
 */
export async function advanceOrderStatus(orderId: string): Promise<void> {
  const merchant = await requireMerchant();

  const order = await prisma.order.findFirst({
    where: { merchantId: merchant.id, id: orderId },
  });
  if (!order) return;

  const next = nextStatus(order.status);
  if (!next) return;

  const data: { status: OrderStatus; reservedUntil?: null } = { status: next };
  if (next === "CONFIRMED") data.reservedUntil = null;

  await prisma.order.updateMany({
    where: { id: orderId, merchantId: merchant.id, status: order.status },
    data,
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/orders");
}

export async function cancelOrder(orderId: string): Promise<void> {
  const merchant = await requireMerchant();

  const order = await prisma.order.findFirst({
    where: { merchantId: merchant.id, id: orderId },
  });
  if (!order || !canCancel(order.status)) return;

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, merchantId: merchant.id, status: order.status },
    data: { status: "CANCELLED", reservedUntil: null },
  });

  // Stock reserved at creation is released back to the catalogue — a
  // cancelled order must not keep units it will never sell.
  if (count > 0 && holdsReservedStock(order.status)) {
    const lines: StockLine[] = order.lineItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));
    await restoreStock(merchant.id, lines).catch((error: unknown) => {
      console.error(`Order ${orderId}: failed to release stock on cancel:`, error);
    });
  }

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/orders");
}

/**
 * Records a payment the merchant confirmed outside Paystack — cash on
 * delivery, or a mobile money transfer read out over WhatsApp. Only moves
 * `paymentStatus`; a PENDING order also advances to CONFIRMED since a
 * confirmed payment is exactly what that step means, mirroring the webhook's
 * own settlement. EXPIRED and CANCELLED orders are left alone — those need
 * the manual-review path already documented for the webhook, not a silent
 * status flip.
 */
export async function markOrderPaid(orderId: string): Promise<void> {
  const merchant = await requireMerchant();

  const order = await prisma.order.findFirst({
    where: { merchantId: merchant.id, id: orderId },
  });
  if (!order || order.paymentStatus !== "UNPAID") return;
  if (order.status === "CANCELLED" || order.status === "EXPIRED") return;

  await prisma.order.updateMany({
    where: { id: orderId, merchantId: merchant.id, paymentStatus: "UNPAID" },
    data: {
      paymentStatus: "PAID",
      status: order.status === "PENDING" ? "CONFIRMED" : order.status,
      reservedUntil: null,
    },
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/orders");
}

// ---------------------------------------------------------------------------
// Manual order creation
// ---------------------------------------------------------------------------

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

type ManualLine = { productId: string; variantId: string; quantity: number };

function parseLines(formData: FormData): ManualLine[] {
  const productIds = formData.getAll("lineProductId").map(String);
  const variantIds = formData.getAll("lineVariantId").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);

  const lines: ManualLine[] = [];
  for (let i = 0; i < productIds.length; i += 1) {
    const quantity = Number(quantities[i]);
    if (!productIds[i] || !variantIds[i] || !Number.isInteger(quantity) || quantity <= 0) {
      continue;
    }
    lines.push({ productId: productIds[i], variantId: variantIds[i], quantity });
  }
  return lines;
}

export async function createManualOrder(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const merchant = await requireMerchant();

  const source = formData.get("source") === "WHATSAPP" ? "WHATSAPP" : "MANUAL";
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const markPaid = formData.get("markPaid") === "on";

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Enter the customer's name.";
  if (!phone) fieldErrors.phone = "Enter a phone number.";

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
  }[] = [];

  for (const line of requestedLines) {
    const product = productById.get(line.productId);
    const variant = product?.variants.find((candidate) => candidate.id === line.variantId);
    if (!product || !variant) {
      return { error: "One of the selected items no longer exists." };
    }
    lineItems.push({
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku ?? null,
      price: variant.price,
      quantity: line.quantity,
      subtotal: variant.price * line.quantity,
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
      total: subtotal,
      lineItems,
      shippingAddress: address || city
        ? { name, phone, address, city, region: region || null }
        : undefined,
      reservedUntil: markPaid
        ? null
        : new Date(Date.now() + RESERVATION_MINUTES * 60_000),
      notes: notes || null,
    },
  });

  revalidatePath("/dashboard/orders");
  redirect(`/dashboard/orders/${order.id}`);
}
