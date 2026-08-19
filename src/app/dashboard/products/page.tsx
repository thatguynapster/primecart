import Image from "next/image";
import Link from "next/link";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import {
  Card,
  EmptyState,
  btnPrimary,
} from "@/components/dashboard/nocturne/ui";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { formatGhs } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant/current";
import { isLowStock, listProducts } from "@/lib/products/queries";

export const metadata = { title: "Products — PrimeCart" };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default async function ProductsPage({
  searchParams,
}: PageProps<"/dashboard/products">) {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront!;
  const params = await searchParams;

  const filter = typeof params.filter === "string" ? params.filter : "all";
  const search = typeof params.q === "string" ? params.q : undefined;

  // Carried onto every product link below, so navigating back from a detail
  // page returns to this exact filter/search instead of the bare list.
  const listQuery = new URLSearchParams();
  if (filter !== "all") listQuery.set("filter", filter);
  if (search) listQuery.set("q", search);
  const backTo = `/dashboard/products${listQuery.size > 0 ? `?${listQuery}` : ""}`;

  // One read, then counted three ways — the filter chips need all the totals
  // regardless of which is active.
  const all = await listProducts(merchant.id, { search });

  const active = all.filter((product) => product.isActive);
  const archived = all.filter((product) => !product.isActive);
  const low = active.filter((product) =>
    product.variants.some((variant) => variant.isActive && isLowStock(variant))
  );

  const shown =
    filter === "archived" ? archived : filter === "low" ? low : active;

  const chips = [
    { key: "all", label: `All ${active.length}` },
    { key: "low", label: `Low stock ${low.length}` },
    { key: "archived", label: `Archived ${archived.length}` },
  ];

  return (
    <>
      <TopBar
        title="Products"
        subtitle={`${active.length} active · ${low.length} low on stock`}
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <div className="flex flex-col gap-3 px-6 pt-5 pb-10">
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => {
            const isActive = chip.key === filter;
            return (
              <Link
                key={chip.key}
                href={
                  chip.key === "all"
                    ? "/dashboard/products"
                    : `/dashboard/products?filter=${chip.key}`
                }
                className={`rounded-sm px-2.5 py-0.75 text-xs tracking-wide transition-colors ${isActive
                    ? "bg-nk-accent-800 text-nk-accent-100"
                    : "border border-nk-accent text-nk-accent hover:bg-nk-accent/10"
                  }`}
              >
                {chip.label}
              </Link>
            );
          })}

          <div className="flex-1" />
          <Link href="/dashboard/products/new" className={btnPrimary()}>
            Add product
          </Link>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            title={
              search
                ? "Nothing matched that search."
                : filter === "archived"
                  ? "Nothing archived."
                  : filter === "low"
                    ? "Nothing is running low."
                    : "No products yet."
            }
            body={
              filter === "all" && !search
                ? "Add your first product and it appears on your shop straight away."
                : "Try another filter."
            }
            action={
              filter === "all" && !search ? (
                <Link href="/dashboard/products/new" className={btnPrimary()}>
                  Add product
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((product) => {
              const variants = product.variants.filter((v) => v.isActive);
              const units = variants.reduce((sum, v) => sum + v.stock, 0);
              const runningLow = variants.some(isLowStock);
              const prices = variants.map((v) => v.price);
              const price =
                prices.length === 0
                  ? "—"
                  : Math.min(...prices) === Math.max(...prices)
                    ? formatGhs(prices[0])
                    : `from ${formatGhs(Math.min(...prices))}`;

              // Fill is relative to the largest threshold on the product, so
              // the bar means "how close to reordering", not a share of stock.
              const ceiling = Math.max(
                ...variants.map((v) => v.lowStockThreshold * 4),
                1
              );

              return (
                <Link
                  key={product.id}
                  href={`/dashboard/products/${product.id}?from=${encodeURIComponent(backTo)}`}
                >
                  <Card className="flex gap-3 p-3.25 transition-colors hover:border-nk-neutral-700">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt=""
                        width={66}
                        height={66}
                        className="size-16.5 flex-none rounded-md border border-nk-neutral-800 object-cover"
                      />
                    ) : (
                      <span
                        className={`grid size-16.5 flex-none place-items-center rounded-md border text-lg font-medium ${runningLow
                            ? "border-nk-accent-700 text-nk-accent-300"
                            : "border-nk-neutral-800 text-nk-neutral-500"
                          }`}
                      >
                        {initials(product.name)}
                      </span>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col gap-1.25">
                      <div className="flex items-baseline justify-between gap-2.5">
                        <span className="truncate text-sm">
                          {product.name}
                        </span>
                        <span className="flex-none text-sm font-medium">
                          {price}
                        </span>
                      </div>

                      <span className="truncate text-xs text-nk-neutral-600">
                        {variants.length}{" "}
                        {variants.length === 1 ? "option" : "options"}
                        {product.category ? ` · ${product.category}` : ""}
                      </span>

                      <div className="mt-0.5 h-1.25 overflow-hidden rounded-full bg-nk-neutral-800">
                        <div
                          style={{
                            width: `${Math.min(100, (units / ceiling) * 100)}%`,
                          }}
                          className={`h-full rounded-full ${runningLow ? "bg-nk-accent-500" : "bg-nk-neutral-600"
                            }`}
                        />
                      </div>

                      <span
                        className={`text-xs ${runningLow
                            ? "text-nk-accent-300"
                            : "text-nk-neutral-600"
                          }`}
                      >
                        {runningLow
                          ? `${units} units left — restock`
                          : `${units} units in stock`}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
