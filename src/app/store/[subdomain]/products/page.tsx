import Link from "next/link";
import { notFound } from "next/navigation";

import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import {
  listStorefrontCategories,
  listStorefrontProductsPage,
} from "@/lib/storefront/catalogue";
import { ProductCard } from "@/components/store/product-card";

/**
 * The dedicated products listing (14.18) — where a category tile, the
 * header's category nav, or the header's search box now leads, instead of
 * the homepage switching into a flat results view. Paginated: a merchant's
 * full catalogue no longer has to load onto one page at once.
 */

const PAGE_SIZE = 24;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/store/[subdomain]/products">) {
  const { subdomain } = await params;
  const query = await searchParams;
  const merchant = await getMerchantBySubdomain(subdomain);
  const category = typeof query.category === "string" ? query.category : undefined;

  return {
    title: category
      ? `${category} — ${merchant?.businessName ?? "Shop"}`
      : `Products — ${merchant?.businessName ?? "Shop"}`,
  };
}

function pageHref(params: {
  category?: string;
  search?: string;
  page?: number;
}): string {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("q", params.search);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return `/products${qs ? `?${qs}` : ""}`;
}

export default async function StorefrontProductsPage({
  params,
  searchParams,
}: PageProps<"/store/[subdomain]/products">) {
  const { subdomain } = await params;
  const query = await searchParams;

  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant || !merchant.isActive) notFound();

  const category = typeof query.category === "string" ? query.category : undefined;
  const search = typeof query.q === "string" ? query.q : undefined;
  const requestedPage = typeof query.page === "string" ? Number(query.page) : 1;

  const [categories, result] = await Promise.all([
    listStorefrontCategories(merchant.id),
    listStorefrontProductsPage(merchant.id, {
      category,
      search,
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      pageSize: PAGE_SIZE,
    }),
  ]);

  const { products, total, page, totalPages } = result;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {search ? `Results for "${search}"` : category || "All Products"}
      </h1>
      <p className="mt-1.5 text-[13.5px] text-neutral-500">
        {total} {total === 1 ? "product" : "products"}
      </p>

      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={pageHref({ search })}
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
              href={pageHref({ category: name, search })}
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
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 p-12 text-center">
          <p className="text-[15px] font-medium">Nothing here yet.</p>
          <p className="mt-2 text-[14px] text-neutral-500">
            {search ? "Try another search." : "Check back soon for products."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} subdomain={subdomain} product={product} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4">
          <Link
            href={pageHref({ category, search, page: page - 1 })}
            aria-disabled={page <= 1}
            className={
              page <= 1
                ? "pointer-events-none rounded-full border border-neutral-200 px-4 py-2 text-[13px] text-neutral-300"
                : "rounded-full border border-neutral-300 px-4 py-2 text-[13px] transition-colors hover:border-neutral-500"
            }
          >
            ← Previous
          </Link>
          <span className="text-[13px] text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <Link
            href={pageHref({ category, search, page: page + 1 })}
            aria-disabled={page >= totalPages}
            className={
              page >= totalPages
                ? "pointer-events-none rounded-full border border-neutral-200 px-4 py-2 text-[13px] text-neutral-300"
                : "rounded-full border border-neutral-300 px-4 py-2 text-[13px] transition-colors hover:border-neutral-500"
            }
          >
            Next →
          </Link>
        </nav>
      )}
    </div>
  );
}
