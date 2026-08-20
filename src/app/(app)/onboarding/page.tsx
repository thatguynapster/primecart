import Image from "next/image";
import { redirect } from "next/navigation";

import { getRootDomain } from "@/lib/domain";
import { hasCompletedOnboarding, requireMerchant } from "@/lib/merchant/current";
import { listGhanaianBanks } from "@/lib/paystack";
import { OnboardingForm } from "./onboarding-form";

export const metadata = {
  title: "Set up your shop — PrimeCart",
};

export default async function OnboardingPage() {
  const merchant = await requireMerchant();

  // Onboarding is one-time. Returning here afterwards would offer to claim a
  // second subdomain and create a second Paystack subaccount.
  if (hasCompletedOnboarding(merchant)) {
    redirect("/dashboard");
  }

  const banks = await listGhanaianBanks();

  return (
    <div className="min-h-full bg-[#F5F5F4] text-neutral-900">
      <header className="border-b border-neutral-200/70">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-2.5 px-5 sm:px-8">
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
      </header>

      <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-[2.5rem]">
          Set up your shop.
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-600">
          A few details and your shop is live. You can change any of this later
          — except your shop address, so pick one you are happy to keep.
        </p>

        <div className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.03)] sm:p-9">
          <OnboardingForm
            banks={banks}
            rootDomain={getRootDomain()}
            defaultBusinessName={merchant.name}
          />
        </div>

        <p className="mt-6 text-center text-[13px] text-neutral-500">
          Adding your logo comes next, from your dashboard.
        </p>
      </main>
    </div>
  );
}
