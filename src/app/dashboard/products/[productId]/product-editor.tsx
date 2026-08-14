"use client";

import Image from "next/image";
import type { Product, ProductVariant } from "@prisma/client";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { Field, FormError, inputClass } from "@/components/dashboard/fields";
import { VariantFields } from "@/components/dashboard/variant-fields";
import { VariantImageSelect } from "@/components/dashboard/variant-image-select";
import { formatGhs } from "@/lib/format";
import { variantImages } from "@/lib/products/variants";
import {
  adjustStock,
  createVariant,
  editVariant,
  setProductArchived,
  setVariantArchived,
  updateProductDetails,
  type FormState,
} from "../actions";

function Saving({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-neutral-900 px-5 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------

function DetailsForm({
  product,
  categories,
}: {
  product: Product;
  categories: string[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateProductDetails,
    {}
  );
  const ids = { name: useId(), description: useId(), category: useId() };
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8"
    >
      <input type="hidden" name="productId" value={product.id} />
      <FormError message={state.error} />

      <Field label="Product name" htmlFor={ids.name} error={fieldErrors.name}>
        <input
          id={ids.name}
          name="name"
          defaultValue={product.name}
          className={inputClass}
        />
      </Field>

      <Field label="Description" htmlFor={ids.description} hint="Optional">
        <textarea
          id={ids.description}
          name="description"
          rows={3}
          defaultValue={product.description ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="Category" htmlFor={ids.category} hint="Optional">
        <input
          id={ids.category}
          name="category"
          list="category-suggestions"
          defaultValue={product.category ?? ""}
          className={inputClass}
        />
        <datalist id="category-suggestions">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </Field>

      <Saving label="Save changes" />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Stock recount
// ---------------------------------------------------------------------------

function StockCell({
  productId,
  variant,
}: {
  productId: string;
  variant: ProductVariant;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(variant.stock));
  const [saving, setSaving] = useState(false);
  const low = variant.stock <= variant.lowStockThreshold;

  async function save() {
    const next = Number(value);
    if (!Number.isInteger(next) || next < 0) {
      setValue(String(variant.stock));
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await adjustStock(productId, variant.id, next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 font-mono text-[13.5px] tabular-nums transition-colors hover:bg-neutral-100"
        title="Click to recount"
      >
        {variant.stock}
        {low && (
          <span className="rounded-full border border-neutral-300 px-1.5 py-0.5 font-sans text-[10px] font-medium text-neutral-600">
            Low
          </span>
        )}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <input
        autoFocus
        inputMode="numeric"
        value={value}
        disabled={saving}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void save();
          if (event.key === "Escape") {
            setValue(String(variant.stock));
            setEditing(false);
          }
        }}
        className="w-16 rounded-lg border border-neutral-900 px-2 py-1 text-right font-mono text-[13.5px] tabular-nums outline-none"
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-lg bg-neutral-900 px-2 py-1 text-[12px] font-medium text-white disabled:bg-neutral-400"
      >
        {saving ? "…" : "Set"}
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

function EditVariantForm({
  productId,
  productImages,
  variant,
  onDone,
}: {
  productId: string;
  productImages: string[];
  variant: ProductVariant;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    editVariant,
    {}
  );

  return (
    <form action={formAction} className="space-y-5 bg-neutral-50 p-5 sm:p-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="variantId" value={variant.id} />
      <FormError message={state.error} />

      <VariantFields fieldErrors={state.fieldErrors} variant={variant} />

      <div>
        <p className="text-[14px] font-medium text-neutral-900">
          Photos for this option
        </p>
        <div className="mt-2">
          <VariantImageSelect
            productImages={productImages}
            selected={variantImages(variant)}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Saving label="Save option" />
        <button
          type="button"
          onClick={onDone}
          className="text-[13.5px] text-neutral-500 hover:text-neutral-900"
        >
          Close
        </button>
      </div>
    </form>
  );
}

/**
 * The option's preview photo: the first one it has picked.
 *
 * With none picked the option shows all the product's photos, so its preview
 * is the product's first — which matches what a customer would see.
 */
function VariantThumb({
  variant,
  productImages,
}: {
  variant: ProductVariant;
  productImages: string[];
}) {
  const src = variantImages(variant)[0] ?? productImages[0];

  if (!src) {
    return (
      <span className="size-11 shrink-0 rounded-lg border border-dashed border-neutral-300" />
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={44}
      height={44}
      className="size-11 shrink-0 rounded-lg border border-neutral-200 object-cover"
    />
  );
}

function VariantRow({
  productId,
  productImages,
  variant,
}: {
  productId: string;
  productImages: string[];
  variant: ProductVariant;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleArchived() {
    setBusy(true);
    try {
      await setVariantArchived(productId, variant.id, variant.isActive);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={variant.isActive ? "" : "bg-neutral-50/60"}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <VariantThumb variant={variant} productImages={productImages} />
          <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-medium">{variant.name}</p>
            {!variant.isActive && (
              <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] font-medium tracking-wide text-neutral-500 uppercase">
                Archived
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-neutral-500">
            {formatGhs(variant.price)}
            {variant.sku ? ` · ${variant.sku}` : ""}
            {` · warns at ${variant.lowStockThreshold}`}
          </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StockCell productId={productId} variant={variant} />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="text-[13px] text-neutral-500 underline underline-offset-4 hover:text-neutral-900"
          >
            {open ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => void toggleArchived()}
            disabled={busy}
            className="text-[13px] text-neutral-500 underline underline-offset-4 hover:text-neutral-900 disabled:opacity-50"
          >
            {variant.isActive ? "Archive" : "Restore"}
          </button>
        </div>
      </div>

      {open && (
        <EditVariantForm
          productId={productId}
          productImages={productImages}
          variant={variant}
          onDone={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function AddVariantForm({ productId }: { productId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createVariant,
    {}
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-[13.5px] font-medium transition-colors hover:border-neutral-400"
      >
        Add another option
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8"
    >
      <input type="hidden" name="productId" value={productId} />
      <h3 className="font-display text-[16px] font-bold tracking-tight">
        New option
      </h3>
      <FormError message={state.error} />

      <VariantFields fieldErrors={state.fieldErrors} />

      <div className="flex items-center gap-4">
        <Saving label="Add option" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[13.5px] text-neutral-500 hover:text-neutral-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function ProductEditor({
  product,
  categories,
}: {
  product: Product;
  categories: string[];
}) {
  const [archiving, setArchiving] = useState(false);

  async function toggleArchived() {
    setArchiving(true);
    try {
      await setProductArchived(product.id, product.isActive);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="space-y-8">
      <DetailsForm product={product} categories={categories} />

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">
              Options and stock
            </h2>
            <p className="mt-1 text-[13.5px] text-neutral-600">
              Tap a stock number to recount it.
            </p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {product.variants.map((variant) => (
            <VariantRow
              key={variant.id}
              productId={product.id}
              productImages={product.images}
              variant={variant}
            />
          ))}
        </div>

        <div className="mt-4">
          <AddVariantForm productId={product.id} />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <h2 className="font-display text-[16px] font-bold tracking-tight">
          {product.isActive ? "Archive this product" : "Restore this product"}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
          {product.isActive
            ? "It disappears from your shop straight away. Past orders keep their details, and you can restore it any time."
            : "It goes back on your shop with the same options and stock."}
        </p>
        <button
          type="button"
          onClick={() => void toggleArchived()}
          disabled={archiving}
          className="mt-5 rounded-full border border-neutral-300 px-5 py-2.5 text-[13.5px] font-medium transition-colors hover:border-neutral-400 disabled:opacity-50"
        >
          {archiving
            ? "Working…"
            : product.isActive
              ? "Archive product"
              : "Restore product"}
        </button>
      </section>
    </div>
  );
}
