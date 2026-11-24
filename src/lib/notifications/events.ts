import { GRACE_DAYS, OFFLINE_DAYS } from "@/lib/billing/status";
import type { DormantMerchant } from "@/lib/admin/dormancy";
import { getDashboardOrigin } from "@/lib/domain";
import { formatDeadline, formatGhs, formatLongDate, formatRelativeDate } from "@/lib/format";
import {
  deliveryAmountText,
  deliveryFeeUnagreed,
  deliveryLine,
  type OrderDelivery,
} from "@/lib/orders/delivery";
import { waMeLink } from "@/lib/phone";
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
 * These emails are template strings, not React — nothing here is escaped by
 * default the way JSX escapes text content. Any value that came from a
 * shopper or merchant (a name, a customization) must go through this before
 * it reaches an email body.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "Delivery: Accra — GH₵25.00", or "" for an order with no delivery choice. */
function deliveryHtml(delivery: OrderDelivery): string {
  const line = deliveryLine(delivery);
  if (!line) return "";
  return `${escapeHtml(line.label)} — ${deliveryAmountText(line.amount, formatGhs)}`;
}

/**
 * Event 1 — a new order for the merchant.
 *
 * Paid (`paid: true`): a storefront order whose payment just confirmed —
 * the webhook's settleFromPending / settleFromExpired success path only,
 * never on order creation (which would fire on every abandoned checkout).
 *
 * Unpaid (`paid: false`, D-18 checkout off): sent the moment the shopper
 * places the order, since there is no payment to wait for. The merchant
 * contacts the buyer on WhatsApp to confirm and arrange payment, so the
 * email carries the buyer's number and a one-tap wa.me link.
 */
export async function notifyNewOrder(params: {
  merchantEmail: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  total: number;
  paid: boolean;
  /** E.164 buyer WhatsApp number (D-18e). Shown on unpaid orders. */
  buyerWhatsapp?: string | null;
  /** Used in the pre-filled WhatsApp message. */
  storeName?: string | null;
  delivery: OrderDelivery;
  /**
   * DEV-7 (Phase 15), §B.7 — so the merchant sees what to engrave without
   * opening the dashboard. Only lines carrying customization text are shown;
   * an uncustomized order renders no list at all.
   */
  lines: {
    productName: string;
    variantName: string;
    customization: string | null;
    customizationLabel: string | null;
  }[];
}): Promise<void> {
  const url = `${getDashboardOrigin()}/dashboard/orders/${params.orderId}`;

  const customizedLines = params.lines.filter(
    (line): line is typeof line & { customization: string } =>
      Boolean(line.customization)
  );
  const customizationHtml =
    customizedLines.length > 0
      ? `<ul style="margin:12px 0 0;padding-left:20px;">${customizedLines
          .map(
            (line) =>
              `<li><strong>${escapeHtml(line.customizationLabel ?? "Personalisation")}</strong> — ${escapeHtml(line.productName)} (${escapeHtml(line.variantName)}): ${escapeHtml(line.customization)}</li>`
          )
          .join("")}</ul>`
      : "";

  const summary = `<p><strong>${escapeHtml(params.orderNumber)}</strong> from ${escapeHtml(params.customerName)}, ${formatGhs(params.total)}.</p>${
    deliveryHtml(params.delivery) ? `<p>${deliveryHtml(params.delivery)}</p>` : ""
  }`;

  let subject: string;
  let html: string;

  if (params.paid) {
    subject = `New order ${params.orderNumber} — ${formatGhs(params.total)}`;
    html = layout(
      "You've got a new paid order",
      `${summary}
       ${customizationHtml}
       <a href="${url}" style="${BUTTON}">View order</a>`
    );
  } else {
    subject = `New order ${params.orderNumber} — unpaid`;
    const whatsapp = params.buyerWhatsapp;
    const contactHtml = whatsapp
      ? `<p>Message them on WhatsApp at <strong>${escapeHtml(whatsapp)}</strong> to confirm the order and arrange payment. Stock isn't taken until you confirm it or mark it paid.</p>
         <a href="${escapeHtml(
           waMeLink(
             whatsapp,
             newOrderWhatsappMessage({
               customerName: params.customerName,
               orderNumber: params.orderNumber,
               storeName: params.storeName ?? null,
               total: params.total,
               deliveryToAgree: deliveryFeeUnagreed(params.delivery),
             })
           )
         )}" style="${BUTTON}">Message on WhatsApp</a>&nbsp;`
      : `<p>Contact the buyer to confirm the order and arrange payment. Stock isn't taken until you confirm it or mark it paid.</p>`;
    html = layout(
      "You've got a new order — arrange payment",
      `${summary}
       ${customizationHtml}
       ${contactHtml}
       <a href="${url}" style="${BUTTON}">View order</a>`
    );
  }

  try {
    await sendEmail({ to: params.merchantEmail, subject, html });
  } catch (error) {
    console.error(`notifyNewOrder failed for order ${params.orderId}:`, error);
  }
}

/**
 * The buyer's copy of a checkout-off order. Paystack emails a receipt for paid
 * orders; here nothing else would give the buyer their order link back once
 * they close the tab.
 */
export async function notifyBuyerOrderReceived(params: {
  buyerEmail: string;
  storeName: string;
  storeWhatsapp: string | null;
  orderId: string;
  orderNumber: string;
  orderUrl: string;
  total: number;
  delivery: OrderDelivery;
  lines: {
    productName: string;
    variantName: string;
    quantity: number;
    subtotal: number;
    customization: string | null;
  }[];
}): Promise<void> {
  const store = escapeHtml(params.storeName);
  const items = params.lines
    .map(
      (line) =>
        `<li>${line.quantity} × ${escapeHtml(line.productName)} (${escapeHtml(line.variantName)})${
          line.customization ? `: &ldquo;${escapeHtml(line.customization)}&rdquo;` : ""
        } — ${formatGhs(line.subtotal)}</li>`
    )
    .join("");
  const whatsapp = params.storeWhatsapp
    ? `&nbsp;<a href="${escapeHtml(
        waMeLink(
          params.storeWhatsapp,
          `Hi ${params.storeName}, I just placed order ${params.orderNumber} on your shop.`
        )
      )}" style="${BUTTON}">Message the shop</a>`
    : "";

  try {
    await sendEmail({
      to: params.buyerEmail,
      subject: `${params.storeName} received your order ${params.orderNumber}`,
      html: layout(
        `${store} received your order`,
        `<p>${store} will contact you on WhatsApp to confirm order <strong>${escapeHtml(params.orderNumber)}</strong> and arrange payment. You haven&rsquo;t been charged anything.</p>
         <ul style="margin:12px 0;padding-left:20px;">${items}${
           deliveryHtml(params.delivery) ? `<li>${deliveryHtml(params.delivery)}</li>` : ""
         }</ul>
         <p><strong>Total: ${formatGhs(params.total)}</strong></p>
         <a href="${escapeHtml(params.orderUrl)}" style="${BUTTON}">View your order</a>${whatsapp}`
      ),
    });
  } catch (error) {
    console.error(`notifyBuyerOrderReceived failed for order ${params.orderId}:`, error);
  }
}

/** The merchant's opening WhatsApp message to a buyer. Shared with the dashboard. */
export function newOrderWhatsappMessage(params: {
  customerName: string;
  orderNumber: string;
  storeName: string | null;
  total: number;
  /** The total leaves out a delivery fee still to be agreed. */
  deliveryToAgree?: boolean;
}): string {
  const from = params.storeName ? ` from ${params.storeName}` : "";
  return `Hi ${params.customerName}, thanks for your order ${params.orderNumber}${from} (${formatGhs(params.total)}${params.deliveryToAgree ? " plus delivery" : ""}). I'm confirming it now. How would you like to pay?`;
}

/**
 * T10 — the buyer's one payment reminder, ~30 minutes after placing a
 * checkout-on order they haven't paid for yet. Links to the storefront order
 * page (which has a fresh "Pay now"), never to a raw Paystack URL that may
 * have gone stale. The caller claims `Order.reminderSentAt` first, so this
 * sends once.
 */
export async function notifyPaymentReminder(params: {
  buyerEmail: string;
  storeName: string;
  orderId: string;
  orderNumber: string;
  orderUrl: string;
  total: number;
  reservedUntil: Date;
}): Promise<void> {
  const store = escapeHtml(params.storeName);
  try {
    await sendEmail({
      to: params.buyerEmail,
      subject: `Your order from ${params.storeName} is waiting for payment`,
      html: layout(
        `Your order from ${store} is saved`,
        `<p>Order <strong>${escapeHtml(params.orderNumber)}</strong> (${formatGhs(params.total)}) is held for you until <strong>${escapeHtml(formatDeadline(params.reservedUntil))}</strong>. Pay now to secure it. After that, the items go back on sale.</p>
         <a href="${escapeHtml(params.orderUrl)}" style="${BUTTON}">Pay now</a>`
      ),
    });
  } catch (error) {
    console.error(`notifyPaymentReminder failed for order ${params.orderId}:`, error);
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
        `<p>Order <strong>${escapeHtml(params.orderNumber)}</strong> was paid, but ${escapeHtml(params.reason)}</p>
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
        `<p><strong>${escapeHtml(params.productName)}</strong> — ${escapeHtml(params.variantName)} is down to
         <strong>${params.stock}</strong> ${params.stock === 1 ? "unit" : "units"}
         (threshold: ${params.lowStockThreshold}).</p>
         <a href="${url}" style="${BUTTON}">Restock</a>`
      ),
    });
  } catch (error) {
    console.error(`notifyLowStock failed for product ${params.productId}:`, error);
  }
}

/**
 * D-17 — the weekly dormant-shop digest, sent to the owner's own inbox
 * (`ADMIN_NOTIFICATION_EMAIL`), never to a merchant. Deliberately just a
 * list, not an action of any kind — see docs/TASKS.md's D-17 for why this
 * flags rather than automatically pausing anything.
 */
export async function notifyDormantMerchants(params: {
  adminEmail: string;
  merchants: DormantMerchant[];
}): Promise<void> {
  const rows = params.merchants
    .map((merchant) => {
      const lastSale = merchant.lastPaidOrderAt
        ? `last sale ${formatRelativeDate(merchant.lastPaidOrderAt)}`
        : "never sold anything";
      return `<li><strong>${escapeHtml(merchant.businessName)}</strong> (${escapeHtml(merchant.subdomain)}) — ${lastSale}, ${escapeHtml(merchant.email)}</li>`;
    })
    .join("");

  try {
    await sendEmail({
      to: params.adminEmail,
      subject: `${params.merchants.length} dormant ${params.merchants.length === 1 ? "shop" : "shops"} this week`,
      html: layout(
        "Shops with no sales in 30+ days",
        `<p>Worth a check-in — these merchants may have hit a bottleneck.</p>
         <ul>${rows}</ul>`
      ),
    });
  } catch (error) {
    console.error("notifyDormantMerchants failed:", error);
  }
}

export type BillingReminderKind = "trial-3" | "trial-1" | "renew-7" | "renew-1" | "expired";

/**
 * D-18 §6 — subscription reminders to the merchant. The caller
 * (src/lib/billing/reminders.ts) claims each one first, so this just sends.
 * Every one links to /dashboard/billing.
 */
export async function notifyBillingReminder(params: {
  merchantEmail: string;
  kind: BillingReminderKind;
  date: Date;
  daysLeft: number;
}): Promise<void> {
  const url = `${getDashboardOrigin()}/dashboard/billing`;
  const when = escapeHtml(formatLongDate(params.date));
  const days = `${params.daysLeft} ${params.daysLeft === 1 ? "day" : "days"}`;
  // "expired" is about the day it lapsed.
  const closes = escapeHtml(
    formatLongDate(new Date(params.date.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000))
  );

  const goesOff = escapeHtml(
    formatLongDate(new Date(params.date.getTime() + OFFLINE_DAYS * 24 * 60 * 60 * 1000))
  );

  const copy: Record<BillingReminderKind, { subject: string; title: string; body: string; cta: string }> = {
    "trial-3": {
      subject: `Your PrimeCart trial ends in ${days}`,
      title: `Your free trial ends in ${days}`,
      body: `Your trial ends on <strong>${when}</strong>. Choose a plan to keep managing your shop. If you pay now, your paid time starts when the trial ends, so you don't lose any days.`,
      cta: "Choose a plan",
    },
    "trial-1": {
      subject: "Your PrimeCart trial ends tomorrow",
      title: "Your free trial ends tomorrow",
      body: `Your trial ends on <strong>${when}</strong>. After that your shop keeps taking orders for ${GRACE_DAYS} more days, but you'll need a plan to change products and settings.`,
      cta: "Choose a plan",
    },
    "renew-7": {
      subject: `Your PrimeCart plan ends in ${days}`,
      title: `Your plan ends in ${days}`,
      body: `Your paid time runs until <strong>${when}</strong>. Renew any time: the new time is added after your current plan ends.`,
      cta: "Renew",
    },
    "renew-1": {
      subject: "Your PrimeCart plan ends tomorrow",
      title: "Your plan ends tomorrow",
      body: `Your paid time ends on <strong>${when}</strong>. Renew now so you can keep managing your shop without a break. If you don't, it stops taking new orders ${GRACE_DAYS} days later.`,
      cta: "Renew",
    },
    expired: {
      subject: "Your PrimeCart plan has expired",
      title: "Your plan has expired",
      body: `Your shop keeps taking orders until <strong>${closes}</strong>, and until then you can still view your dashboard and handle orders. After that, your shop stops taking new orders and your dashboard locks until you choose a plan. Your storefront goes off on <strong>${goesOff}</strong>.`,
      cta: "Renew",
    },
  };

  const message = copy[params.kind];
  try {
    await sendEmail({
      to: params.merchantEmail,
      subject: message.subject,
      html: layout(message.title, `<p>${message.body}</p><a href="${url}" style="${BUTTON}">${message.cta}</a>`),
    });
  } catch (error) {
    console.error(`notifyBillingReminder (${params.kind}) failed:`, error);
  }
}
