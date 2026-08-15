import Link from "next/link";
import { notFound } from "next/navigation";

import { CartView } from "@/components/store/cart-view";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";

export const metadata = {
  title: "Your cart",
};

export default async function CartPage({
  params,
}: PageProps<"/store/[subdomain]/cart">) {
  const { subdomain } = await params;

  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant || !merchant.isActive) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="text-[13.5px] text-neutral-500 hover:text-neutral-900"
      >
        ← Keep shopping
      </Link>

      <h1 className="mt-6 mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
        Your cart
      </h1>

      <CartView subdomain={subdomain} />
    </div>
  );
}
