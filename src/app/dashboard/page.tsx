import Link from "next/link";

import { getRootDomain } from "@/lib/domain";
import { requireMerchant } from "@/lib/merchant/current";
import { daysUntil, formatGhs } from "@/lib/format";
import { listLowStockVariants, listProducts } from "@/lib/products/queries";

export const metadata = {
  title: "Dashboard — PrimeCart",
};

/**
 * Overview. Orders, customers and full reporting arrive in Phases 10–12; for
 * now it answers the two questions a merchant has on opening the app — is my
 * shop live, and is anything about to run out.
 */
export default async function DashboardPage() {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront!;

  const [products, lowStock] = await Promise.all([
    listProducts(merchant.id, { activeOnly: true }),
    listLowStockVariants(merchant.id),
  ]);

  const stockValue = products.reduce(
    (total, product) =>
      total +
      product.variants
        .filter((variant) => variant.isActive)
        .reduce((sum, variant) => sum + variant.price * variant.stock, 0),
    0
  );

  const trialDaysLeft = daysUntil(merchant.trialExpiresAt);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-[12.5px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
        {storefront.businessName}
      </p>
      <h1 className="font-display mt-3 text-3xl font-extrabold tracking-[-0.03em] sm:text-[2.25rem]">
        Your shop is live.
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-[12px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
            Products
          </p>
          <p className="font-display mt-2 text-2xl font-bold tracking-tight">
            {products.length}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-[12px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
            Stock value
          </p>
          <p className="font-display mt-2 text-2xl font-bold tracking-tight">
            {formatGhs(stockValue)}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-[12px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
            Free trial
          </p>
          <p className="font-display mt-2 text-2xl font-bold tracking-tight">
            {trialDaysLeft} days left
          </p>
        </div>
      </div>

      {/* Low stock first: it is the only thing here that needs acting on. */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Running low
        </h2>

        {lowStock.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-neutral-300 p-6 text-[14px] text-neutral-500">
            Nothing is below its low-stock level.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {lowStock.map((item) => (
              <Link
                key={`${item.productId}-${item.variantId}`}
                href={`/dashboard/products/${item.productId}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">
                    {item.productName}
                  </p>
                  <p className="text-[12.5px] text-neutral-500">
                    {item.variantName}
                    {item.sku ? ` · ${item.sku}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[14px] tabular-nums">
                    {item.stock} left
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    alerts at {item.lowStockThreshold}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 rounded-2xl border border-dashed border-neutral-300 p-6 text-[14px] text-neutral-500">
        Orders, customers and reports arrive in the next phases. Your shop link
        is <span className="font-mono">{storefront.subdomain}.{getRootDomain()}</span>.
      </p>
    </main>
  );
}
