"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { Field, FormError, inputClass } from "@/components/dashboard/fields";
import { ImagePicker } from "@/components/dashboard/image-picker";
import type { PaystackBank, PaystackSubaccountDetails } from "@/lib/paystack";
import {
  removeBannerImage,
  removeHeroImage,
  removeLogo,
  updateBanner,
  updateHero,
  updatePayoutDetails,
  updateShopDetails,
  updateSocials,
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

  return (
    <section className="rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8">
      <h2 className="text-base font-medium tracking-tight">Logo</h2>
      <p className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
        Shown at the top of your shop. A square image works best. Without one,
        your shop shows the first letter of its name.
      </p>

      {!configured ? (
        <p className="mt-5 rounded-md border border-dashed border-nk-neutral-800 p-5 text-sm text-nk-neutral-500">
          Image storage is not connected yet.
        </p>
      ) : (
        <form
          // Remounting after a save clears the picked file and its preview.
          key={state.savedAt ?? 0}
          action={formAction}
          className="mt-5 space-y-4"
        >
          <FormError message={state.error} />

          <ImagePicker name="logo" currentUrl={logoUrl} shape="square" />
          {!logoUrl && (
            <p className="text-sm text-nk-neutral-500">
              Without one, your shop shows &ldquo;{businessName.charAt(0).toUpperCase()}&rdquo; instead.
            </p>
          )}

          <div className="flex items-center gap-4">
            <Saving label="Upload" />
            <Saved at={state.savedAt} />
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

            <ImagePicker name="image" currentUrl={imageUrl} shape="wide" />

            <div className="flex items-center gap-4">
              <Saving label="Upload" />
              <Saved at={imageState.savedAt} />
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
      imageHint="A wide image works best — at least 1920px wide, so it stays sharp across the full width of your shop. Without one, the hero shows as text only."
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
      imageHint="A wide image works best — at least 1920px wide, so it stays sharp across the full width of your shop."
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

// ---------------------------------------------------------------------------

/**
 * Payout details — the bank/mobile money account storefront sales settle
 * into. Onboarding is the only other place a subaccount ever gets created;
 * this covers both adding one for the first time (a merchant provisioned
 * without going through onboarding, e.g. seeded directly) and changing an
 * existing one. Current details are shown read-only — Paystack returns the
 * bank as a *name*, not the code `<select>` needs, so "change" always means
 * picking fresh from the dropdown rather than trying to preselect it.
 */
export function PayoutForm({
  banks,
  hasSubaccount,
  current,
}: {
  banks: PaystackBank[];
  /** Whether a subaccount exists at all — drives create-vs-update wording, independent of whether `current` could be fetched. */
  hasSubaccount: boolean;
  /** The fetched display details, or null if there's none yet, or the fetch failed. */
  current: PaystackSubaccountDetails | null;
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updatePayoutDetails,
    {}
  );
  const ids = { bankCode: useId(), accountNumber: useId() };
  const fieldErrors = state.fieldErrors ?? {};

  const bankOptions = banks.filter((b) => b.type !== "mobile_money");
  const momoOptions = banks.filter((b) => b.type === "mobile_money");

  return (
    <section className="rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8">
      <h2 className="text-base font-medium tracking-tight">Payout details</h2>
      <p className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
        Where your storefront sales get paid. We charge 3% on storefront sales
        only, covering all payment processing fees — manual orders are always
        free.
      </p>

      {current ? (
        <div className="mt-5 rounded-md border border-nk-neutral-800 bg-nk-neutral-900 px-4 py-3">
          <p className="text-xs text-nk-neutral-500">Currently paid to</p>
          <p className="mt-1 text-sm text-nk-text">
            {current.settlement_bank} · {current.account_number}
          </p>
        </div>
      ) : hasSubaccount ? (
        <p className="mt-5 rounded-md border border-nk-neutral-800 bg-nk-neutral-900 px-4 py-3 text-sm text-nk-neutral-500">
          A payout account is on file — details couldn&rsquo;t be loaded from
          Paystack just now. You can still update it below.
        </p>
      ) : (
        <p className="mt-5 rounded-md border border-dashed border-nk-neutral-800 px-4 py-3 text-sm text-nk-neutral-500">
          No payout account on file yet — storefront sales can&rsquo;t be paid
          out until you add one.
        </p>
      )}

      <form
        key={state.savedAt ?? 0}
        action={formAction}
        className="mt-5 space-y-5"
      >
        <FormError message={state.error} />

        <Field
          label={hasSubaccount ? "New bank or mobile money" : "Bank or mobile money"}
          htmlFor={ids.bankCode}
          error={fieldErrors.bankCode}
        >
          <select id={ids.bankCode} name="bankCode" defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose one
            </option>
            {momoOptions.length > 0 && (
              <optgroup label="Mobile money">
                {momoOptions.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Banks">
              {bankOptions.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>

        <Field
          label="Account or mobile money number"
          htmlFor={ids.accountNumber}
          error={fieldErrors.accountNumber}
        >
          <input
            id={ids.accountNumber}
            name="accountNumber"
            inputMode="numeric"
            placeholder="0244000000"
            autoComplete="off"
            className={inputClass}
          />
        </Field>

        <div className="flex items-center gap-4">
          <Saving label={hasSubaccount ? "Update payout details" : "Add payout details"} />
          <Saved at={state.savedAt} />
        </div>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------

/**
 * Footer socials (14.20) — Facebook and Instagram links, plus a WhatsApp
 * number. Each is independently optional; the footer only shows an icon for
 * whichever ones are actually set.
 */
export function SocialsForm({
  facebookUrl,
  instagramUrl,
  whatsappNumber,
}: {
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappNumber: string | null;
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateSocials,
    {}
  );
  const ids = { facebook: useId(), instagram: useId(), whatsapp: useId() };
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <section className="rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8">
      <h2 className="text-base font-medium tracking-tight">Socials</h2>
      <p className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
        Shown as icons in your shop&rsquo;s footer. All optional — only the
        ones you fill in appear.
      </p>

      <form action={formAction} className="mt-5 space-y-5">
        <FormError message={state.error} />

        <Field label="Facebook" htmlFor={ids.facebook} error={fieldErrors.facebookUrl}>
          <input
            id={ids.facebook}
            name="facebookUrl"
            type="url"
            placeholder="https://facebook.com/yourshop"
            defaultValue={facebookUrl ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Instagram" htmlFor={ids.instagram} error={fieldErrors.instagramUrl}>
          <input
            id={ids.instagram}
            name="instagramUrl"
            type="url"
            placeholder="https://instagram.com/yourshop"
            defaultValue={instagramUrl ?? ""}
            className={inputClass}
          />
        </Field>

        <Field
          label="WhatsApp number"
          htmlFor={ids.whatsapp}
          hint="Customers can message you directly"
          error={fieldErrors.whatsappNumber}
        >
          <input
            id={ids.whatsapp}
            name="whatsappNumber"
            inputMode="tel"
            placeholder="0244000000"
            defaultValue={whatsappNumber ?? ""}
            className={inputClass}
          />
        </Field>

        <div className="flex items-center gap-4">
          <Saving label="Save changes" />
          <Saved at={state.savedAt} />
        </div>
      </form>
    </section>
  );
}
