"use client";

import { useId } from "react";

import { Field, inputClass } from "@/components/dashboard/fields";
import type { ProductVariant } from "@prisma/client";

/**
 * The variant field group, shared by product creation, adding an option and
 * editing one — so the rules and labels cannot drift between them.
 *
 * "Option" rather than "variant" throughout the UI: a merchant selling shirts
 * thinks in sizes and colours, not variants.
 */
export function VariantFields({
  fieldErrors = {},
  variant,
  includeStock = true,
}: {
  fieldErrors?: Record<string, string>;
  variant?: ProductVariant;
  includeStock?: boolean;
}) {
  const ids = {
    variantName: useId(),
    price: useId(),
    stock: useId(),
    sku: useId(),
    lowStockThreshold: useId(),
    attributeName: useId(),
    attributeValue: useId(),
  };

  // Only one attribute pair is editable; the schema stores a map, and a single
  // pair covers the size/colour case without inventing a repeater UI.
  const existingAttribute = Object.entries(
    (variant?.attributes as Record<string, string> | null) ?? {}
  )[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Option name"
          htmlFor={ids.variantName}
          hint="e.g. Black, Large"
          error={fieldErrors.variantName}
        >
          <input
            id={ids.variantName}
            name="variantName"
            defaultValue={variant?.name}
            placeholder="Black"
            className={inputClass}
          />
        </Field>

        <Field
          label="Price (GHS)"
          htmlFor={ids.price}
          error={fieldErrors.price}
        >
          <input
            id={ids.price}
            name="price"
            inputMode="decimal"
            defaultValue={variant?.price}
            placeholder="120"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {includeStock && (
          <Field
            label="In stock"
            htmlFor={ids.stock}
            error={fieldErrors.stock}
          >
            <input
              id={ids.stock}
              name="stock"
              inputMode="numeric"
              defaultValue={variant?.stock ?? 0}
              placeholder="0"
              className={inputClass}
            />
          </Field>
        )}

        <Field
          label="Warn me at"
          htmlFor={ids.lowStockThreshold}
          hint="units left"
          error={fieldErrors.lowStockThreshold}
        >
          <input
            id={ids.lowStockThreshold}
            name="lowStockThreshold"
            inputMode="numeric"
            defaultValue={variant?.lowStockThreshold ?? 5}
            placeholder="5"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="SKU" htmlFor={ids.sku} hint="Optional">
          <input
            id={ids.sku}
            name="sku"
            defaultValue={variant?.sku ?? ""}
            placeholder="ANK-20W-BLK"
            className={inputClass}
          />
        </Field>

        <Field label="Option type" htmlFor={ids.attributeName} hint="Optional">
          <input
            id={ids.attributeName}
            name="attributeName"
            defaultValue={existingAttribute?.[0] ?? ""}
            placeholder="Colour"
            className={inputClass}
          />
        </Field>

        <Field label="Value" htmlFor={ids.attributeValue} hint="Optional">
          <input
            id={ids.attributeValue}
            name="attributeValue"
            defaultValue={existingAttribute?.[1] ?? ""}
            placeholder="Black"
            className={inputClass}
          />
        </Field>
      </div>
    </div>
  );
}
