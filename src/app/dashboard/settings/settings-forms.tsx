"use client";

import Image from "next/image";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { Field, FormError, inputClass } from "@/components/dashboard/fields";
import {
  removeLogo,
  updateShopDetails,
  uploadLogo,
  type SettingsState,
} from "./actions";

function Saving({ label }: { label: string }) {
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

function Saved({ at }: { at?: number }) {
  if (!at) return null;
  return <span className="text-[13px] text-neutral-500">Saved.</span>;
}

// ---------------------------------------------------------------------------

export function ShopDetailsForm({
  businessName,
  description,
  primaryColor,
  shopUrl,
}: {
  businessName: string;
  description: string | null;
  primaryColor: string;
  shopUrl: string;
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateShopDetails,
    {}
  );
  const ids = { name: useId(), description: useId(), colour: useId() };
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8"
    >
      <h2 className="font-display text-[16px] font-bold tracking-tight">
        Shop details
      </h2>

      <FormError message={state.error} />

      <Field
        label="Shop name"
        htmlFor={ids.name}
        error={fieldErrors.businessName}
      >
        <input
          id={ids.name}
          name="businessName"
          defaultValue={businessName}
          className={inputClass}
        />
      </Field>

      <Field
        label="What you sell"
        htmlFor={ids.description}
        hint="Shown on your shop"
      >
        <textarea
          id={ids.description}
          name="description"
          rows={3}
          defaultValue={description ?? ""}
          className={inputClass}
        />
      </Field>

      <Field
        label="Shop colour"
        htmlFor={ids.colour}
        error={fieldErrors.primaryColor}
      >
        <div className="flex items-center gap-3">
          <input
            id={ids.colour}
            name="primaryColor"
            type="color"
            defaultValue={primaryColor}
            className="h-11 w-16 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1"
          />
          <p className="text-[13px] text-neutral-500">
            Used for buttons and the cart badge on your shop.
          </p>
        </div>
      </Field>

      {/* The address is permanent — customers may already have the link. */}
      <div>
        <p className="text-[14px] font-medium text-neutral-900">Shop address</p>
        <p className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 font-mono text-[14px] text-neutral-500">
          {shopUrl}
        </p>
        <p className="mt-1.5 text-[13px] text-neutral-500">
          This cannot be changed — customers may already have the link.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Saving label="Save changes" />
        <Saved at={state.savedAt} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function LogoForm({
  logoUrl,
  businessName,
  configured,
}: {
  logoUrl: string | null;
  businessName: string;
  configured: boolean;
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    uploadLogo,
    {}
  );
  const [removing, setRemoving] = useState(false);
  const inputId = useId();

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
      <h2 className="font-display text-[16px] font-bold tracking-tight">Logo</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
        Shown at the top of your shop. A square image works best. Without one,
        your shop shows the first letter of its name.
      </p>

      <div className="mt-5 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Your logo"
              width={64}
              height={64}
              className="size-16 object-cover"
            />
          ) : (
            <span className="text-[20px] font-bold text-neutral-400">
              {businessName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {logoUrl && (
          <button
            type="button"
            disabled={removing}
            onClick={async () => {
              setRemoving(true);
              try {
                await removeLogo();
              } finally {
                setRemoving(false);
              }
            }}
            className="text-[13px] text-neutral-500 underline underline-offset-4 hover:text-neutral-900 disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove logo"}
          </button>
        )}
      </div>

      {!configured ? (
        <p className="mt-5 rounded-xl border border-dashed border-neutral-300 p-5 text-[14px] text-neutral-500">
          Image storage is not connected yet.
        </p>
      ) : (
        <form
          // Remounting after a save clears the file input.
          key={state.savedAt ?? 0}
          action={formAction}
          className="mt-5 space-y-4"
        >
          <FormError message={state.error} />

          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={inputId}
              className="cursor-pointer rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-neutral-400"
            >
              Choose logo
            </label>
            <input
              id={inputId}
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-[13px] text-neutral-500 file:hidden"
            />
            <Saving label="Upload" />
            <Saved at={state.savedAt} />
          </div>
        </form>
      )}
    </section>
  );
}
