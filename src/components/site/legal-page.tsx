import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * Where people write to PrimeCart about their data or their account. Set
 * SUPPORT_EMAIL in Vercel; the mailbox must exist before these pages go live.
 */
export function supportEmail(): string {
  return process.env.SUPPORT_EMAIL || "support@primecart.app";
}

/** Shared shell for /privacy and /terms (T14). */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-[#F5F5F4] text-neutral-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:px-8 sm:py-20">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-[2.5rem]">
          {title}
        </h1>
        <p className="mt-3 text-[13px] text-neutral-500">Last updated {updated}</p>
        <div className="legal mt-10 space-y-4 text-[15px] leading-relaxed text-neutral-700 [&_h2]:font-display [&_h2]:pt-6 [&_h2]:text-[19px] [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-neutral-900 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5 [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
