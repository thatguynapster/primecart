import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import {
  Bar,
  Card,
  CardHeading,
  Kicker,
} from "@/components/dashboard/nocturne/ui";
import { formatGhs } from "@/lib/format";
import {
  getAnalyticsKpis,
  getChannelSplit,
  getMonthlyRevenue,
  getStockValueByCategory,
} from "@/lib/dashboard/queries";
import { requireMerchant } from "@/lib/merchant/current";

export const metadata = { title: "Analytics — PrimeCart" };

/** Channel colours are fixed by the handoff, brightest for storefront. */
const CHANNEL_FILL: Record<string, string> = {
  Storefront: "bg-nk-accent-500",
  Manual: "bg-nk-neutral-600",
  WhatsApp: "bg-nk-neutral-700",
};

export default async function AnalyticsPage() {
  const merchant = await requireMerchant();

  const [kpis, months, channels, categories] = await Promise.all([
    getAnalyticsKpis(merchant.id),
    getMonthlyRevenue(merchant.id),
    getChannelSplit(merchant.id),
    getStockValueByCategory(merchant.id),
  ]);

  const monthMax = Math.max(...months.map((month) => month.value), 1);
  const peak = months.reduce(
    (best, month, index) => (month.value > months[best].value ? index : best),
    0
  );

  const cards = [
    { label: "Revenue 12 months", value: formatGhs(kpis.revenue) },
    { label: "Orders", value: String(kpis.orders) },
    { label: "Repeat rate", value: `${Math.round(kpis.repeatRate * 100)}%` },
    { label: "Refunds", value: String(kpis.refunds) },
  ];

  return (
    <>
      <TopBar title="Analytics" subtitle="Last 12 months" />

      <div className="flex flex-col gap-3.5 px-6 pt-5 pb-10">
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label} className="flex flex-col gap-1.5 px-4 py-3.5">
              <Kicker className="text-nk-neutral-500">{card.label}</Kicker>
              <span className="text-2xl leading-none font-medium tracking-tight">
                {card.value}
              </span>
              <span className="text-xs text-nk-neutral-500">
                Last 12 months
              </span>
            </Card>
          ))}
        </div>

        <Card className="px-5 py-4.5">
          <div className="mb-4">
            <CardHeading>Revenue by month</CardHeading>
          </div>

          <div className="flex h-57.5 items-end gap-3">
            {months.map((month, index) => (
              <div
                key={index}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <div
                  style={{ height: (month.value / monthMax) * 210 }}
                  className={`w-full rounded-sm ${
                    // Only the peak month takes the accent; the rest stay muted.
                    index === peak && month.value > 0
                      ? "bg-nk-accent-500"
                      : "bg-nk-neutral-700"
                  }`}
                />
                <span className="text-xs text-nk-neutral-600">
                  {month.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

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
