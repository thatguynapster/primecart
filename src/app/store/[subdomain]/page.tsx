import { notFound } from "next/navigation";

import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { getStorefrontBestSellers } from "@/lib/storefront/bestsellers";
import {
  getPreviewPhoto,
  listCategoryTiles,
  listFeaturedProducts,
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/lib/storefront/catalogue";
import { shopPreview } from "@/lib/storefront/preview";
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

  if (!merchant) return { title: "Shop" };

  return shopPreview(merchant, await getPreviewPhoto(merchant));
}

/**
 * Always the full sectioned homepage now (14.18) — category browsing and
 * search both moved to the dedicated `/products` listing, so this page no
 * longer branches into a flat results view. New Arrivals' own in-page tabs
 * still use a local `arrivals` param, unrelated to that page.
 */
export default async function StorefrontHome({
  params,
  searchParams,
}: PageProps<"/store/[subdomain]">) {
  const { subdomain } = await params;
  const query = await searchParams;

  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant || !merchant.isActive) notFound();

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
