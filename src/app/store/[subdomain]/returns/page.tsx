import { notFound } from "next/navigation";

import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { shopPreview } from "@/lib/storefront/preview";

export async function generateMetadata({ params }: PageProps<"/store/[subdomain]/returns">) {
  const { subdomain } = await params;
  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant) return { title: "Shop" };

  return {
    ...shopPreview(merchant),
    title: `Returns and refunds — ${merchant.businessName}`,
  };
}

/** The shop's own policy, in its own words. PrimeCart has none (D-23). */
export default async function ReturnsPage({ params }: PageProps<"/store/[subdomain]/returns">) {
  const { subdomain } = await params;
  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant || !merchant.isActive || !merchant.returnsPolicy) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Returns and refunds</h1>
      <p className="mt-6 text-[15px] leading-relaxed wrap-anywhere whitespace-pre-line text-neutral-700">
        {merchant.returnsPolicy}
      </p>
      <p className="mt-8 border-t border-neutral-200 pt-5 text-[13.5px] leading-relaxed text-neutral-600">
        This is {merchant.businessName}&rsquo;s own policy. The shop handles
        returns and refunds with you directly.
      </p>
    </div>
  );
}
