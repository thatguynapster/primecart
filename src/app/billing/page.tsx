import Image from "next/image";
import Link from "next/link";

import { daysUntil } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant/current";
import { SubscribeButton } from "./subscribe-button";

export const metadata = { title: "Billing — PrimeCart" };

/**
 * Where the proxy sends a merchant whose `subscriptionStatus` is EXPIRED
 * (task 13.11), and where a TRIAL merchant can subscribe early. Sign-in is
 * required — D-14, resolved 2026-08-16: no public explainer variant. A
 * payment page charges a specific merchant's card, so a session is needed
 * regardless, and an anonymous visitor has no subscription to reactivate.
 *
 * Deliberately not a dashboard route — the proxy's subscription guard only
 * matches `/dashboard*`, so this page can never be the thing that redirects
 * an EXPIRED merchant back to itself.
 */
export default async function BillingPage() {
  const merchant = await requireMerchant();

  if (merchant.subscriptionStatus === "ACTIVE") {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-[2.5rem]">
          You&rsquo;re subscribed.
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-600">
          Your PrimeCart subscription is active. Nothing else to do here.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-block rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Back to dashboard
        </Link>
      </Shell>
    );
  }

  const trialActive = merchant.subscriptionStatus === "TRIAL";
  const daysLeft = trialActive ? daysUntil(merchant.trialExpiresAt) : 0;

  return (
    <Shell>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-[2.5rem]">
        {trialActive ? "Subscribe to PrimeCart." : "Your trial has ended."}
      </h1>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-600">
        {trialActive
          ? daysLeft === 0
            ? "Your free trial ends today. Subscribe now to keep your dashboard and storefront running without a gap."
            : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left on your free trial. Subscribe any time to continue after it ends.`
          : "Your storefront is offline and your dashboard is locked until you subscribe. Nothing was deleted — everything comes back the moment you pay."}
      </p>

      <div className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.03)] sm:p-9">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-neutral-500">PrimeCart</span>
          <span className="text-2xl font-semibold tracking-tight">
            GHS 79<span className="text-sm font-normal text-neutral-500">/month</span>
          </span>
        </div>
        <p className="mt-2 text-[13.5px] text-neutral-500">
          Plus 3% per storefront sale — covers all payment processing fees. Manual orders are always free.
        </p>

        <div className="mt-6">
          <SubscribeButton label={trialActive ? "Subscribe now" : "Reactivate my shop"} />
        </div>

        <p className="mt-4 text-center text-[12px] text-neutral-500">
          You will pay securely on Paystack.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#F5F5F4] text-neutral-900">
      <header className="border-b border-neutral-200/70">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-2.5 px-5 sm:px-8">
          <Image src="/logo.png" alt="" width={26} height={26} className="rounded-[5px]" />
          <span className="font-display text-[17px] font-bold tracking-tight">PrimeCart</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">{children}</main>
    </div>
  );
}
