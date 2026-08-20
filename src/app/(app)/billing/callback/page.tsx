import Image from "next/image";
import Link from "next/link";

import { requireMerchant } from "@/lib/merchant/current";

export const metadata = { title: "Confirming payment — PrimeCart" };

/**
 * Where Paystack's `callback_url` sends the merchant's browser back after a
 * subscription payment.
 *
 * Read-only, same discipline as the storefront's own order-status page: the
 * webhook (`subscription.create`, task 13.8) is the only place a subscription
 * is actually marked active, never this page. A merchant landing here mid-
 * confirmation must not have this page race the webhook to decide the
 * outcome — it renders whatever is in the database at the moment of the
 * request and nothing more.
 */
export default async function BillingCallbackPage() {
  const merchant = await requireMerchant();
  const active = merchant.subscriptionStatus === "ACTIVE";

  return (
    <div className="min-h-full bg-[#F5F5F4] text-neutral-900">
      <header className="border-b border-neutral-200/70">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-2.5 px-5 sm:px-8">
          <Image src="/logo.png" alt="" width={26} height={26} className="rounded-[5px]" />
          <span className="font-display text-[17px] font-bold tracking-tight">PrimeCart</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-[2.5rem]">
          {active ? "You're all set." : "Confirming your payment…"}
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-600">
          {active
            ? "Your subscription is active — your dashboard and storefront are ready to go."
            : "This can take a minute. Refresh this page to check again, or head to your dashboard — it will unlock as soon as the payment is confirmed."}
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-block rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Go to dashboard
        </Link>
      </main>
    </div>
  );
}
