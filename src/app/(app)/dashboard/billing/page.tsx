import Link from "next/link";

import { TopBar } from "@/components/dashboard/nocturne/top-bar";
import { Card } from "@/components/dashboard/nocturne/ui";
import { OUTCOME_TEXT } from "@/lib/billing/outcome-text";
import { getBillingState, getQuotes, stalePendingCutoff } from "@/lib/billing/state";
import { INTERVALS, parseInterval } from "@/lib/billing/plans";
import {
  merchantIdOfReference,
  verifyAndApplySubscriptionPayment,
  type ApplyOutcome,
} from "@/lib/billing/subscription";
import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { formatGhs, formatLongDate } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant/current";
import { prisma } from "@/lib/prisma";
import { CheckPaymentButton, ContinuePaymentButton, PlanPicker } from "./billing-forms";

export const metadata = { title: "Billing — PrimeCart" };

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Paid",
  PENDING: "Pending",
  APPLYING: "Being processed",
  FAILED: "Not completed",
  REVIEW: "Being checked",
};

/**
 * /dashboard/billing (D-18). Reachable while lapsed: it's how a lapsed
 * merchant gets back in.
 *
 * Coming back from Paystack (`?ref=`), the payment is verified and applied
 * right here through the same idempotent function the webhook uses, so
 * whichever arrives first wins. Paystack only retries a webhook that didn't
 * return 200, so this return path is the second chance if the webhook
 * acknowledged a payment it didn't apply.
 */
export default async function BillingPage({
  searchParams,
}: PageProps<"/dashboard/billing">) {
  let merchant = await requireMerchant();
  const storefront = merchant.storefront!;
  const { ref } = await searchParams;

  let returnOutcome: ApplyOutcome | null = null;
  if (typeof ref === "string" && merchantIdOfReference(ref) === merchant.id) {
    returnOutcome = await verifyAndApplySubscriptionPayment(ref);
    if (returnOutcome === "applied") {
      merchant = (await prisma.merchant.findUnique({ where: { id: merchant.id } })) ?? merchant;
    }
  }

  const billing = getBillingState(merchant);
  const { quotes } = getQuotes(merchant);
  const payments = await prisma.subscriptionPayment.findMany({
    where: {
      merchantId: merchant.id,
      OR: [
        { status: { in: ["SUCCESS", "APPLYING", "REVIEW"] } },
        { status: "PENDING", createdAt: { gte: stalePendingCutoff() } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  const statusLine =
    billing.status === "TRIAL"
      ? `Free trial — ${billing.daysLeft} ${billing.daysLeft === 1 ? "day" : "days"} left`
      : billing.status === "ACTIVE"
        ? billing.endsAt
          ? `Paid until ${formatLongDate(billing.endsAt)}`
          : "Active"
        : "Expired";

  const preselected = parseInterval(merchant.billingInterval) ?? "MONTHLY";

  return (
    <>
      <TopBar
        title="Billing"
        subtitle="Your PrimeCart plan"
        shopUrl={getStorefrontOrigin(storefront.subdomain)}
        shopLabel={`${storefront.subdomain}.${getRootDomain()}`}
      />

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        {returnOutcome && (
          <p
            role="status"
            className={`mb-6 rounded-md border px-4 py-3 text-sm ${
              returnOutcome === "applied" || returnOutcome === "already"
                ? "border-nk-accent-700 bg-nk-accent-900 text-nk-accent-200"
                : "border-nk-neutral-800 bg-nk-surface text-nk-neutral-300"
            }`}
          >
            {OUTCOME_TEXT[returnOutcome]}
          </p>
        )}

        <Card className="p-6 sm:p-8">
          <p className="text-xs tracking-widest text-nk-neutral-500 uppercase">Status</p>
          <p
            className={`mt-1 text-2xl font-medium tracking-tight ${
              billing.status === "LAPSED" ? "text-nk-accent-300" : "text-nk-text"
            }`}
          >
            {statusLine}
          </p>
          {billing.locked ? (
            <p className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
              {billing.offline
                ? "Your storefront is off and your dashboard is locked. "
                : `Your shop isn\u2019t taking new orders and your dashboard is locked. Your storefront goes off on ${
                    billing.offlineAt ? formatLongDate(billing.offlineAt) : "its closing date"
                  }. `}
              Choose a plan below to reopen both. Your storefront can take up
              to 5 minutes to come back.
            </p>
          ) : billing.status === "LAPSED" ? (
            <div className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
              <p>
                Your shop keeps taking orders until{" "}
                {billing.closesAt && formatLongDate(billing.closesAt)}. Until
                then you can view your dashboard and handle orders, but not
                change products or settings. After that, your shop stops taking
                new orders and your dashboard locks until you pay. Your
                storefront goes off completely on{" "}
                {billing.offlineAt && formatLongDate(billing.offlineAt)}.
              </p>
              <Link
                href="/dashboard"
                className="mt-3 inline-block font-medium text-nk-text underline underline-offset-4"
              >
                Continue to your dashboard
              </Link>
            </div>
          ) : billing.status === "TRIAL" && billing.endsAt ? (
            <p className="mt-2 text-sm text-nk-neutral-400">
              Everything is included during your trial, which ends{" "}
              {formatLongDate(billing.endsAt)}.
            </p>
          ) : null}
        </Card>

        <Card className="mt-6 p-6 sm:p-8">
          <h2 className="text-base font-medium tracking-tight">
            {billing.status === "LAPSED" ? "Choose a plan" : "Pay for your plan"}
          </h2>
          <p className="mt-1.5 mb-5 text-sm text-nk-neutral-400">
            Everything included: your shop, inventory, orders, profit and
            customer records. Your paid time starts when your current trial or
            plan ends.
          </p>
          <PlanPicker
            quotes={quotes}
            preselected={preselected}
            foundingUntilLabel={
              billing.foundingUntil ? formatLongDate(billing.foundingUntil) : null
            }
          />
          <p className="mt-5 border-t border-nk-neutral-800 pt-4 text-xs leading-relaxed text-nk-neutral-500">
            Online checkout on your storefront is optional and costs nothing
            extra here: PrimeCart keeps 3% of each order paid online,
            delivery included, with payment fees covered.
          </p>
        </Card>

        <Card className="mt-6 overflow-hidden">
          <div className="px-6 pt-5 pb-3">
            <h2 className="text-base font-medium tracking-tight">Payment history</h2>
          </div>
          {payments.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-nk-neutral-500">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs tracking-widest text-nk-neutral-500 uppercase">
                    <th className="px-6 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Covers</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-6 py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const interval = parseInterval(payment.interval);
                    return (
                      <tr key={payment.id} className="border-t border-nk-neutral-800 align-top">
                        <td className="px-6 py-3 whitespace-nowrap text-nk-neutral-300">
                          {formatLongDate(payment.paidAt ?? payment.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-nk-neutral-300">
                          {interval ? INTERVALS[interval].label : payment.interval}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-nk-neutral-500">
                          {payment.periodStart && payment.periodEnd
                            ? `${formatLongDate(payment.periodStart)} – ${formatLongDate(payment.periodEnd)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-nk-text">
                          {formatGhs(payment.amount)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {payment.status === "PENDING" ? (
                            <span className="inline-flex flex-wrap items-start justify-end gap-2">
                              {payment.authorizationUrl && (
                                <ContinuePaymentButton reference={payment.reference} />
                              )}
                              <CheckPaymentButton reference={payment.reference} />
                            </span>
                          ) : (
                            <span className="text-nk-neutral-400">
                              {STATUS_LABEL[payment.status] ?? payment.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
