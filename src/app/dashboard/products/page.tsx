import Image from "next/image";
import Link from "next/link";

import { formatGhs } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant/current";
import { isLowStock, listProducts } from "@/lib/products/queries";

export const metadata = {
  title: "Products — PrimeCart",
};

export default async function ProductsPage({
  searchParams,
}: PageProps<"/dashboard/products">) {
  const merchant = await requireMerchant();
  const params = await searchParams;

  const search = typeof params.q === "string" ? params.q : undefined;
  const showArchived = params.archived === "1";

  const products = await listProducts(merchant.id, {
    activeOnly: !showArchived,
    search,
  });

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">
            Products
          </h1>
          <p className="mt-2 text-[14px] text-neutral-600">
            {showArchived
              ? "Archived products."
              : "Everything you have for sale."}
          </p>
        </div>

        <Link
          href="/dashboard/products/new"
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Add product
        </Link>
      </div>

      <form className="mt-7 flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder="Search products"
          className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[14px] outline-none focus:border-neutral-900 sm:max-w-xs"
        />
        {showArchived && <input type="hidden" name="archived" value="1" />}
        <button
          type="submit"
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-neutral-400"
        >
          Search
        </button>
        <Link
          href={
            showArchived ? "/dashboard/products" : "/dashboard/products?archived=1"
          }
          className="text-[13.5px] text-neutral-500 underline underline-offset-4 hover:text-neutral-900"
        >
          {showArchived ? "Show active" : "Show archived"}
        </Link>
      </form>

      {products.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-[15px] font-medium">
            {search
              ? "Nothing matched that search."
              : showArchived
                ? "Nothing archived."
                : "No products yet."}
          </p>
          {!search && !showArchived && (
            <>
              <p className="mx-auto mt-2 max-w-sm text-[14px] text-neutral-500">
                Add your first product and it appears on your shop straight
                away.
              </p>
              <Link
                href="/dashboard/products/new"
                className="mt-5 inline-block rounded-full bg-neutral-900 px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-neutral-700"
              >
                Add product
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="mt-8 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {products.map((product) => {
            const active = product.variants.filter((v) => v.isActive);
            const totalStock = active.reduce((sum, v) => sum + v.stock, 0);
            const lowCount = active.filter(isLowStock).length;
            const prices = active.map((v) => v.price);
            const priceLabel =
              prices.length === 0
                ? "—"
                : Math.min(...prices) === Math.max(...prices)
                  ? formatGhs(prices[0])
                  : `${formatGhs(Math.min(...prices))} – ${formatGhs(Math.max(...prices))}`;

            return (
              <Link
                key={product.id}
                href={`/dashboard/products/${product.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-neutral-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-lg border border-neutral-200 object-cover"
                    />
                  ) : (
                    <span className="size-10 shrink-0 rounded-lg border border-dashed border-neutral-300" />
                  )}
                  <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14.5px] font-medium">
                      {product.name}
                    </p>
                    {!product.isActive && (
                      <span className="shrink-0 rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] font-medium tracking-wide text-neutral-500 uppercase">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-neutral-500">
                    {active.length} {active.length === 1 ? "option" : "options"}
                    {product.category ? ` · ${product.category}` : ""}
                    {lowCount > 0 && (
                      <span className="text-neutral-900">
                        {" "}
                        · {lowCount} running low
                      </span>
                    )}
                  </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[13.5px] font-medium">{priceLabel}</p>
                  <p className="font-mono text-[12.5px] tabular-nums text-neutral-500">
                    {totalStock} in stock
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
