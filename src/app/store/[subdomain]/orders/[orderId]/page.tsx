import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDeadline, formatGhs, isPast, timeLeftUntil } from "@/lib/format";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { deliveryAmountText, deliveryLine } from "@/lib/orders/delivery";
import { waMeLink } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { PayNowButton } from "./pay-now";

export const metadata = { title: "Your order" };

/**
 * Guest order status — where Paystack's `callback_url` sends the shopper back
 * to, and a plain "track my order" link.
 *
 * Reads only. The handover is explicit: "do not update order status here,
 * wait for the webhook" — a shopper landing here mid-payment must not have
 * this page race the webhook to decide the outcome. It renders whatever is
 * in the database at the moment of the request, nothing more.
 *
 * Reachable only through the merchant's own subdomain, and only if the store
 * is active — the proxy already rewrites an inactive store's every path to
 * `/store-unavailable` before this page is reached. Order ids are MongoDB
 * ObjectIds, unguessable in practice; combined with requiring the correct
 * subdomain, that is the same guest-order-security model most storefronts
 * use for order confirmation links.
 *
 * D-18 splits the old single "waiting" state three ways:
 *   - checkout off (stockReserved false): order received, the store will
 *     contact the buyer on WhatsApp to arrange payment. Never "waiting for
 *     payment", since there's nothing to wait for.
 *   - checkout on, unpaid: Pay now (a fresh Paystack link) and time left.
 *     Coming straight back from Paystack (`?reference=`) shows "confirming"
 *     instead, so a shopper who just paid isn't offered a second payment.
 *   - legacy (stockReserved null): exactly as before.
 */
export default async function OrderStatusPage({
  params,
  searchParams,
}: PageProps<"/store/[subdomain]/orders/[orderId]">) {
  const { subdomain, orderId } = await params;
  const query = await searchParams;

  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant) notFound();

  const order = await prisma.order.findFirst({
    where: { merchantId: merchant.id, id: orderId },
  });
  if (!order) notFound();

  const isPaid = order.paymentStatus === "PAID";
  const isOpenUnpaid = order.status === "PENDING" && order.paymentStatus === "UNPAID";
  const isExpired = order.status === "EXPIRED";
  const isCancelled = order.status === "CANCELLED";

  // Paystack appends ?reference= (and ?trxref=) to the callback URL.
  const returnedReference =
    typeof query.reference === "string"
      ? query.reference
      : typeof query.trxref === "string"
        ? query.trxref
        : null;

  const isCheckoutOff = isOpenUnpaid && order.stockReserved === false;
  const isCheckoutOn =
    isOpenUnpaid && order.stockReserved === true && order.paymentMethod === "PAYSTACK";
  const holdOpen =
    isCheckoutOn && order.reservedUntil != null && !isPast(order.reservedUntil);
  const showPayNow = holdOpen && !returnedReference;
  // Legacy orders, a shopper just back from Paystack, or a hold that has run
  // out but the cron hasn't swept yet: the original "confirming" message.
  const isWaiting = isOpenUnpaid && !isCheckoutOff && !showPayNow;

  // Unpaid, but the merchant confirmed it: payment is being arranged directly.
  const isConfirmedUnpaid =
    !isPaid && !isOpenUnpaid && !isExpired && !isCancelled;

  const delivery = deliveryLine(order);
  const isPickup = order.deliveryKind === "PICKUP";
  const buyerNumber = order.shippingAddress?.phone ?? null;
  const storeWhatsapp = merchant.whatsappNumber
    ? waMeLink(
        merchant.whatsappNumber,
        `Hi ${merchant.businessName}, I just placed order ${order.orderNumber} on your shop.`
      )
    : null;
  // The buyer's way to raise a problem. It goes to the shop only: PrimeCart
  // takes no part in disputes (D-23).
  const problemLink = merchant.whatsappNumber
    ? waMeLink(
        merchant.whatsappNumber,
        `Hi ${merchant.businessName}, I have a problem with my order ${order.orderNumber}.`
      )
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-[13px] text-neutral-500">Order {order.orderNumber}</p>

      {isPaid && (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Thank you! Your order is confirmed.
          </h1>
          <p className="mt-2 text-[14px] text-neutral-600">
            {order.paymentMethod === "PAYSTACK"
              ? "A receipt has been sent to your email."
              : `${merchant.businessName} has recorded your payment.`}
          </p>
        </>
      )}

      {isCheckoutOff && (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Order received.
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
            {merchant.businessName} will contact you on WhatsApp
            {buyerNumber ? (
              <>
                {" "}at <span className="whitespace-nowrap font-medium text-neutral-800">{buyerNumber}</span>
              </>
            ) : null}{" "}
            to confirm your order and arrange payment. You haven&rsquo;t been
            charged anything.
          </p>
          {storeWhatsapp && (
            <a
              href={storeWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-[14px] font-medium"
              style={{ background: "var(--brand)", color: "var(--on-brand)" }}
            >
              Message {merchant.businessName} on WhatsApp
            </a>
          )}
        </>
      )}

      {showPayNow && order.reservedUntil && (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Your order is saved — pay to secure it.
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
            We&rsquo;re holding these items for you for another{" "}
            {timeLeftUntil(order.reservedUntil)}, until{" "}
            {formatDeadline(order.reservedUntil)}. After that they go back on
            sale.
          </p>
          <PayNowButton
            subdomain={subdomain}
            orderId={order.id}
            label={`Pay now · ${formatGhs(order.total)}`}
          />
        </>
      )}

      {isConfirmedUnpaid && (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Your order is confirmed.
          </h1>
          <p className="mt-2 text-[14px] text-neutral-600">
            {merchant.businessName} will arrange payment with you directly.
          </p>
        </>
      )}

      {isWaiting && (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Confirming your payment…
          </h1>
          <p className="mt-2 text-[14px] text-neutral-600">
            This can take a minute. Refresh this page to check again — we will
            not ask you to pay twice.
          </p>
          {holdOpen && returnedReference && (
            <p className="mt-4 text-[13.5px] text-neutral-600">
              Payment didn&rsquo;t go through?{" "}
              <Link
                href={`/orders/${order.id}`}
                className="font-medium text-neutral-900 underline underline-offset-4"
              >
                Try again
              </Link>
            </p>
          )}
        </>
      )}

      {isExpired && (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            This order was not completed.
          </h1>
          <p className="mt-2 text-[14px] text-neutral-600">
            The payment window closed before it was confirmed. Please place a
            new order — nothing was charged.
          </p>
        </>
      )}

      {isCancelled && (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            This order was cancelled.
          </h1>
        </>
      )}



      <div className="mt-8 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200">
        {order.lineItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-[14px] font-medium">{item.productName}</p>
              <p className="text-[12.5px] text-neutral-500">
                {item.variantName} · qty {item.quantity}
              </p>
              {item.customization && (
                <p className="mt-1 text-[12.5px] text-neutral-700">
                  {item.customizationLabel ?? "Personalisation"}:{" "}
                  &ldquo;{item.customization}&rdquo;
                </p>
              )}
            </div>
            <p className="text-[14px] font-medium tabular-nums">
              {formatGhs(item.subtotal)}
            </p>
          </div>
        ))}

        {delivery && (
          <div className="flex items-center justify-between gap-4 p-4">
            <p className="min-w-0 text-[14px]">{delivery.label}</p>
            <p className="text-[14px] font-medium tabular-nums">
              {deliveryAmountText(delivery.amount, formatGhs)}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between p-4">
          <p className="text-[14px] font-medium">Total</p>
          <p className="text-[16px] font-semibold tabular-nums">
            {formatGhs(order.total)}
          </p>
        </div>
      </div>

      {order.shippingAddress && (
        <div className="mt-6">
          <p className="text-[13px] font-medium text-neutral-700">
            {isPickup ? "Pickup" : "Delivery to"}
          </p>
          <p className="mt-1 text-[13.5px] text-neutral-600">
            {order.shippingAddress.name} · {order.shippingAddress.phone}
            <br />
            {isPickup ? (
              order.deliveryNote
            ) : (
              <>
                {order.shippingAddress.address}, {order.shippingAddress.city}
                {order.shippingAddress.region ? `, ${order.shippingAddress.region}` : ""}
              </>
            )}
          </p>
        </div>
      )}

      {problemLink && (
        <p className="mt-6 text-[13.5px] text-neutral-600">
          Problem with this order?{" "}
          <a
            href={problemLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-neutral-900 underline underline-offset-4"
          >
            Tell {merchant.businessName} on WhatsApp
          </a>
        </p>
      )}

      <Link
        href="/"
        className="mt-8 inline-block text-[13.5px] text-neutral-500 underline underline-offset-4 hover:text-neutral-900"
      >
        ← Back to the shop
      </Link>
    </div>
  );
}
