import Link from "next/link";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import {
  Avatar,
  Card,
  EmptyState,
  initialsOf,
} from "@/components/dashboard/nocturne/ui";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { formatGhs, formatRelativeDate } from "@/lib/format";
import { listCustomers } from "@/lib/dashboard/queries";
import { requireMerchant } from "@/lib/merchant/current";

export const metadata = { title: "Customers — PrimeCart" };

export default async function CustomersPage() {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront!;
  const customers = await listCustomers(merchant.id);

  return (
    <>
      <TopBar
        title="Customers"
        subtitle={`${customers.length} ${customers.length === 1 ? "person has" : "people have"} bought from you`}
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <div className="px-4 pt-5 pb-10 sm:px-6">
        {customers.length === 0 ? (
          <EmptyState
            title="No customers yet."
            body="Customers are created automatically from orders — both storefront sales and the ones you enter yourself."
          />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {[
                    { label: "Customer", align: "left" },
                    { label: "Contact", align: "left", wide: true },
                    { label: "Orders", align: "right", wide: true },
                    { label: "Spent", align: "right" },
                    { label: "Last order", align: "right", wide: true },
                  ].map((column) => (
                    <th
                      key={column.label}
                      className={`bg-nk-neutral-900 px-4 py-2.25 text-xs font-medium tracking-widest text-nk-neutral-400 uppercase ${column.align === "right" ? "text-right" : "text-left"
                        } ${"wide" in column ? "hidden md:table-cell" : ""}`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="relative border-t border-nk-neutral-800 transition-colors hover:bg-nk-neutral-800/35"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={initialsOf(customer.name)} />
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            className="text-nk-accent-300 after:absolute after:inset-0 hover:underline"
                          >
                            {customer.name}
                          </Link>
                          <span className="block text-xs break-all text-nk-neutral-500 md:hidden">
                            {customer.contact} · {customer.orders}{" "}
                            {customer.orders === 1 ? "order" : "orders"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-nk-neutral-500 md:table-cell">
                      {customer.contact}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right md:table-cell">{customer.orders}</td>
                    <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                      {formatGhs(customer.spent)}
                    </td>
                    <td
                      className="hidden px-4 py-2.5 text-right text-nk-neutral-600 md:table-cell"
                      title={
                        customer.lastOrder
                          ? new Date(customer.lastOrder).toLocaleString("en-GH")
                          : undefined
                      }
                    >
                      {customer.lastOrder
                        ? formatRelativeDate(customer.lastOrder)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  );
}
