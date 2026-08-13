import Link from "next/link";

import { DashboardPreview } from "@/components/site/dashboard-preview";
import { HashScroll } from "@/components/site/hash-scroll";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * Marketing site — primecart.app root domain.
 *
 * Copy speaks to the shop floor rather than to software buyers: the reader
 * runs a phone-accessory or fashion stall, already sells over WhatsApp, and
 * tracks stock in a notebook. Every claim maps to something in MVP scope.
 */

const PROBLEMS = [
  {
    title: "Stock lives in a notebook",
    body: "You count on Sunday, sell all week, and by Thursday the number means nothing. The only way to know is to count again.",
  },
  {
    title: "Orders arrive in WhatsApp",
    body: "Between chats you lose track of who paid, who is still waiting, and what you promised to hold for someone.",
  },
  {
    title: "Nothing talks to anything",
    body: "A sale in the shop does not change the number a customer sees online. You find out you oversold when they do.",
  },
];

const FEATURES = [
  {
    label: "Inventory",
    title: "Every variant counted once",
    body: "Each size and colour keeps its own stock count. Set a low-stock level per variant and get told before you run out, not after.",
  },
  {
    label: "Orders",
    title: "One list, every channel",
    body: "Storefront sales appear on their own. Walk-ins and WhatsApp orders you add in a few taps. Same list, same stock, one status to move.",
  },
  {
    label: "Storefront",
    title: "A shop link you can send",
    body: "yourshop.primecart.app, built for the phone your customers actually hold. Your name, your logo, your colour. Nothing to design.",
  },
  {
    label: "Reports",
    title: "Numbers you will use",
    body: "What sold today, this week, this month. Which products carry the shop. What your stock is worth right now.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-[#F5F5F4] text-neutral-900">
      <HashScroll />
      <SiteHeader />

      <main className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          {/* 64px rule grid, faded out towards the edges so it reads as
              texture rather than graph paper. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(0_0_0/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(0_0_0/0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,#000_35%,transparent_100%)]"
          />

          {/* A few filled cells, aligned to the same 64px grid, to give the
              backdrop weight without introducing another element type. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <span className="absolute top-[128px] left-[6%] hidden size-16 bg-neutral-900/[0.035] lg:block" />
            <span className="absolute top-[320px] left-[14%] hidden size-16 bg-neutral-900/[0.05] lg:block" />
            <span className="absolute top-[192px] right-[9%] hidden size-16 bg-neutral-900/[0.045] lg:block" />
            <span className="absolute top-[384px] right-[17%] hidden size-16 bg-neutral-900/[0.03] lg:block" />
          </div>

          <div className="relative mx-auto max-w-6xl px-5 pt-20 sm:px-8 sm:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-300/80 bg-white/70 px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-600">
                <span className="size-1.5 rounded-full bg-neutral-900" />
                30 days free — no card needed
              </span>

              <h1 className="font-display mt-8 text-[2.5rem] leading-[0.95] font-extrabold tracking-[-0.04em] text-balance text-neutral-900 sm:text-[4rem] lg:text-[4.75rem]">
                Stop guessing what&rsquo;s in stock.
              </h1>

              <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-neutral-600 sm:text-[17px]">
                PrimeCart keeps your stock, your orders and your online shop in
                one place — so a sale on WhatsApp and a sale on your storefront
                count down the same number.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="w-full rounded-full bg-neutral-900 px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-700 sm:w-auto"
                >
                  Start free trial
                </Link>
                <a
                  href="#features"
                  className="w-full rounded-full border border-neutral-300 bg-white/60 px-6 py-3 text-center text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-white sm:w-auto"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Cropped at the fold on purpose — there is more product below. */}
            <div className="mx-auto mt-14 max-w-4xl sm:mt-20">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Problem                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="why"
          className="scroll-mt-16 border-t border-neutral-200 bg-white"
        >
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-[12.5px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
                Before PrimeCart
              </p>
              <h2 className="font-display mt-4 text-3xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance text-neutral-900 sm:text-[2.75rem]">
                Your stock lives in three places at once.
              </h2>
            </div>

            <div className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-3">
              {PROBLEMS.map((problem) => (
                <div
                  key={problem.title}
                  className="rounded-2xl border border-neutral-200 bg-[#FAFAF9] p-7 sm:p-8"
                >
                  <h3 className="font-display text-[17px] font-bold tracking-tight text-neutral-900">
                    {problem.title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-neutral-600">
                    {problem.body}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-12 max-w-2xl text-[15px] leading-relaxed text-neutral-500 sm:mt-16">
              PrimeCart puts all three in one place. You add a product once. It
              sells in the shop, over WhatsApp, or through your storefront link
              — and the count goes down the same way every time.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Features                                                         */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="features"
          className="scroll-mt-16 border-t border-neutral-200 bg-[#F5F5F4]"
        >
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-[12.5px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
                What you get
              </p>
              <h2 className="font-display mt-4 text-3xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance text-neutral-900 sm:text-[2.75rem]">
                Four things, done properly.
              </h2>
            </div>

            <div className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.label}
                  className="rounded-2xl border border-neutral-200/80 bg-white p-7 shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition-shadow hover:shadow-[0_8px_30px_-12px_rgb(0_0_0/0.15)] sm:p-9"
                >
                  <p className="text-[12px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
                    {feature.label}
                  </p>
                  <h3 className="font-display mt-3 text-xl font-bold tracking-tight text-neutral-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-neutral-600">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Pricing                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="pricing"
          className="scroll-mt-16 border-t border-neutral-200 bg-white"
        >
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-[12.5px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
                Pricing
              </p>
              <h2 className="font-display mt-4 text-3xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance text-neutral-900 sm:text-[2.75rem]">
                One price. No hidden charges.
              </h2>
            </div>

            <div className="mt-12 grid gap-5 sm:mt-16 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-2xl border border-neutral-900 bg-neutral-900 p-8 text-white sm:p-10">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl font-extrabold tracking-[-0.04em]">
                    GHS 79
                  </span>
                  <span className="text-sm text-neutral-400">/ month</span>
                </div>
                <p className="mt-3 text-[14px] text-neutral-300">
                  Everything below, for one shop. Start with 30 days free — no
                  card needed to begin.
                </p>

                <ul className="mt-8 space-y-3 text-[14px] text-neutral-200">
                  {[
                    "Unlimited products and variants",
                    "Your own storefront link",
                    "Orders from storefront, walk-in and WhatsApp",
                    "Low-stock alerts",
                    "Sales and stock reports",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1 shrink-0 rounded-full bg-neutral-500"
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/sign-up"
                  className="mt-9 block rounded-full bg-white px-6 py-3 text-center text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
                >
                  Start free trial
                </Link>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F4] p-8 sm:p-10">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl font-extrabold tracking-[-0.04em] text-neutral-900">
                    3%
                  </span>
                  <span className="text-sm text-neutral-500">
                    / storefront sale
                  </span>
                </div>

                <p className="mt-5 text-[14px] leading-relaxed text-neutral-700">
                  We charge 3% on storefront sales only. That 3% covers all
                  payment processing fees — no hidden charges on top. Manual
                  orders are always free. You keep 97% of every sale.
                </p>

                <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-5">
                  <p className="text-[12px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
                    On a GHS 200 order
                  </p>
                  <dl className="mt-4 space-y-2.5 text-[14px]">
                    <div className="flex justify-between text-neutral-600">
                      <dt>Customer pays</dt>
                      <dd className="font-mono tabular-nums">GHS 200.00</dd>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <dt>PrimeCart fee (3%)</dt>
                      <dd className="font-mono tabular-nums">− GHS 6.00</dd>
                    </div>
                    <div className="flex justify-between border-t border-neutral-200 pt-2.5 font-medium text-neutral-900">
                      <dt>You receive</dt>
                      <dd className="font-mono tabular-nums">GHS 194.00</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Closing CTA                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-neutral-200 bg-[#F5F5F4]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance text-neutral-900 sm:text-[2.75rem]">
                Count your stock once. Then let it count itself.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-neutral-600">
                Set up your shop in an afternoon. Thirty days free, and nothing
                to pay until you have seen it work.
              </p>
              <Link
                href="/sign-up"
                className="mt-8 inline-block rounded-full bg-neutral-900 px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
