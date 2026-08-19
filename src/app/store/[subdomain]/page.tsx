import Link from "next/link";
import { notFound } from "next/navigation";

import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { getStorefrontBestSellers } from "@/lib/storefront/bestsellers";
import {
  listCategoryTiles,
  listFeaturedProducts,
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/lib/storefront/catalogue";
import { ProductCard } from "@/components/store/product-card";
import {
  CategoryTiles,
  Hero,
  MidPageBanner,
  NewArrivals,
  ProductSection,
} from "@/components/store/home-sections";

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

  // A category or search hit switches the whole page into a flat results
  // view — clicking a category tile or the header's category nav is meant to
  // browse that category, not repeat the homepage sections. New Arrivals'
  // own in-page tabs use a separate `arrivals` param precisely so they don't
  // trigger this.
  if (category || search) {
    return (
      <CategoryResults subdomain={subdomain} merchantId={merchant.id} category={category} search={search} />
    );
  }

  const arrivalsCategory =
    typeof query.arrivals === "string" ? query.arrivals : undefined;

  const [categories, tiles, bestSellers, featured, newArrivals] = await Promise.all([
    listStorefrontCategories(merchant.id),
    listCategoryTiles(merchant.id),
    getStorefrontBestSellers(merchant.id),
    listFeaturedProducts(merchant.id),
    listStorefrontProducts(merchant.id, { category: arrivalsCategory, limit: 12 }),
  ]);

  return (
    <div>
      <Hero merchant={merchant} />
      <CategoryTiles tiles={tiles} />
      <ProductSection title="Best Sellers" subdomain={subdomain} products={bestSellers} />
      <ProductSection title="Our Featured Collection" subdomain={subdomain} products={featured} />
      <MidPageBanner merchant={merchant} />
      <NewArrivals
        subdomain={subdomain}
        categories={categories}
        activeCategory={arrivalsCategory}
        products={newArrivals}
      />
    </div>
  );
}

/** The pre-redesign flat grid, kept for category/search results — now built on the shared ProductCard. */
async function CategoryResults({
  subdomain,
  merchantId,
  category,
  search,
}: {
  subdomain: string;
  merchantId: string;
  category?: string;
  search?: string;
}) {
  const [products, categories] = await Promise.all([
    listStorefrontProducts(merchantId, { search, category }),
    listStorefrontCategories(merchantId),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
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
          <p className="text-[15px] font-medium">Nothing here yet.</p>
          <p className="mt-2 text-[14px] text-neutral-500">Try another search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} subdomain={subdomain} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
