import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import {
  Avatar,
  Card,
  EmptyState,
  initialsOf,
} from "@/components/dashboard/nocturne/ui";
import { formatGhs } from "@/lib/format";
import { listCustomers } from "@/lib/dashboard/queries";
import { requireMerchant } from "@/lib/merchant/current";

export const metadata = { title: "Customers — PrimeCart" };

export default async function CustomersPage() {
  const merchant = await requireMerchant();
  const customers = await listCustomers(merchant.id);

  return (
    <>
      <TopBar
        title="Customers"
        subtitle={`${customers.length} ${customers.length === 1 ? "person has" : "people have"} bought from you`}
      />

      <div className="px-6 pt-5 pb-10">
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
                    { label: "Contact", align: "left" },
                    { label: "Orders", align: "right" },
                    { label: "Spent", align: "right" },
                    { label: "Last order", align: "right" },
                  ].map((column) => (
                    <th
                      key={column.label}
                      className={`bg-nk-neutral-900 px-4 py-2.25 text-xs font-medium tracking-widest text-nk-neutral-400 uppercase ${
                        column.align === "right" ? "text-right" : "text-left"
                      }`}
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
                    className="border-t border-nk-neutral-800"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={initialsOf(customer.name)} />
                        <span>{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-nk-neutral-500">
                      {customer.contact}
                    </td>
                    <td className="px-4 py-2.5 text-right">{customer.orders}</td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {formatGhs(customer.spent)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-nk-neutral-600">
                      {customer.lastOrder
                        ? new Date(customer.lastOrder).toLocaleDateString(
                            "en-GH",
                            { day: "numeric", month: "short" }
                          )
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
