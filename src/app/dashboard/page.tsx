import Image from "next/image";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { getRootDomain } from "@/lib/domain";
import { hasCompletedOnboarding, requireMerchant } from "@/lib/merchant/current";

export const metadata = {
  title: "Dashboard — PrimeCart",
};

/**
 * PLACEHOLDER — the real dashboard arrives with the product module (Phase 7)
 * and reporting (Phase 12). For now it confirms onboarding landed and gives the
 * merchant their shop link.
 */
export default async function DashboardPage() {
  const merchant = await requireMerchant();

  // A merchant record exists from first sign-in, but the storefront only after
  // onboarding. Anyone who has not finished is sent back to it.
  if (!hasCompletedOnboarding(merchant)) {
    redirect("/onboarding");
  }

  const storefront = merchant.storefront!;
  const shopUrl = `${storefront.subdomain}.${getRootDomain()}`;
  const trialDaysLeft = Math.max(
    0,
    Math.ceil((merchant.trialExpiresAt.getTime() - Date.now()) / 86_400_000)
  );

  return (
    <div className="min-h-full bg-[#F5F5F4] text-neutral-900">
      <header className="border-b border-neutral-200/70 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt=""
              width={26}
              height={26}
              className="rounded-[5px]"
            />
            <span className="font-display text-[17px] font-bold tracking-tight">
              PrimeCart
            </span>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-[12.5px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
          {storefront.businessName}
        </p>
        <h1 className="font-display mt-3 text-3xl font-extrabold tracking-[-0.03em] sm:text-[2.5rem]">
          Your shop is live.
        </h1>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-7">
            <p className="text-[12px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
              Shop address
            </p>
            <a
              href={`https://${shopUrl}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block font-mono text-[15px] break-all text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
            >
              {shopUrl}
            </a>
            <p className="mt-3 text-[13px] text-neutral-500">
              Send this link to customers. It works on any phone.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-7">
            <p className="text-[12px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
              Free trial
            </p>
            <p className="font-display mt-3 text-2xl font-bold tracking-tight">
              {trialDaysLeft} days left
            </p>
            <p className="mt-3 text-[13px] text-neutral-500">
              GHS 79/month after that. Nothing to pay until then.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 p-7 text-[14px] text-neutral-500">
          Products, orders, customers and reports arrive in the next phases.
        </div>
      </main>
    </div>
  );
}
