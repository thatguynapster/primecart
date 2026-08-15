import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatGhs } from "@/lib/format";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import {
  listStorefrontCategories,
  listStorefrontProducts,
  priceRange,
  totalStock,
} from "@/lib/storefront/catalogue";

export async function generateMetadata({
  params,
}: PageProps<"/store/[subdomain]">) {
  const { subdomain } = await params;
  const merchant = await getMerchantBySubdomain(subdomain);

  return {
    title: merchant?.businessName ?? "Shop",
    description: merchant?.description ?? undefined,
  };
}

export default async function StorefrontHome({
  params,
  searchParams,
}: PageProps<"/store/[subdomain]">) {
  const { subdomain } = await params;
  const query = await searchParams;

  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant || !merchant.isActive) notFound();

  const category = typeof query.category === "string" ? query.category : undefined;
  const search = typeof query.q === "string" ? query.q : undefined;

  const [products, categories] = await Promise.all([
    listStorefrontProducts(merchant.id, { search, category }),
    listStorefrontCategories(merchant.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {merchant.description && (
        <p className="mb-8 max-w-lg text-[15px] leading-relaxed text-neutral-600">
          {merchant.description}
        </p>
      )}

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder="Search"
          aria-label="Search products"
          className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-[15px] outline-none focus:border-neutral-900 sm:max-w-xs"
        />
        {category && <input type="hidden" name="category" value={category} />}
      </form>

      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/"
            className={
              category
                ? "rounded-full border border-neutral-300 px-3.5 py-1.5 text-[13px] transition-colors hover:border-neutral-500"
                : "rounded-full border border-neutral-900 bg-neutral-900 px-3.5 py-1.5 text-[13px] text-white"
            }
          >
            All
          </Link>
          {categories.map((name) => (
            <Link
              key={name}
              href={`/?category=${encodeURIComponent(name)}`}
              className={
                category === name
                  ? "rounded-full border border-neutral-900 bg-neutral-900 px-3.5 py-1.5 text-[13px] text-white"
                  : "rounded-full border border-neutral-300 px-3.5 py-1.5 text-[13px] transition-colors hover:border-neutral-500"
              }
            >
              {name}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center">
          <p className="text-[15px] font-medium">
            {search || category ? "Nothing here yet." : "This shop is just getting started."}
          </p>
          <p className="mt-2 text-[14px] text-neutral-500">
            {search || category
              ? "Try another search."
              : "Check back soon for products."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {products.map((product) => {
            const range = priceRange(product);
            const soldOut = totalStock(product) === 0;

            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-[13px] text-neutral-400">
                      No photo
                    </span>
                  )}

                  {soldOut && (
                    <span className="absolute top-2 left-2 rounded-full bg-neutral-900/85 px-2.5 py-1 text-[11px] font-medium text-white">
                      Sold out
                    </span>
                  )}
                </div>

                <p className="mt-3 text-[14px] leading-snug font-medium">
                  {product.name}
                </p>
                {range && (
                  <p className="mt-0.5 text-[13.5px] text-neutral-600">
                    {range.min === range.max
                      ? formatGhs(range.min)
                      : `${formatGhs(range.min)} – ${formatGhs(range.max)}`}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
