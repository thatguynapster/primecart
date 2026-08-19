import Link from "next/link";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { requireMerchant } from "@/lib/merchant/current";
import { listProducts } from "@/lib/products/queries";
import { NewOrderForm } from "./new-order-form";

export const metadata = { title: "New order — PrimeCart" };

export default async function NewOrderPage() {
  const merchant = await requireMerchant();
  const storefront = merchant.storefront!;
  const products = await listProducts(merchant.id, { activeOnly: true });

  const pickable = products
    .map((product) => ({
      id: product.id,
      name: product.name,
      variants: product.variants
        .filter((variant) => variant.isActive && variant.stock > 0)
        .map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: variant.price,
          stock: variant.stock,
        })),
    }))
    .filter((product) => product.variants.length > 0);

  return (
    <>
      <TopBar
        title="New order"
        subtitle="For a walk-in or WhatsApp sale"
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/dashboard/orders"
        className="text-sm text-nk-neutral-500 hover:text-nk-text"
      >
        ← Orders
      </Link>

      <h1 className="mt-4 text-3xl font-medium tracking-tighter">
        New order
      </h1>
      <p className="mt-2 text-sm text-nk-neutral-500">
        For a walk-in or WhatsApp sale. Prices and stock are taken from your
        current catalogue.
      </p>

      <div className="mt-8">
        <NewOrderForm products={pickable} />
      </div>
      </main>
    </>
  );
}
