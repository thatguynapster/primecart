import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import {
  Bar,
  Card,
  CardHeading,
  Kicker,
} from "@/components/dashboard/nocturne/ui";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { formatGhs } from "@/lib/format";
import {
  getAnalyticsKpis,
  getBestSellers,
  getChannelSplit,
  getOverviewKpis,
  getSalesReport,
  getStockValueByCategory,
} from "@/lib/dashboard/queries";
import { requireMerchant } from "@/lib/merchant/current";
import { SalesReport } from "./sales-report";

export const metadata = { title: "Analytics — PrimeCart" };

/** Channel colours are fixed by the handoff, brightest for storefront. */
const CHANNEL_FILL: Record<string, string> = {
  Storefront: "bg-nk-accent-500",
  Manual: "bg-nk-neutral-600",
  WhatsApp: "bg-nk-neutral-700",
};

export default async function AnalyticsPage() {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront!;

  const [kpis, overviewKpis, daily, weekly, monthly, channels, categories, bestSellers] =
    await Promise.all([
      getAnalyticsKpis(merchant.id),
      getOverviewKpis(merchant.id),
      getSalesReport(merchant.id, "daily"),
      getSalesReport(merchant.id, "weekly"),
      getSalesReport(merchant.id, "monthly"),
      getChannelSplit(merchant.id),
      getStockValueByCategory(merchant.id),
      getBestSellers(merchant.id, 8),
    ]);

  const bestSellerMax = Math.max(...bestSellers.map((item) => item.sold), 1);

  const cards = [
    { label: "Revenue 12 months", value: formatGhs(kpis.revenue), sub: "Last 12 months" },
    { label: "Orders", value: String(kpis.orders), sub: "Last 12 months" },
    { label: "Repeat rate", value: `${Math.round(kpis.repeatRate * 100)}%`, sub: "Last 12 months" },
    { label: "Refunds", value: String(kpis.refunds), sub: "Last 12 months" },
    // Current stock value (12.3) — a snapshot, not a trailing window, unlike
    // the four cards above.
    { label: "Current stock value", value: formatGhs(overviewKpis.stockValue), sub: "Right now" },
  ];

  return (
    <>
      <TopBar
        title="Analytics"
        subtitle="Last 12 months"
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <div className="flex flex-col gap-3.5 px-6 pt-5 pb-10">
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <Card key={card.label} className="flex flex-col gap-1.5 px-4 py-3.5">
              <Kicker className="text-nk-neutral-500">{card.label}</Kicker>
              <span className="text-2xl leading-none font-medium tracking-tight">
                {card.value}
              </span>
              <span className="text-xs text-nk-neutral-500">{card.sub}</span>
            </Card>
          ))}
        </div>

        <div className="grid gap-3.5 lg:grid-cols-5">
          <Card className="px-5 py-4.5 col-span-3">
            <div className="mb-4">
              <CardHeading>Total sales</CardHeading>
            </div>

            <SalesReport daily={daily} weekly={weekly} monthly={monthly} />
          </Card>

          <Card className="px-5 py-4.5 col-span-2">
            <div className="mb-3">
              <CardHeading>Best selling products</CardHeading>
            </div>

            {bestSellers.length === 0 ? (
              <p className="py-4 text-sm text-nk-neutral-600">
                Sell something to see your best sellers here.
              </p>
            ) : (
              bestSellers.map((item) => (
                <div key={item.name} className="flex items-center gap-3 py-1.75">
                  <span className="w-32 flex-none truncate text-sm text-nk-neutral-300 sm:w-48">
                    {item.name}
                  </span>
                  <Bar value={item.sold / bestSellerMax} />
                  <span className="w-16 flex-none text-right text-xs text-nk-neutral-500">
                    {item.sold} sold
                  </span>
                </div>
              ))
            )}
          </Card>
        </div>

        <div className="grid gap-3.5 lg:grid-cols-2">
          <Card className="px-5 py-4.5">
            <div className="mb-3">
              <CardHeading>Where orders come from</CardHeading>
            </div>

            {channels.map((channel) => (
              <div key={channel.name} className="flex items-center gap-3 py-1.75">
                <span className="w-27.5 text-sm text-nk-neutral-300">
                  {channel.name}
                </span>
                <Bar
                  value={channel.share}
                  fill={CHANNEL_FILL[channel.name] ?? "bg-nk-neutral-700"}
                />
                <span className="w-10.5 text-right text-xs text-nk-neutral-500">
                  {Math.round(channel.share * 100)}%
                </span>
              </div>
            ))}
          </Card>

          <Card className="px-5 py-4.5">
            <div className="mb-3">
              <CardHeading>Stock value by category</CardHeading>
            </div>

            {categories.length === 0 ? (
              <p className="py-4 text-sm text-nk-neutral-600">
                Add products to see where your stock value sits.
              </p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between gap-3 border-t border-nk-neutral-800 py-2"
                >
                  <span className="flex-1 truncate text-sm">
                    {category.name}
                  </span>
                  <span className="text-xs text-nk-neutral-600">
                    {category.units} units
                  </span>
                  <span className="text-sm font-medium">
                    {formatGhs(category.value)}
                  </span>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
