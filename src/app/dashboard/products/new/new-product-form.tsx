"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

import { Field, FormError, inputClass } from "@/components/dashboard/fields";
import { PhotoPicker } from "@/components/dashboard/photo-picker";
import { VariantFields } from "@/components/dashboard/variant-fields";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/products/limits";
import { createProduct, type FormState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-neutral-900 px-6 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Saving…" : "Save product"}
    </button>
  );
}

export function NewProductForm({
  categories,
  imagesEnabled,
}: {
  categories: string[];
  imagesEnabled: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createProduct,
    {}
  );
  const ids = { name: useId(), description: useId(), category: useId() };
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      <FormError message={state.error} />

      <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <Field label="Product name" htmlFor={ids.name} error={fieldErrors.name}>
          <input
            id={ids.name}
            name="name"
            placeholder="Anker 20W charger"
            className={inputClass}
          />
        </Field>

        <Field
          label="Description"
          htmlFor={ids.description}
          hint="Optional — shown on your shop"
        >
          <textarea
            id={ids.description}
            name="description"
            rows={3}
            placeholder="Fast charger for phones and tablets."
            className={inputClass}
          />
        </Field>

        <Field label="Category" htmlFor={ids.category} hint="Optional">
          <input
            id={ids.category}
            name="category"
            list="category-suggestions"
            placeholder="Chargers"
            className={inputClass}
          />
          <datalist id="category-suggestions">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>

        {imagesEnabled && (
          <div>
            <p className="text-[14px] font-medium text-neutral-900">
              Photos
              <span className="ml-1.5 font-normal text-neutral-400">
                Optional — up to {MAX_IMAGES_PER_PRODUCT}, 5MB each
              </span>
            </p>
            <div className="mt-2">
              <PhotoPicker maxSelectable={MAX_IMAGES_PER_PRODUCT} />
            </div>
            {fieldErrors.images && (
              <p className="mt-1.5 text-[13px] text-red-600">
                {fieldErrors.images}
              </p>
            )}
            <p className="mt-2 text-[13px] text-neutral-500">
              The first photo is the one customers see in your shop listing.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <h2 className="font-display text-[17px] font-bold tracking-tight">
          First option
        </h2>
        <p className="mt-2 mb-6 text-[14px] leading-relaxed text-neutral-600">
          Every product needs at least one option — a size, a colour, or just
          the product itself. Each option keeps its own price and stock count.
          You can add more after saving.
        </p>

        <VariantFields fieldErrors={fieldErrors} />
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton />
        <Link
          href="/dashboard/products"
          className="text-[13.5px] text-neutral-500 hover:text-neutral-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
