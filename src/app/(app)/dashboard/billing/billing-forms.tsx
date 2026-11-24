"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { formatGhs } from "@/lib/format";
import { OUTCOME_TEXT } from "@/lib/billing/outcome-text";
import type { Quote } from "@/lib/billing/state";
import {
  checkSubscriptionPayment,
  resumeSubscriptionPayment,
  startSubscriptionPayment,
  type BillingFormState,
  type ResumeState,
} from "./actions";

function ContinueSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-nk-accent-700 px-2.5 py-1 text-xs text-nk-accent-200 transition-colors hover:bg-nk-accent/12 disabled:opacity-45"
    >
      {pending ? "Opening…" : "Continue payment"}
    </button>
  );
}

/** Reopens the same Paystack checkout for a payment left unpaid. */
export function ContinuePaymentButton({ reference }: { reference: string }) {
  const [state, formAction] = useActionState<ResumeState, FormData>(
    resumeSubscriptionPayment,
    {}
  );
  const message = state.error ?? (state.outcome ? OUTCOME_TEXT[state.outcome] : null);

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="reference" value={reference} />
      <ContinueSubmit />
      {message && <span className="max-w-56 text-right text-xs text-nk-neutral-400">{message}</span>}
    </form>
  );
}

function PayButton({ amount }: { amount: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md border border-nk-accent bg-nk-accent/12 px-5 py-2.75 text-sm font-medium text-nk-accent-200 transition-colors hover:bg-nk-accent/20 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
    >
      {pending ? "Starting payment…" : `Pay ${amount}`}
    </button>
  );
}

/**
 * Monthly / Quarterly / Yearly with one Pay button. The client only ever
 * submits the interval name; the server re-prices it (never trust an amount
 * from the client).
 */
export function PlanPicker({
  quotes,
  preselected,
  foundingUntilLabel,
}: {
  quotes: Quote[];
  preselected: string;
  foundingUntilLabel: string | null;
}) {
  const [state, formAction] = useActionState<BillingFormState, FormData>(
    startSubscriptionPayment,
    {}
  );
  const [selected, setSelected] = useState(
    quotes.some((quote) => quote.interval === preselected) ? preselected : "MONTHLY"
  );
  const chosen = quotes.find((quote) => quote.interval === selected) ?? quotes[0];

  return (
    <form action={formAction} className="space-y-4">
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="sr-only">Billing period</legend>
        {quotes.map((quote) => {
          const active = quote.interval === selected;
          return (
            <label
              key={quote.interval}
              className={`relative flex cursor-pointer flex-col gap-1 rounded-md border p-4 transition-colors ${
                active
                  ? "border-nk-accent-600 bg-nk-accent-900"
                  : "border-nk-neutral-800 hover:bg-nk-accent-900/40"
              }`}
            >
              <input
                type="radio"
                name="interval"
                value={quote.interval}
                checked={active}
                onChange={() => setSelected(quote.interval)}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-2 text-sm font-medium text-nk-text">
                {quote.label}
                {quote.interval === "YEARLY" && (
                  <span className="rounded-sm border border-nk-accent-700 px-1.5 text-[11px] font-normal text-nk-accent-300">
                    2 months free
                  </span>
                )}
              </span>
              <span className="text-xl font-semibold tabular-nums text-nk-text">
                {formatGhs(quote.pesewas / 100)}
              </span>
              {quote.discounted ? (
                <span className="text-xs text-nk-neutral-500">
                  <s>{formatGhs(quote.listPesewas / 100)}</s> founding price
                </span>
              ) : (
                <span className="text-xs text-nk-neutral-500">
                  {quote.months === 1 ? "for 1 month" : `for ${quote.months} months`}
                </span>
              )}
            </label>
          );
        })}
      </fieldset>

      {foundingUntilLabel && (
        <p className="text-sm text-nk-accent-300">Founding price until {foundingUntilLabel}.</p>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-300">
          {state.error}
        </p>
      )}

      <PayButton amount={formatGhs(chosen.pesewas / 100)} />
      <p className="text-xs text-nk-neutral-500">
        Pay by MoMo or card through Paystack. Prepaid. Nothing renews
        automatically. Payments aren&rsquo;t refunded. You keep access until
        your paid time ends.
      </p>
    </form>
  );
}

/** For a payment still showing pending: re-checks it with Paystack. */
export function CheckPaymentButton({ reference }: { reference: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMessage(null);
          try {
            const outcome = await checkSubscriptionPayment(reference);
            setMessage(OUTCOME_TEXT[outcome] ?? null);
          } catch {
            setMessage("Couldn't check just now. Try again.");
          } finally {
            setPending(false);
          }
        }}
        className="rounded-md border border-nk-neutral-800 px-2.5 py-1 text-xs text-nk-text transition-colors hover:bg-nk-text/7 disabled:opacity-45"
      >
        {pending ? "Checking…" : "Check payment"}
      </button>
      {message && <span className="max-w-56 text-right text-xs text-nk-neutral-400">{message}</span>}
    </span>
  );
}

