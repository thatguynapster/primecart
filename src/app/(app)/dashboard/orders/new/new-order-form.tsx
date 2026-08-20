"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Field, FormError, inputClass } from "@/components/dashboard/fields";
import { ButtonSecondary } from "@/components/dashboard/nocturne/ui";
import { formatGhs } from "@/lib/format";
import { createManualOrder, type FormState } from "../actions";

type PickableVariant = { id: string; name: string; price: number; stock: number };
type PickableProduct = { id: string; name: string; variants: PickableVariant[] };

type Row = { key: number; productId: string; variantId: string; quantity: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-nk-accent bg-transparent px-6 py-2.5 text-sm font-medium text-nk-accent transition-colors hover:bg-nk-accent/12 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? "Creating…" : "Create order"}
    </button>
  );
}

export function NewOrderForm({ products }: { products: PickableProduct[] }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createManualOrder,
    {}
  );
  const fieldErrors = state.fieldErrors ?? {};

  const [rows, setRows] = useState<Row[]>([
    { key: 0, productId: "", variantId: "", quantity: 1 },
  ]);
  const [nextKey, setNextKey] = useState(1);

  const ids = {
    name: useId(),
    phone: useId(),
    email: useId(),
    address: useId(),
    city: useId(),
    region: useId(),
    notes: useId(),
    source: useId(),
    markPaid: useId(),
  };

  function variantsFor(productId: string): PickableVariant[] {
    return products.find((product) => product.id === productId)?.variants ?? [];
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { key: nextKey, productId: "", variantId: "", quantity: 1 },
    ]);
    setNextKey((n) => n + 1);
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  const total = rows.reduce((sum, row) => {
    const variant = variantsFor(row.productId).find((v) => v.id === row.variantId);
    return sum + (variant ? variant.price * row.quantity : 0);
  }, 0);

  return (
    <form action={formAction} className="space-y-8">
      <FormError message={state.error} />

      <div className="space-y-4 rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8">
        <h2 className="text-lg font-medium tracking-tight">Items</h2>

        {products.length === 0 ? (
          <p className="text-sm text-nk-neutral-500">
            No products with stock available. Add stock to a product first.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const variants = variantsFor(row.productId);
              const selectedVariant = variants.find((v) => v.id === row.variantId);

              return (
                <div key={row.key} className="flex flex-wrap items-end gap-3">
                  <div className="min-w-48 flex-1">
                    <label className="block text-xs text-nk-neutral-400">
                      Product
                    </label>
                    <select
                      className={`mt-1.5 ${inputClass}`}
                      value={row.productId}
                      onChange={(event) =>
                        updateRow(row.key, {
                          productId: event.target.value,
                          variantId: "",
                        })
                      }
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <input type="hidden" name="lineProductId" value={row.productId} />
                  </div>

                  <div className="min-w-40 flex-1">
                    <label className="block text-xs text-nk-neutral-400">
                      Option
                    </label>
                    <select
                      className={`mt-1.5 ${inputClass}`}
                      value={row.variantId}
                      disabled={!row.productId}
                      onChange={(event) =>
                        updateRow(row.key, { variantId: event.target.value })
                      }
                    >
                      <option value="">Select an option</option>
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name} — {formatGhs(variant.price)} ({variant.stock} left)
                        </option>
                      ))}
                    </select>
                    <input type="hidden" name="lineVariantId" value={row.variantId} />
                  </div>

                  <div className="w-24">
                    <label className="block text-xs text-nk-neutral-400">Qty</label>
                    <input
                      className={`mt-1.5 ${inputClass}`}
                      inputMode="numeric"
                      name="lineQuantity"
                      value={row.quantity}
                      max={selectedVariant?.stock}
                      onChange={(event) =>
                        updateRow(row.key, {
                          quantity: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length === 1}
                    className="mb-1 text-sm text-nk-neutral-500 hover:text-nk-text disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            {fieldErrors.lines && (
              <p className="text-xs text-nk-accent-300">{fieldErrors.lines}</p>
            )}

            <ButtonSecondary type="button" onClick={addRow}>
              Add item
            </ButtonSecondary>

            <div className="flex items-baseline justify-between border-t border-nk-neutral-800 pt-4">
              <span className="text-sm text-nk-neutral-400">Total</span>
              <span className="text-lg font-medium tabular-nums">
                {formatGhs(total)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5 rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8">
        <h2 className="text-lg font-medium tracking-tight">Customer</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor={ids.name} error={fieldErrors.name}>
            <input id={ids.name} name="name" className={inputClass} />
          </Field>
          <Field label="Phone" htmlFor={ids.phone} error={fieldErrors.phone}>
            <input id={ids.phone} name="phone" type="tel" className={inputClass} />
          </Field>
        </div>

        <Field label="Email" htmlFor={ids.email} hint="Optional">
          <input id={ids.email} name="email" type="email" className={inputClass} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Delivery address" htmlFor={ids.address} hint="Optional">
            <input id={ids.address} name="address" className={inputClass} />
          </Field>
          <Field label="City" htmlFor={ids.city} hint="Optional">
            <input id={ids.city} name="city" className={inputClass} />
          </Field>
        </div>

        <Field label="Region" htmlFor={ids.region} hint="Optional">
          <input id={ids.region} name="region" className={inputClass} />
        </Field>

        <Field label="Notes" htmlFor={ids.notes} hint="Optional">
          <textarea id={ids.notes} name="notes" rows={2} className={inputClass} />
        </Field>
      </div>

      <div className="space-y-4 rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8">
        <h2 className="text-lg font-medium tracking-tight">Sale details</h2>

        <div>
          <label htmlFor={ids.source} className="block text-xs text-nk-neutral-400">
            Channel
          </label>
          <select id={ids.source} name="source" defaultValue="MANUAL" className={`mt-1.5 ${inputClass}`}>
            <option value="MANUAL">Walk-in</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </div>

        <label htmlFor={ids.markPaid} className="flex items-center gap-2 text-sm text-nk-text">
          <input id={ids.markPaid} name="markPaid" type="checkbox" className="size-4" />
          Already paid (cash or mobile money)
        </label>
        <p className="text-xs text-nk-neutral-500">
          Leave this unchecked to record the order as pending — you can mark it
          paid later from the order page.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton />
        <Link href="/dashboard/orders" className="text-sm text-nk-neutral-500 hover:text-nk-text">
          Cancel
        </Link>
      </div>
    </form>
  );
}
