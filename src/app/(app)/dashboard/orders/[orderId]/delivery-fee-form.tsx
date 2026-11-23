"use client";

import { useState } from "react";

import { inputClass } from "@/components/dashboard/fields";
import { ButtonSecondary } from "@/components/dashboard/nocturne/ui";
import { setDeliveryFee } from "../actions";

/** Only rendered while an unpaid, unconfirmed checkout-off order can change. */
export function DeliveryFeeForm({ orderId, fee }: { orderId: string; fee: number | null }) {
  const [value, setValue] = useState(fee == null ? "" : String(fee));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await setDeliveryFee(orderId, value);
      if (result.error) setError(result.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="px-5 py-4">
      <label htmlFor="delivery-fee" className="block text-xs text-nk-neutral-400">
        Delivery fee (GHS)
        <span className="ml-1.5 text-nk-neutral-600">
          Can be changed until you confirm the order or mark it paid
        </span>
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="w-32">
          <input
            id="delivery-fee"
            inputMode="decimal"
            placeholder="25"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={inputClass}
          />
        </div>
        <ButtonSecondary type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save fee"}
        </ButtonSecondary>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-nk-accent-300">
          {error}
        </p>
      )}
    </form>
  );
}
