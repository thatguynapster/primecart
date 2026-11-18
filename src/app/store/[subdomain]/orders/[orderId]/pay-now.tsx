"use client";

import { useActionState } from "react";

import { startOrderPayment, type PayNowState } from "./actions";

/** T10 — fresh Paystack link for an unpaid checkout-on order. */
export function PayNowButton({
  subdomain,
  orderId,
  label,
}: {
  subdomain: string;
  orderId: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState<PayNowState, FormData>(
    startOrderPayment.bind(null, subdomain, orderId),
    {}
  );

  return (
    <form action={formAction} className="mt-5">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl px-6 py-3 text-[14px] font-medium disabled:opacity-60"
        style={{ background: "var(--brand)", color: "var(--on-brand)" }}
      >
        {pending ? "Starting payment…" : label}
      </button>
      {state.error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
