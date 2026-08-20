import Link from "next/link";
import { notFound } from "next/navigation";

import { formatGhs } from "@/lib/format";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { prisma } from "@/lib/prisma";

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
 */
export default async function OrderStatusPage({
  params,
}: PageProps<"/store/[subdomain]/orders/[orderId]">) {
  const { subdomain, orderId } = await params;

  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant) notFound();

  const order = await prisma.order.findFirst({
    where: { merchantId: merchant.id, id: orderId },
  });
  if (!order) notFound();

  const isPaid = order.paymentStatus === "PAID";
  const isWaiting = order.status === "PENDING" && order.paymentStatus === "UNPAID";
  const isExpired = order.status === "EXPIRED";
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-[13px] text-neutral-500">Order {order.orderNumber}</p>

      {isPaid && (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Thank you! Your order is confirmed.
          </h1>
          <p className="mt-2 text-[14px] text-neutral-600">
            A receipt has been sent to your email.
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

      {!isPaid && !isWaiting && !isExpired && !isCancelled && (
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Order status: {order.status.toLowerCase()}
        </h1>
      )}

      <div className="mt-8 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200">
        {order.lineItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-[14px] font-medium">{item.productName}</p>
              <p className="text-[12.5px] text-neutral-500">
                {item.variantName} · qty {item.quantity}
              </p>
            </div>
            <p className="text-[14px] font-medium tabular-nums">
              {formatGhs(item.subtotal)}
            </p>
          </div>
        ))}

        <div className="flex items-center justify-between p-4">
          <p className="text-[14px] font-medium">Total</p>
          <p className="text-[16px] font-semibold tabular-nums">
            {formatGhs(order.total)}
          </p>
        </div>
      </div>

      {order.shippingAddress && (
        <div className="mt-6">
          <p className="text-[13px] font-medium text-neutral-700">Delivery to</p>
          <p className="mt-1 text-[13.5px] text-neutral-600">
            {order.shippingAddress.name} · {order.shippingAddress.phone}
            <br />
            {order.shippingAddress.address}, {order.shippingAddress.city}
            {order.shippingAddress.region ? `, ${order.shippingAddress.region}` : ""}
          </p>
        </div>
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
