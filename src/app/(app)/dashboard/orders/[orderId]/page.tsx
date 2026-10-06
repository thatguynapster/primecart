import Link from "next/link";
import { notFound } from "next/navigation";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import { Card } from "@/components/dashboard/nocturne/ui";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { formatGhs, formatRelativeDate } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant/current";
import { getOrder } from "@/lib/orders/queries";
import {
  STOREFRONT_FEE_CAP_PESEWAS,
  STOREFRONT_FEE_RATE,
} from "@/lib/paystack";
import { OrderActions } from "./order-actions";

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/**
 * DEV-6 (Phase 15) — dashboard-only, never the storefront order page (§A.6).
 *
 * The same fallback `getProfitSummary` uses for a pre-D-16 storefront order
 * missing `platformFee`, applied per-order here for consistency: current
 * rate/cap, possibly off by the cap for an order placed before it existed.
 */
function orderPlatformFee(order: { platformFee: number | null; source: string; total: number }): number {
  if (order.platformFee != null) return order.platformFee;
  if (order.source !== "STOREFRONT") return 0;
  const feeCapGhs = STOREFRONT_FEE_CAP_PESEWAS / 100;
  return Math.min(order.total * STOREFRONT_FEE_RATE, feeCapGhs);
}

export const metadata = { title: "Order — PrimeCart" };

export default async function OrderDetailPage({
  params,
  searchParams,
}: PageProps<"/dashboard/orders/[orderId]">) {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront!;
  const { orderId } = await params;
  const { from } = await searchParams;

  const backHref =
    typeof from === "string" && from.startsWith("/dashboard/orders")
      ? from
      : "/dashboard/orders";

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

  // DEV-6 (Phase 15), §A.6 — dashboard only. Lines with an unknown cost
  // (null costPrice) are simply left out, same rule the analytics coverage
  // figure follows: never guess a cost, never show a false 100% margin.
  const costedLines = order.lineItems.filter((item) => item.costPrice != null);
  const costedRevenue = costedLines.reduce((sum, item) => sum + item.subtotal, 0);
  const cost = costedLines.reduce(
    (sum, item) => sum + item.costPrice! * item.quantity,
    0
  );
  const grossProfit = costedRevenue - cost;
  const fee = orderPlatformFee(order);
  const netProfit = grossProfit - fee;
  const hasAnyCost = costedLines.length > 0;
  const fullyCosted = costedLines.length === order.lineItems.length;

  return (
    <>
      <TopBar
        title={order.orderNumber}
        subtitle={`${titleCase(order.status)} · ${titleCase(order.paymentStatus)}`}
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href={backHref}
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
        <span title={new Date(order.createdAt).toLocaleString("en-GH")}>
          {formatRelativeDate(order.createdAt)}
        </span>{" "}
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
                {item.costPrice != null ? (
                  <p className="mt-0.5 text-xs text-nk-neutral-600">
                    Cost {formatGhs(item.costPrice * item.quantity)} · Margin{" "}
                    {formatGhs(item.subtotal - item.costPrice * item.quantity)}{" "}
                    (
                    {item.subtotal > 0
                      ? Math.round(
                          ((item.subtotal - item.costPrice * item.quantity) /
                            item.subtotal) *
                            100
                        )
                      : 0}
                    %)
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-nk-neutral-600">
                    Cost unknown
                  </p>
                )}
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

          {hasAnyCost && (
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm font-medium">
                Profit
                {!fullyCosted && (
                  <span className="ml-1.5 font-normal text-nk-neutral-500">
                    ({costedLines.length} of {order.lineItems.length} items)
                  </span>
                )}
              </p>
              <p className="text-base font-semibold tabular-nums">
                {formatGhs(netProfit)}
              </p>
            </div>
          )}
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
    </>
  );
}
