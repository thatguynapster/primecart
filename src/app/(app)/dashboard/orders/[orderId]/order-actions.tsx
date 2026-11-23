"use client";

import { useId, useRef, useState } from "react";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

import { ButtonPrimary, ButtonSecondary, btnSecondary } from "@/components/dashboard/nocturne/ui";
import { advanceOrderStatus, cancelOrder, markOrderPaid } from "../actions";
import { canCancel, nextStatus } from "@/lib/orders/transitions";

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** "How was it paid?" (T12). Optional: "Skip" still marks the order paid. */
const METHODS = [
  { value: "MOMO", label: "MoMo" },
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Other" },
] as const;

type Pending = "advance" | "cancel" | "pay" | null;

export function OrderActions({
  orderId,
  status,
  paymentStatus,
  awaitingStock,
  whatsapp,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** D-18c: checkout-off order whose stock is taken on confirm / mark paid. */
  awaitingStock: boolean;
  /** One-tap wa.me link to the buyer, already built server-side. */
  whatsapp: { href: string; label: string } | null;
}) {
  const [pending, setPending] = useState<Pending>(null);
  const [choosingMethod, setChoosingMethod] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelDialog = useRef<HTMLDialogElement>(null);
  const cancelTitleId = useId();

  const next = nextStatus(status);
  const cancellable = canCancel(status);
  const canMarkPaid =
    paymentStatus === "UNPAID" && status !== "CANCELLED" && status !== "EXPIRED";

  async function run(action: Exclude<Pending, null>, method?: string) {
    setPending(action);
    setError(null);
    try {
      const result =
        action === "advance"
          ? await advanceOrderStatus(orderId)
          : action === "cancel"
            ? await cancelOrder(orderId)
            : await markOrderPaid(orderId, method ?? null);
      if (result?.error) setError(result.error);
      else setChoosingMethod(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(null);
      cancelDialog.current?.close();
    }
  }

  if (!next && !cancellable && !canMarkPaid && !whatsapp) return null;

  return (
    <div className="flex flex-col gap-3">
      {awaitingStock && (
        <p className="text-sm text-nk-neutral-400">
          Stock isn&rsquo;t taken for this order yet. It&rsquo;s deducted when you
          confirm the order or mark it paid.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {whatsapp && (
          <a
            href={whatsapp.href}
            target="_blank"
            rel="noopener noreferrer"
            className={btnSecondary()}
          >
            {whatsapp.label}
          </a>
        )}

        {canMarkPaid && !choosingMethod && (
          <ButtonSecondary
            onClick={() => {
              setError(null);
              setChoosingMethod(true);
            }}
            disabled={pending !== null}
          >
            Mark as paid
          </ButtonSecondary>
        )}

        {next && !(next === "CONFIRMED" && choosingMethod) && (
          <ButtonPrimary onClick={() => run("advance")} disabled={pending !== null}>
            {pending === "advance" ? "Updating…" : `Mark as ${titleCase(next)}`}
          </ButtonPrimary>
        )}

        {cancellable && !choosingMethod && (
          <ButtonSecondary
            onClick={() => cancelDialog.current?.showModal()}
            disabled={pending !== null}
          >
            Cancel order
          </ButtonSecondary>
        )}
      </div>

      {canMarkPaid && choosingMethod && (
        <div className="rounded-md border border-nk-neutral-800 bg-nk-surface p-4">
          <p className="text-sm font-medium text-nk-text">How was it paid?</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {METHODS.map((method) => (
              <ButtonSecondary
                key={method.value}
                onClick={() => run("pay", method.value)}
                disabled={pending !== null}
              >
                {method.label}
              </ButtonSecondary>
            ))}
            <button
              type="button"
              onClick={() => run("pay")}
              disabled={pending !== null}
              className="px-2 text-sm text-nk-neutral-500 underline underline-offset-4 hover:text-nk-text disabled:opacity-50"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => setChoosingMethod(false)}
              disabled={pending !== null}
              className="ml-auto px-2 text-sm text-nk-neutral-500 hover:text-nk-text disabled:opacity-50"
            >
              Back
            </button>
          </div>
          {pending === "pay" && (
            <p className="mt-2 text-xs text-nk-neutral-500">Marking paid…</p>
          )}
        </div>
      )}

      {/* Cancelling can't be undone, so it always asks first. */}
      <dialog
        ref={cancelDialog}
        aria-labelledby={cancelTitleId}
        onCancel={(event) => {
          if (pending !== null) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-md border border-nk-neutral-800 bg-nk-surface p-6 text-nk-text backdrop:bg-black/60"
      >
        <h2 id={cancelTitleId} className="text-base font-medium tracking-tight">
          Cancel this order?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
          This can&rsquo;t be undone.{" "}
          {awaitingStock
            ? "No stock has been taken for it."
            : "Its items go back into your stock."}
        </p>
        {paymentStatus === "PAID" && (
          <p className="mt-2 text-sm leading-relaxed text-nk-accent-300">
            This order is paid. Cancelling doesn&rsquo;t refund the buyer:
            you&rsquo;ll need to arrange that with them.
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {/* First in the dialog, so it gets focus and Enter is safe. */}
          <ButtonSecondary
            onClick={() => cancelDialog.current?.close()}
            disabled={pending !== null}
          >
            Keep order
          </ButtonSecondary>
          <ButtonPrimary onClick={() => run("cancel")} disabled={pending !== null}>
            {pending === "cancel" ? "Cancelling…" : "Cancel order"}
          </ButtonPrimary>
        </div>
      </dialog>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
