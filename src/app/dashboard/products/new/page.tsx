import Link from "next/link";

import { requireMerchant } from "@/lib/merchant/current";
import { listCategories } from "@/lib/products/queries";
import { isImageUploadConfigured } from "@/lib/r2";
import { NewProductForm } from "./new-product-form";

export const metadata = {
  title: "Add product — PrimeCart",
};

export default async function NewProductPage() {
  const merchant = await requireMerchant();
  const categories = await listCategories(merchant.id);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/dashboard/products"
        className="text-[13.5px] text-neutral-500 hover:text-neutral-900"
      >
        ← Products
      </Link>

      <h1 className="font-display mt-4 text-3xl font-extrabold tracking-[-0.03em]">
        Add product
      </h1>

      <div className="mt-8">
        <NewProductForm
          categories={categories}
          imagesEnabled={isImageUploadConfigured()}
        />
      </div>

      <p className="mt-6 text-[13px] text-neutral-500">
        You can add or change photos later from the product&rsquo;s page.
      </p>
    </main>
  );
}
