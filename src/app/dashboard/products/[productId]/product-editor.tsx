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
      className="rounded-md border border-nk-accent bg-transparent px-5 py-2.5 text-sm font-medium text-nk-accent transition-colors hover:bg-nk-accent/12 disabled:cursor-not-allowed disabled:opacity-45"
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
      className="space-y-5 rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8"
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
        className="flex items-center gap-2 rounded-sm px-2 py-1 font-mono text-sm tabular-nums transition-colors hover:bg-nk-neutral-800"
        title="Click to recount"
      >
        {variant.stock}
        {low && (
          <span className="rounded-full border border-nk-neutral-800 px-1.5 py-0.5 font-sans text-xs font-medium text-nk-neutral-400">
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
        className="w-16 rounded-sm border border-nk-accent px-2 py-1 text-right font-mono text-sm tabular-nums outline-none"
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-sm border border-nk-accent px-2 py-1 text-xs font-medium text-nk-accent disabled:opacity-45"
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
    <form action={formAction} className="space-y-5 bg-nk-neutral-900 p-5 sm:p-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="variantId" value={variant.id} />
      <FormError message={state.error} />

      <VariantFields fieldErrors={state.fieldErrors} variant={variant} />

      <div>
        <p className="text-sm font-medium text-nk-text">
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
          className="text-sm text-nk-neutral-500 hover:text-nk-text"
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
      <span className="size-11 shrink-0 rounded-sm border border-dashed border-nk-neutral-800" />
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={44}
      height={44}
      className="size-11 shrink-0 rounded-sm border border-nk-neutral-800 object-cover"
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
    <div className={variant.isActive ? "" : "bg-nk-neutral-900/60"}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <VariantThumb variant={variant} productImages={productImages} />
          <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{variant.name}</p>
            {!variant.isActive && (
              <span className="rounded-full border border-nk-neutral-800 px-2 py-0.5 text-xs font-medium tracking-wide text-nk-neutral-500 uppercase">
                Archived
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-nk-neutral-500">
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
            className="text-sm text-nk-neutral-500 underline underline-offset-4 hover:text-nk-text"
          >
            {open ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => void toggleArchived()}
            disabled={busy}
            className="text-sm text-nk-neutral-500 underline underline-offset-4 hover:text-nk-text disabled:opacity-50"
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
        className="rounded-full border border-nk-neutral-800 bg-transparent px-5 py-2.5 text-sm font-medium transition-colors hover:bg-nk-text/7"
      >
        Add another option
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8"
    >
      <input type="hidden" name="productId" value={productId} />
      <h3 className="text-base font-medium tracking-tight">
        New option
      </h3>
      <FormError message={state.error} />

      <VariantFields fieldErrors={state.fieldErrors} />

      <div className="flex items-center gap-4">
        <Saving label="Add option" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-nk-neutral-500 hover:text-nk-text"
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
            <h2 className="text-lg font-medium tracking-tight">
              Options and stock
            </h2>
            <p className="mt-1 text-sm text-nk-neutral-400">
              Tap a stock number to recount it.
            </p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-nk-neutral-800 overflow-hidden rounded-md border border-nk-neutral-800 bg-nk-surface">
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

      <section className="rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8">
        <h2 className="text-base font-medium tracking-tight">
          {product.isActive ? "Archive this product" : "Restore this product"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
          {product.isActive
            ? "It disappears from your shop straight away. Past orders keep their details, and you can restore it any time."
            : "It goes back on your shop with the same options and stock."}
        </p>
        <button
          type="button"
          onClick={() => void toggleArchived()}
          disabled={archiving}
          className="mt-5 rounded-full border border-nk-neutral-800 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-nk-text/7 disabled:opacity-50"
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
