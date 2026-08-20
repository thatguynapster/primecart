"use client";

import { useState } from "react";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

import { ButtonPrimary, ButtonSecondary } from "@/components/dashboard/nocturne/ui";
import { advanceOrderStatus, cancelOrder, markOrderPaid } from "../actions";
import { canCancel, nextStatus } from "@/lib/orders/transitions";

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function OrderActions({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  const [pending, setPending] = useState<"advance" | "cancel" | "pay" | null>(null);

  const next = nextStatus(status);
  const cancellable = canCancel(status);
  const canMarkPaid =
    paymentStatus === "UNPAID" && status !== "CANCELLED" && status !== "EXPIRED";

  async function run(action: "advance" | "cancel" | "pay") {
    setPending(action);
    try {
      if (action === "advance") await advanceOrderStatus(orderId);
      if (action === "cancel") await cancelOrder(orderId);
      if (action === "pay") await markOrderPaid(orderId);
    } finally {
      setPending(null);
    }
  }

  if (!next && !cancellable && !canMarkPaid) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canMarkPaid && (
        <ButtonSecondary onClick={() => run("pay")} disabled={pending !== null}>
          {pending === "pay" ? "Marking paid…" : "Mark as paid"}
        </ButtonSecondary>
      )}

      {next && (
        <ButtonPrimary onClick={() => run("advance")} disabled={pending !== null}>
          {pending === "advance" ? "Updating…" : `Mark as ${titleCase(next)}`}
        </ButtonPrimary>
      )}

      {cancellable && (
        <ButtonSecondary onClick={() => run("cancel")} disabled={pending !== null}>
          {pending === "cancel" ? "Cancelling…" : "Cancel order"}
        </ButtonSecondary>
      )}
    </div>
  );
}
