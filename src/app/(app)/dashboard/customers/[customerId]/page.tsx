import Link from "next/link";
import { notFound } from "next/navigation";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import { Avatar, Card, EmptyState, initialsOf } from "@/components/dashboard/nocturne/ui";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { formatGhs, formatRelativeDate } from "@/lib/format";
import { getCustomer, getCustomerOrders } from "@/lib/customers/queries";
import { requireMerchant } from "@/lib/merchant/current";

export const metadata = { title: "Customer — PrimeCart" };

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default async function CustomerDetailPage({
  params,
}: PageProps<"/dashboard/customers/[customerId]">) {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront!;
  const { customerId } = await params;

  const customer = await getCustomer(merchant.id, customerId);
  if (!customer) notFound();

  const orders = await getCustomerOrders(merchant.id, customerId);
  const paidOrders = orders.filter((order) => order.paymentStatus === "PAID");
  const totalSpent = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const lastOrder = orders[0] ?? null;

  return (
    <>
      <TopBar
        title={customer.name}
        subtitle={`${orders.length} ${orders.length === 1 ? "order" : "orders"} · ${formatGhs(totalSpent)} spent`}
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/dashboard/customers"
        className="text-sm text-nk-neutral-500 hover:text-nk-text"
      >
        ← Customers
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <Avatar initials={initialsOf(customer.name)} size={40} />
        <h1 className="text-3xl font-medium tracking-tighter">{customer.name}</h1>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-nk-neutral-500">
        {customer.phone && <span>{customer.phone}</span>}
        {customer.email && <span>{customer.email}</span>}
        {!customer.phone && !customer.email && <span>No contact info recorded</span>}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-nk-neutral-500">Orders</p>
          <p className="mt-1 text-xl font-medium tabular-nums">{orders.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-nk-neutral-500">Total spent</p>
          <p className="mt-1 text-xl font-medium tabular-nums">{formatGhs(totalSpent)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-nk-neutral-500">Last order</p>
          <p
            className="mt-1 text-xl font-medium tabular-nums"
            title={lastOrder ? new Date(lastOrder.createdAt).toLocaleString("en-GH") : undefined}
          >
            {lastOrder ? formatRelativeDate(lastOrder.createdAt) : "—"}
          </p>
        </Card>
      </div>

      <h2 className="mt-8 text-sm font-medium tracking-tight text-nk-text">
        Order history
      </h2>

      {orders.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No orders yet." body="Orders placed by this customer will show up here." />
        </div>
      ) : (
        <Card className="mt-3 overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Order", "Status", "Payment", "Total", "Placed"].map((heading, index) => (
                  <th
                    key={heading}
                    className={`bg-nk-neutral-900 px-4 py-2.25 text-xs font-medium tracking-widest text-nk-neutral-400 uppercase ${
                      index >= 3 ? "text-right" : "text-left"
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="relative border-t border-nk-neutral-800 transition-colors hover:bg-nk-neutral-800/35"
                >
                  <td className="px-4 py-2.75 font-medium text-nk-accent-300">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="after:absolute after:inset-0 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2.75 text-nk-neutral-300">{titleCase(order.status)}</td>
                  <td
                    className={`px-4 py-2.75 ${
                      order.paymentStatus === "PAID" ? "text-nk-neutral-300" : "text-nk-accent-300"
                    }`}
                  >
                    {titleCase(order.paymentStatus)}
                  </td>
                  <td className="px-4 py-2.75 text-right font-medium">{formatGhs(order.total)}</td>
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
        </Card>
      )}
      </main>
    </>
  );
}
