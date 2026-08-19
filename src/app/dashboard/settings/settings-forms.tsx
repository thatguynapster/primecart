"use client";

import Image from "next/image";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { Field, FormError, inputClass } from "@/components/dashboard/fields";
import {
  removeBannerImage,
  removeHeroImage,
  removeLogo,
  updateBanner,
  updateHero,
  updateShopDetails,
  uploadBannerImage,
  uploadHeroImage,
  uploadLogo,
  type SettingsState,
} from "./actions";

function Saving({ label }: { label: string }) {
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

function Saved({ at }: { at?: number }) {
  if (!at) return null;
  return <span className="text-sm text-nk-neutral-500">Saved.</span>;
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
      className="space-y-5 rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8"
    >
      <h2 className="text-base font-medium tracking-tight">
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
            className="h-11 w-16 cursor-pointer rounded-sm border border-nk-neutral-800 bg-transparent p-1"
          />
          <p className="text-sm text-nk-neutral-500">
            Used for buttons and the cart badge on your shop.
          </p>
        </div>
      </Field>

      {/* The address is permanent — customers may already have the link. */}
      <div>
        <p className="text-sm font-medium text-nk-text">Shop address</p>
        <p className="mt-2 rounded-md border border-nk-neutral-800 bg-nk-neutral-900 px-4 py-2.5 font-mono text-sm text-nk-neutral-500">
          {shopUrl}
        </p>
        <p className="mt-1.5 text-sm text-nk-neutral-500">
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
    <section className="rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8">
      <h2 className="text-base font-medium tracking-tight">Logo</h2>
      <p className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
        Shown at the top of your shop. A square image works best. Without one,
        your shop shows the first letter of its name.
      </p>

      <div className="mt-5 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border border-nk-neutral-800 bg-nk-neutral-900">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Your logo"
              width={64}
              height={64}
              className="size-16 object-cover"
            />
          ) : (
            <span className="text-xl font-medium text-nk-neutral-600">
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
            className="text-sm text-nk-neutral-500 underline underline-offset-4 hover:text-nk-text disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove logo"}
          </button>
        )}
      </div>

      {!configured ? (
        <p className="mt-5 rounded-md border border-dashed border-nk-neutral-800 p-5 text-sm text-nk-neutral-500">
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
              className="cursor-pointer rounded-md border border-nk-neutral-800 bg-transparent px-4 py-2.5 text-sm font-medium transition-colors hover:bg-nk-text/7"
            >
              Choose logo
            </label>
            <input
              id={inputId}
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-sm text-nk-neutral-500 file:hidden"
            />
            <Saving label="Upload" />
            <Saved at={state.savedAt} />
          </div>
        </form>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

/**
 * Shared shape behind the hero and mid-page banner sections (Phase 14) — same
 * three fields (headline, subheading, image), same upload/remove mechanics as
 * LogoForm above, just parameterised so the two sections aren't a duplicated
 * ~90 lines apiece.
 */
function HeroBannerForm({
  title,
  fieldHint,
  imageHint,
  headline,
  subheading,
  imageUrl,
  configured,
  textAction,
  uploadAction,
  onRemoveImage,
}: {
  title: string;
  fieldHint: string;
  imageHint: string;
  headline: string | null;
  subheading: string | null;
  imageUrl: string | null;
  configured: boolean;
  textAction: (prev: SettingsState, formData: FormData) => Promise<SettingsState>;
  uploadAction: (prev: SettingsState, formData: FormData) => Promise<SettingsState>;
  onRemoveImage: () => Promise<void>;
}) {
  const [textState, textFormAction] = useActionState<SettingsState, FormData>(
    textAction,
    {}
  );
  const [imageState, imageFormAction] = useActionState<SettingsState, FormData>(
    uploadAction,
    {}
  );
  const [removing, setRemoving] = useState(false);
  const ids = { headline: useId(), subheading: useId() };
  const imageInputId = useId();

  return (
    <section className="rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8">
      <h2 className="text-base font-medium tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
        {fieldHint}
      </p>

      <form action={textFormAction} className="mt-5 space-y-5">
        <FormError message={textState.error} />

        <Field label="Headline" htmlFor={ids.headline} hint="Optional">
          <input
            id={ids.headline}
            name="headline"
            defaultValue={headline ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Subheading" htmlFor={ids.subheading} hint="Optional">
          <textarea
            id={ids.subheading}
            name="subheading"
            rows={2}
            defaultValue={subheading ?? ""}
            className={inputClass}
          />
        </Field>

        <div className="flex items-center gap-4">
          <Saving label="Save changes" />
          <Saved at={textState.savedAt} />
        </div>
      </form>

      <div className="mt-6 border-t border-nk-neutral-800 pt-6">
        <p className="text-sm font-medium text-nk-text">Image</p>
        <p className="mt-1 text-sm text-nk-neutral-500">{imageHint}</p>

        <div className="mt-4 flex items-center gap-4">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={120}
              height={68}
              className="h-17 w-30 flex-none rounded-md border border-nk-neutral-800 object-cover"
            />
          ) : (
            <div className="grid h-17 w-30 flex-none place-items-center rounded-md border border-dashed border-nk-neutral-800 text-xs text-nk-neutral-600">
              None yet
            </div>
          )}

          {imageUrl && (
            <button
              type="button"
              disabled={removing}
              onClick={async () => {
                setRemoving(true);
                try {
                  await onRemoveImage();
                } finally {
                  setRemoving(false);
                }
              }}
              className="text-sm text-nk-neutral-500 underline underline-offset-4 hover:text-nk-text disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove image"}
            </button>
          )}
        </div>

        {!configured ? (
          <p className="mt-4 rounded-md border border-dashed border-nk-neutral-800 p-5 text-sm text-nk-neutral-500">
            Image storage is not connected yet.
          </p>
        ) : (
          <form
            key={imageState.savedAt ?? 0}
            action={imageFormAction}
            className="mt-4 space-y-4"
          >
            <FormError message={imageState.error} />

            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor={imageInputId}
                className="cursor-pointer rounded-md border border-nk-neutral-800 bg-transparent px-4 py-2.5 text-sm font-medium transition-colors hover:bg-nk-text/7"
              >
                Choose image
              </label>
              <input
                id={imageInputId}
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="text-sm text-nk-neutral-500 file:hidden"
              />
              <Saving label="Upload" />
              <Saved at={imageState.savedAt} />
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export function HeroForm({
  headline,
  subheading,
  imageUrl,
  configured,
}: {
  headline: string | null;
  subheading: string | null;
  imageUrl: string | null;
  configured: boolean;
}) {
  return (
    <HeroBannerForm
      title="Hero"
      fieldHint="The first thing customers see at the top of your shop. Without a headline, your shop name and description are used instead."
      imageHint="A wide image works best. Without one, the hero shows as text only."
      headline={headline}
      subheading={subheading}
      imageUrl={imageUrl}
      configured={configured}
      textAction={updateHero}
      uploadAction={uploadHeroImage}
      onRemoveImage={removeHeroImage}
    />
  );
}

export function BannerForm({
  headline,
  subheading,
  imageUrl,
  configured,
}: {
  headline: string | null;
  subheading: string | null;
  imageUrl: string | null;
  configured: boolean;
}) {
  return (
    <HeroBannerForm
      title="Mid-page banner"
      fieldHint="A second banner shown further down your shop. Optional — the section stays hidden until you add a headline or an image, whichever comes first."
      imageHint="A wide image works best."
      headline={headline}
      subheading={subheading}
      imageUrl={imageUrl}
      configured={configured}
      textAction={updateBanner}
      uploadAction={uploadBannerImage}
      onRemoveImage={removeBannerImage}
    />
  );
}
