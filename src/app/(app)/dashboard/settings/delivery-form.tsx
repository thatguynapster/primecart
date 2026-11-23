"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormError, inputClass } from "@/components/dashboard/fields";
import { ButtonSecondary } from "@/components/dashboard/nocturne/ui";
import {
  MAX_AREAS,
  MAX_AREA_NAME,
  MAX_PICKUP_NOTE,
  type DeliveryOption,
} from "@/lib/orders/delivery";
import { updateDelivery, type SettingsState } from "./actions";

type Row = { key: string; id: string; name: string; fee: string };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-nk-accent bg-transparent px-5 py-2.5 text-sm font-medium text-nk-accent transition-colors hover:bg-nk-accent/12 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? "Saving…" : "Save delivery options"}
    </button>
  );
}

/** Areas with prices, plus the two extras. Empty = no delivery step at checkout. */
export function DeliveryForm({ options }: { options: DeliveryOption[] }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(updateDelivery, {});

  const pickup = options.find((option) => option.kind === "PICKUP");
  const [rows, setRows] = useState<Row[]>(() =>
    options
      .filter((option) => option.kind === "AREA")
      .map((option) => ({
        key: option.id,
        id: option.id,
        name: option.name,
        fee: String(option.fee),
      }))
  );
  const [nextKey, setNextKey] = useState(0);
  const [pickupOn, setPickupOn] = useState(Boolean(pickup));

  function update(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    // React resets a form after its action; keep what was typed.
    <form
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="space-y-5 rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8"
    >
      <div>
        <h2 className="text-base font-medium tracking-tight">Delivery</h2>
        <p className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
          List the areas you deliver to and what you charge. Shoppers choose
          one, and the fee is added to their total. Leave everything empty and
          shoppers aren&rsquo;t asked.
        </p>
      </div>

      <FormError message={state.error} />

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.key} className="flex items-center gap-2">
            <input type="hidden" name="areaId" value={row.id} />
            <input
              name="areaName"
              aria-label={`Area ${index + 1}`}
              placeholder="Accra"
              maxLength={MAX_AREA_NAME}
              value={row.name}
              onChange={(event) => update(row.key, { name: event.target.value })}
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <div className="w-24 flex-none">
              <input
                name="areaFee"
                aria-label={`Fee for area ${index + 1} in GHS`}
                placeholder="GHS 25"
                inputMode="decimal"
                value={row.fee}
                onChange={(event) => update(row.key, { fee: event.target.value })}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              aria-label={`Remove ${row.name || `area ${index + 1}`}`}
              onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
              className="grid size-10 flex-none place-items-center text-lg text-nk-neutral-500 hover:text-nk-text"
            >
              ×
            </button>
          </div>
        ))}

        {rows.length < MAX_AREAS && (
          <ButtonSecondary
            type="button"
            onClick={() => {
              setRows((current) => [
                ...current,
                { key: `new-${nextKey}`, id: "", name: "", fee: "" },
              ]);
              setNextKey((n) => n + 1);
            }}
          >
            Add area
          </ButtonSecondary>
        )}
      </div>

      <div className="space-y-3 border-t border-nk-neutral-800 pt-5">
        <label className="flex items-start gap-2.5 text-sm text-nk-text">
          <input
            type="checkbox"
            name="pickup"
            checked={pickupOn}
            onChange={(event) => setPickupOn(event.target.checked)}
            className="mt-0.5 size-4 flex-none"
          />
          <span>
            Pickup
            <span className="block text-nk-neutral-500">
              Free. Shoppers aren&rsquo;t asked for an address.
            </span>
          </span>
        </label>
        {pickupOn && (
          <input
            name="pickupNote"
            aria-label="Where and when to collect"
            placeholder="Where and when to collect, e.g. Osu Oxford Street, 9am to 5pm"
            maxLength={MAX_PICKUP_NOTE}
            defaultValue={pickup?.note ?? ""}
            className={inputClass}
          />
        )}

        <label className="flex items-start gap-2.5 text-sm text-nk-text">
          <input
            type="checkbox"
            name="quote"
            defaultChecked={options.some((option) => option.kind === "QUOTE")}
            className="mt-0.5 size-4 flex-none"
          />
          <span>
            Delivery fee agreed on WhatsApp
            <span className="block text-nk-neutral-500">
              For places not on your list. You agree the fee with the shopper
              and collect it yourself.
            </span>
          </span>
        </label>
      </div>

      <p className="text-sm text-nk-neutral-500">
        When a shopper pays online, PrimeCart&rsquo;s 3% is taken from the whole
        payment, delivery included. On a GHS 30 fee that is GHS 0.90. Delivery
        fees aren&rsquo;t counted in your sales figures.
      </p>

      <div className="flex items-center gap-4">
        <SaveButton />
        {state.savedAt && <span className="text-sm text-nk-neutral-500">Saved.</span>}
      </div>
    </form>
  );
}
