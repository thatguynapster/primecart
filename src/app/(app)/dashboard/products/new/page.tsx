import Link from "next/link";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { requireMerchant } from "@/lib/merchant/current";
import { listCategories } from "@/lib/products/queries";
import { isImageUploadConfigured } from "@/lib/r2";
import { NewProductForm } from "./new-product-form";

export const metadata = {
  title: "Add product — PrimeCart",
};

export default async function NewProductPage() {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront!;
  const categories = await listCategories(merchant.id);

  return (
    <>
      <TopBar
        title="Add product"
        subtitle="It appears on your shop straight away"
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/dashboard/products"
        className="text-sm text-nk-neutral-500 hover:text-nk-text"
      >
        ← Products
      </Link>

      <h1 className="mt-4 text-3xl font-medium tracking-tighter">
        Add product
      </h1>

      <div className="mt-8">
        <NewProductForm
          categories={categories}
          imagesEnabled={isImageUploadConfigured()}
        />
      </div>

      <p className="mt-6 text-sm text-nk-neutral-500">
        You can add or change photos later from the product&rsquo;s page.
      </p>
      </main>
    </>
  );
}
