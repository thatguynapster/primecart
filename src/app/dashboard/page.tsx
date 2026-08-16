import Link from "next/link";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import {
  Avatar,
  Bar,
  Card,
  CardHeading,
  Kicker,
  initialsOf,
} from "@/components/dashboard/nocturne/ui";
import { getRootDomain } from "@/lib/domain";
import { formatGhs, formatRelativeDate } from "@/lib/format";
import {
  getBestSellers,
  getLiveFeed,
  getOverviewKpis,
  getSalesSeries,
} from "@/lib/dashboard/queries";
import { requireMerchant } from "@/lib/merchant/current";
import { listLowStockVariants } from "@/lib/products/queries";

export const metadata = { title: "Overview — PrimeCart" };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function OverviewPage() {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront!;

  const [kpis, series, best, lowStock, feed] = await Promise.all([
    getOverviewKpis(merchant.id),
    getSalesSeries(merchant.id),
    getBestSellers(merchant.id),
    listLowStockVariants(merchant.id),
    getLiveFeed(merchant.id),
  ]);

  const firstName = merchant.name.split(/\s+/)[0];
  const seriesMax = Math.max(...series.map((day) => day.value), 1);
  const seriesTotal = series.reduce((sum, day) => sum + day.value, 0);
  const bestMax = Math.max(...best.map((item) => item.sold), 1);

  const cards = [
    {
      label: "Revenue 30 days",
      value: formatGhs(kpis.revenue),
      delta: `${kpis.orders} paid ${kpis.orders === 1 ? "order" : "orders"}`,
      attention: false,
    },
    {
      label: "Orders",
      value: String(kpis.orders),
      delta: "Last 30 days",
      attention: false,
    },
    {
      label: "Average order",
      value: formatGhs(kpis.averageOrder),
      delta: kpis.orders > 0 ? "Across paid orders" : "No paid orders yet",
      attention: false,
    },
    {
      label: "Stock value",
      value: formatGhs(kpis.stockValue),
      delta:
        kpis.lowStockCount > 0
          ? `${kpis.lowStockCount} running low`
          : "Nothing running low",
      attention: kpis.lowStockCount > 0,
    },
  ];

  return (
    <>
      <TopBar
        title={`${greeting()}, ${firstName}`}
        subtitle={`${storefront.businessName} · ${storefront.subdomain}.${getRootDomain()}`}
      />

      <div className="flex flex-col gap-4 px-6 pt-5 pb-10">
        {/* KPI row */}
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label} className="flex flex-col gap-1.5 px-4 py-3.5">
              <Kicker className="text-nk-neutral-500">{card.label}</Kicker>
              <span className="text-2xl leading-none font-medium tracking-tight">
                {card.value}
              </span>
              <span
                className={`text-xs ${card.attention ? "text-nk-accent-300" : "text-nk-neutral-400"}`}
              >
                {card.delta}
              </span>
            </Card>
          ))}
        </div>

        {/* Chart + live feed */}
        <div className="grid items-start gap-3.5 lg:grid-cols-[1.6fr_1fr]">
          <Card className="px-5 py-4.5">
            <div className="mb-4.5 flex items-baseline justify-between">
              <CardHeading>Sales, last 14 days</CardHeading>
              <span className="text-xs text-nk-neutral-500">
                {formatGhs(seriesTotal)} total
              </span>
            </div>

            <div className="flex h-50 items-end gap-2">
              {series.map((day, index) => (
                <div
                  key={index}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.75"
                >
                  <div
                    style={{ height: (day.value / seriesMax) * 180 }}
                    className={`w-full rounded-sm ${
                      index === series.length - 1
                        ? "bg-nk-accent-500"
                        : "bg-nk-accent-800"
                    }`}
                  />
                  <span className="text-xs text-nk-neutral-600">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="px-5 py-4.5">
            <div className="mb-3.5 flex items-center gap-2.5">
              <span className="animate-nk-pulse size-1.75 rounded-full bg-nk-accent" />
              <CardHeading>Live orders</CardHeading>
              <span className="ml-auto text-xs text-nk-neutral-600">
                Storefront
              </span>
            </div>

            {feed.length === 0 ? (
              <p className="py-6 text-sm text-nk-neutral-600">
                Storefront orders appear here the moment they are placed.
              </p>
            ) : (
              <div className="flex flex-col">
                {feed.map((order) => (
                  <div
                    key={order.id}
                    className="animate-nk-in flex items-center gap-2.5 border-t border-nk-neutral-800 py-2.25"
                  >
                    <Avatar initials={initialsOf(order.customer)} tone="accent" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{order.item}</div>
                      <div className="text-xs text-nk-neutral-600">
                        {order.customer} · {formatRelativeDate(order.createdAt)}
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {formatGhs(order.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Best sellers + low stock */}
        <div className="grid gap-3.5 lg:grid-cols-2">
          <Card className="px-5 py-4.5">
            <div className="mb-3">
              <CardHeading>Best sellers</CardHeading>
            </div>

            {best.length === 0 ? (
              <p className="py-4 text-sm text-nk-neutral-600">
                Nothing sold yet.
              </p>
            ) : (
              best.map((item) => (
                <div key={item.name} className="flex items-center gap-3 py-1.75">
                  <span className="w-37.5 truncate text-sm text-nk-neutral-300">
                    {item.name}
                  </span>
                  <Bar value={item.sold / bestMax} />
                  <span className="w-19.5 text-right text-xs text-nk-neutral-500">
                    {item.sold} sold
                  </span>
                </div>
              ))
            )}
          </Card>

          <Card className="px-5 py-4.5">
            <div className="mb-3 flex items-baseline justify-between">
              <CardHeading>Low stock</CardHeading>
              <Link
                href="/dashboard/products"
                className="text-xs text-nk-accent-300 hover:text-nk-accent-200"
              >
                Restock list →
              </Link>
            </div>

            {lowStock.length === 0 ? (
              <p className="py-4 text-sm text-nk-neutral-600">
                Nothing is below its low-stock level.
              </p>
            ) : (
              lowStock.slice(0, 5).map((item) => (
                <Link
                  key={`${item.productId}-${item.variantId}`}
                  href={`/dashboard/products/${item.productId}`}
                  className="flex items-center gap-2.5 border-t border-nk-neutral-800 py-2 transition-colors hover:bg-nk-neutral-800/35"
                >
                  <span className="flex-1 truncate text-sm">
                    {item.productName}
                  </span>
                  <span className="text-xs text-nk-neutral-600">
                    {item.variantName}
                  </span>
                  <span className="rounded-sm bg-nk-accent-800 px-2.5 py-0.75 text-xs text-nk-accent-100">
                    {item.stock} left
                  </span>
                </Link>
              ))
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
