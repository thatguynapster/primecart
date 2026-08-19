import Link from "next/link";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import {
  Card,
  EmptyState,
  btnPrimary,
} from "@/components/dashboard/nocturne/ui";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { formatGhs, formatRelativeDate } from "@/lib/format";
import { listOrders, type SavedView } from "@/lib/dashboard/queries";
import { requireMerchant } from "@/lib/merchant/current";

export const metadata = { title: "Orders — PrimeCart" };

const VIEWS: { key: SavedView; label: string }[] = [
  { key: "all", label: "All orders" },
  { key: "unpaid", label: "Unpaid" },
  { key: "fulfil", label: "To fulfil" },
  { key: "needs_review", label: "Needs review" },
  { key: "storefront", label: "Storefront only" },
  { key: "whatsapp", label: "WhatsApp" },
];

const PAGE_SIZE = 25;

/** Status pill colours come from the handoff's status table. */
function statusPill(status: string, paymentStatus: string): string {
  // Task 10.8: a paid order stuck at EXPIRED needs a merchant's attention,
  // not the same dim treatment as an ordinary lapsed reservation.
  if (status === "EXPIRED" && paymentStatus === "PAID") {
    return "border-nk-accent-700 text-nk-accent-300";
  }
  if (status === "DELIVERED") {
    return "border-nk-neutral-700 text-nk-neutral-300";
  }
  if (status === "PENDING" || status === "CANCELLED" || status === "EXPIRED") {
    return "border-nk-neutral-800 text-nk-neutral-500";
  }
  return "border-nk-accent-700 text-nk-accent-300";
}

function statusLabel(status: string, paymentStatus: string): string {
  if (status === "EXPIRED" && paymentStatus === "PAID") return "Needs review";
  return titleCase(status);
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default async function OrdersPage({
  searchParams,
}: PageProps<"/dashboard/orders">) {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront!;
  const params = await searchParams;

  // The saved view lives in the query string so a view is linkable.
  const requested = typeof params.view === "string" ? params.view : "all";
  const view = (VIEWS.some((v) => v.key === requested) ? requested : "all") as SavedView;

  const { rows, total } = await listOrders(merchant.id, view, PAGE_SIZE);

  // Carried onto every order link below, so navigating back from a detail
  // page returns to this exact view instead of always resetting to "All".
  const backTo = view === "all" ? "/dashboard/orders" : `/dashboard/orders?view=${view}`;

  return (
    <>
      <TopBar
        title="Orders"
        subtitle={`${total} ${total === 1 ? "order" : "orders"} in this view`}
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <div className="flex flex-col gap-3 px-6 pt-5 pb-10">
        <div className="flex flex-wrap items-center gap-1.5">
          {VIEWS.map((item) => {
            const active = item.key === view;
            return (
              <Link
                key={item.key}
                href={
                  item.key === "all"
                    ? "/dashboard/orders"
                    : `/dashboard/orders?view=${item.key}`
                }
                className={`rounded-md border px-3 py-1.25 text-xs transition-colors ${
                  active
                    ? "border-nk-accent-600 bg-nk-accent-900 text-nk-accent-200"
                    : "border-nk-neutral-800 text-nk-neutral-400 hover:bg-nk-accent-900/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={
              view === "all" ? "No orders yet." : "No orders match this view."
            }
            body={
              view === "all"
                ? "Storefront sales land here on their own. You can also add a walk-in or WhatsApp order yourself."
                : "Try another view."
            }
            action={
              view === "all" ? (
                <Link href="/dashboard/orders/new" className={btnPrimary()}>
                  New order
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="max-h-140 overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {[
                      "Order",
                      "Customer",
                      "Channel",
                      "Status",
                      "Payment",
                      "Total",
                      "Placed",
                    ].map((heading, index) => (
                      <th
                        key={heading}
                        className={`sticky top-0 z-10 bg-nk-neutral-900 px-4 py-2.25 text-xs font-medium tracking-widest text-nk-neutral-400 uppercase ${
                          index >= 5 ? "text-right" : "text-left"
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr
                      key={order.id}
                      className="relative border-t border-nk-neutral-800 transition-colors hover:bg-nk-neutral-800/35"
                    >
                      <td className="px-4 py-2.75 font-medium text-nk-accent-300">
                        {/* `after:absolute after:inset-0` stretches the hit
                            target over the whole row, not just this cell —
                            a table row can't be a Link itself. */}
                        <Link
                          href={`/dashboard/orders/${order.id}?from=${encodeURIComponent(backTo)}`}
                          className="after:absolute after:inset-0 hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.75 text-nk-neutral-200">
                        {order.customer}
                      </td>
                      <td className="px-4 py-2.75 text-nk-neutral-500">
                        {titleCase(order.channel)}
                      </td>
                      <td className="px-4 py-2.75">
                        <span
                          className={`inline-flex rounded-sm border px-2.5 py-0.5 text-xs ${statusPill(order.status, order.paymentStatus)}`}
                        >
                          {statusLabel(order.status, order.paymentStatus)}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.75 ${
                          order.paymentStatus === "PAID"
                            ? "text-nk-neutral-300"
                            : "text-nk-accent-300"
                        }`}
                      >
                        {titleCase(order.paymentStatus)}
                      </td>
                      <td className="px-4 py-2.75 text-right font-medium">
                        {formatGhs(order.total)}
                      </td>
                      <td
                        className="px-4 py-2.75 text-right text-nk-neutral-600"
                        title={new Date(order.createdAt).toLocaleString("en-GH")}
                      >
                        {formatRelativeDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-nk-neutral-800 px-4 py-2.25 text-xs text-nk-neutral-600">
              Showing {rows.length} of {total}{" "}
              {total === 1 ? "order" : "orders"}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
