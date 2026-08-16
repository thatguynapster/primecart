import { getDashboardOrigin } from "@/lib/domain";
import { formatGhs } from "@/lib/format";
import { sendEmail } from "./resend";

/**
 * One function per platform event, per docs/NOTIFICATIONS.md's v1 catalog.
 *
 * Named for the event, not a generic `notify(type, payload)` dispatcher — that
 * is what makes "did we wire up every event" auditable by reading this file,
 * rather than trusting that every call site passed the right string.
 *
 * Every function here swallows its own failures. A payment confirming or
 * stock reserving must never fail because Resend is unreachable — an unsent
 * email is a missed alert, not a broken order.
 */

const BRAND_BAR = `background:#111;color:#fff;padding:16px 24px;font-weight:600;letter-spacing:-0.01em;`;
const WRAP = `font-family:system-ui,-apple-system,sans-serif;color:#111;`;
const BODY = `padding:24px;font-size:15px;line-height:1.6;`;
const BUTTON = `display:inline-block;margin-top:16px;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;`;

function layout(title: string, bodyHtml: string): string {
  return `<div style="${WRAP}"><div style="${BRAND_BAR}">PrimeCart</div><div style="${BODY}"><h1 style="font-size:18px;margin:0 0 12px;">${title}</h1>${bodyHtml}</div></div>`;
}

/**
 * Event 1 — a storefront order's payment just confirmed (webhook's
 * settleFromPending / settleFromExpired success path only — never on order
 * creation, which would fire on every abandoned checkout).
 */
export async function notifyNewOrder(params: {
  merchantEmail: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  total: number;
}): Promise<void> {
  const url = `${getDashboardOrigin()}/dashboard/orders/${params.orderId}`;
  try {
    await sendEmail({
      to: params.merchantEmail,
      subject: `New order ${params.orderNumber} — ${formatGhs(params.total)}`,
      html: layout(
        "You've got a new paid order",
        `<p><strong>${params.orderNumber}</strong> from ${params.customerName}, ${formatGhs(params.total)}.</p>
         <a href="${url}" style="${BUTTON}">View order</a>`
      ),
    });
  } catch (error) {
    console.error(`notifyNewOrder failed for order ${params.orderId}:`, error);
  }
}

/**
 * Event 2 — a payment confirmed but the order could not be. Covers both
 * settleFromExpired's OversellError branch (task 10.8) and the CANCELLED /
 * unexpected-status fallback in confirmPaidOrder. Urgent tone, deliberately
 * distinct from notifyNewOrder — money moved and nothing else is watching.
 */
export async function notifyNeedsReview(params: {
  merchantEmail: string;
  orderId: string;
  orderNumber: string;
  reason: string;
}): Promise<void> {
  const url = `${getDashboardOrigin()}/dashboard/orders/${params.orderId}`;
  try {
    await sendEmail({
      to: params.merchantEmail,
      subject: `Needs review — order ${params.orderNumber}`,
      html: layout(
        "A payment needs your attention",
        `<p>Order <strong>${params.orderNumber}</strong> was paid, but ${params.reason}</p>
         <a href="${url}" style="${BUTTON}">Review order</a>`
      ),
    });
  } catch (error) {
    console.error(`notifyNeedsReview failed for order ${params.orderId}:`, error);
  }
}

/**
 * Event 3 — a variant's stock crossed at/below its threshold from a sale.
 * Caller (reserveStock) is responsible for the once-per-crossing dedupe via
 * ProductVariant.lowStockAlertedAt — this function just sends.
 */
export async function notifyLowStock(params: {
  merchantEmail: string;
  productId: string;
  productName: string;
  variantName: string;
  stock: number;
  lowStockThreshold: number;
}): Promise<void> {
  const url = `${getDashboardOrigin()}/dashboard/products/${params.productId}`;
  try {
    await sendEmail({
      to: params.merchantEmail,
      subject: `Low stock — ${params.productName} (${params.variantName})`,
      html: layout(
        "Running low on stock",
        `<p><strong>${params.productName}</strong> — ${params.variantName} is down to
         <strong>${params.stock}</strong> ${params.stock === 1 ? "unit" : "units"}
         (threshold: ${params.lowStockThreshold}).</p>
         <a href="${url}" style="${BUTTON}">Restock</a>`
      ),
    });
  } catch (error) {
    console.error(`notifyLowStock failed for product ${params.productId}:`, error);
  }
}
