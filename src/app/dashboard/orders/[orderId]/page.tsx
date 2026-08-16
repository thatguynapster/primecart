import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/dashboard/nocturne/ui";
import { formatGhs } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant/current";
import { getOrder } from "@/lib/orders/queries";
import { OrderActions } from "./order-actions";

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export const metadata = { title: "Order — PrimeCart" };

export default async function OrderDetailPage({
  params,
}: PageProps<"/dashboard/orders/[orderId]">) {
  const merchant = await requireMerchant();
  const { orderId } = await params;

  const order = await getOrder(merchant.id, orderId);
  if (!order) notFound();

  // Task 10.8: a payment that arrived after the order's reservation had
  // already expired — the webhook's late-recovery path recorded the money
  // but deliberately did not advance the order, because the stock it needs
  // is not confirmed available. Nothing else in the dashboard surfaces this
  // state, so it gets its own banner rather than blending into "Expired".
  const needsReview = order.status === "EXPIRED" && order.paymentStatus === "PAID";

  const shipping = order.shippingAddress;
  const contactName = shipping?.name ?? order.customer?.name ?? "Guest";
  const contactPhone = shipping?.phone ?? order.customer?.phone ?? null;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/dashboard/orders"
        className="text-sm text-nk-neutral-500 hover:text-nk-text"
      >
        ← Orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-medium tracking-tighter">
          {order.orderNumber}
        </h1>
        <span className="rounded-sm border border-nk-neutral-800 px-2.5 py-0.5 text-xs text-nk-neutral-400">
          {titleCase(order.status)}
        </span>
        <span
          className={`rounded-sm border px-2.5 py-0.5 text-xs ${
            order.paymentStatus === "PAID"
              ? "border-nk-neutral-800 text-nk-neutral-400"
              : "border-nk-accent-700 text-nk-accent-300"
          }`}
        >
          {titleCase(order.paymentStatus)}
        </span>
      </div>
      <p className="mt-1 text-sm text-nk-neutral-500">
        Placed{" "}
        {new Date(order.createdAt).toLocaleDateString("en-GH", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}{" "}
        · {titleCase(order.source)}
      </p>

      {needsReview && (
        <div className="mt-6 rounded-md border border-nk-accent-700 bg-nk-accent-900 px-5 py-4">
          <p className="text-sm font-medium text-nk-accent-200">
            Needs review — payment arrived after this order expired
          </p>
          <p className="mt-1.5 text-sm text-nk-accent-300">
            The customer&rsquo;s payment was confirmed after the 30-minute
            reservation lapsed, and the stock could not be automatically
            re-reserved. The payment is recorded (Paid), but the order was
            left Expired rather than confirmed, since the items it needs are
            not guaranteed to be available. Check stock and either fulfil this
            manually or contact the customer about a refund.
          </p>
        </div>
      )}

      <div className="mt-8">
        <OrderActions
          orderId={order.id}
          status={order.status}
          paymentStatus={order.paymentStatus}
        />
      </div>

      <Card className="mt-8 overflow-hidden">
        <div className="divide-y divide-nk-neutral-800">
          {order.lineItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.productName}</p>
                <p className="text-xs text-nk-neutral-500">
                  {item.variantName}
                  {item.sku ? ` · ${item.sku}` : ""} · qty {item.quantity}
                </p>
              </div>
              <p className="text-sm font-medium tabular-nums">
                {formatGhs(item.subtotal)}
              </p>
            </div>
          ))}

          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-sm font-medium">Total</p>
            <p className="text-base font-semibold tabular-nums">
              {formatGhs(order.total)}
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-medium tracking-tight text-nk-text">
            Customer
          </h2>
          <p className="mt-2 text-sm text-nk-neutral-300">{contactName}</p>
          {contactPhone && (
            <p className="text-sm text-nk-neutral-500">{contactPhone}</p>
          )}
          {order.customer?.email && (
            <p className="text-sm text-nk-neutral-500">{order.customer.email}</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium tracking-tight text-nk-text">
            Delivery
          </h2>
          {shipping ? (
            <p className="mt-2 text-sm text-nk-neutral-300">
              {shipping.address}
              <br />
              {shipping.city}
              {shipping.region ? `, ${shipping.region}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-nk-neutral-500">
              No delivery address recorded.
            </p>
          )}
        </Card>
      </div>

      {order.notes && (
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-medium tracking-tight text-nk-text">
            Notes
          </h2>
          <p className="mt-2 text-sm text-nk-neutral-300">{order.notes}</p>
        </Card>
      )}
    </main>
  );
}
