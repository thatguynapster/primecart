"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { GhanaPhoneInput } from "@/components/phone-input";

import { checkSubdomain, completeOnboarding } from "./actions";
import type { OnboardingState } from "./actions";

type Props = {
  rootDomain: string;
  defaultBusinessName: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Setting up your shop…" : "Open my shop"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[13px] text-red-600">{message}</p>;
}

export function OnboardingForm({
  rootDomain,
  defaultBusinessName,
}: Props) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {}
  );

  const [businessName, setBusinessName] = useState(defaultBusinessName);

  // Null until the merchant edits the address themselves, so it can be derived
  // from the business name during render rather than synced by an effect.
  const [editedSubdomain, setEditedSubdomain] = useState<string | null>(null);
  const subdomain = editedSubdomain ?? slugify(businessName);

  const [availability, setAvailability] = useState<
    | { status: "idle" }
    | { status: "checking" }
    | { status: "done"; ok: boolean; reason?: string }
  >({ status: "idle" });

  const ids = {
    businessName: useId(),
    subdomain: useId(),
    description: useId(),
    whatsapp: useId(),
    primaryColor: useId(),
  };

  // Debounced availability check. Every setState happens inside the timeout
  // callback, never synchronously in the effect body, which would cascade a
  // render on each keystroke.
  useEffect(() => {
    if (!subdomain) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      setAvailability({ status: "checking" });

      try {
        const result = await checkSubdomain(subdomain);
        if (!cancelled) setAvailability({ status: "done", ...result });
      } catch {
        if (!cancelled) setAvailability({ status: "idle" });
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [subdomain]);

  const fieldErrors = state.fieldErrors ?? {};

  return (
    // React resets a form after its action; keep what was typed on an error.
    <form
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="space-y-7"
    >
      {state.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {state.error}
        </p>
      )}

      {/* -------------------------------------------------- shop identity */}
      <div>
        <label
          htmlFor={ids.businessName}
          className="block text-[14px] font-medium text-neutral-900"
        >
          Business name
        </label>
        <input
          id={ids.businessName}
          name="businessName"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="Kofi Electronics"
          autoComplete="organization"
          className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-neutral-900"
        />
        <FieldError message={fieldErrors.businessName} />
      </div>

      <div>
        <label
          htmlFor={ids.subdomain}
          className="block text-[14px] font-medium text-neutral-900"
        >
          Your shop address
        </label>
        <div className="mt-2 flex items-stretch overflow-hidden rounded-xl border border-neutral-300 bg-white focus-within:border-neutral-900">
          <input
            id={ids.subdomain}
            name="subdomain"
            value={subdomain}
            onChange={(event) =>
              setEditedSubdomain(event.target.value.toLowerCase())
            }
            placeholder="kofi"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 px-4 py-2.5 text-[15px] outline-none"
          />
          <span className="flex items-center bg-neutral-50 px-3 font-mono text-[13px] text-neutral-500">
            .{rootDomain}
          </span>
        </div>

        {availability.status === "checking" ? (
          <p className="mt-1.5 text-[13px] text-neutral-400">Checking…</p>
        ) : availability.status === "done" && availability.ok ? (
          <p className="mt-1.5 text-[13px] text-neutral-600">
            <span className="font-mono">
              {subdomain}.{rootDomain}
            </span>{" "}
            is available.
          </p>
        ) : (
          <FieldError
            message={
              (availability.status === "done"
                ? availability.reason
                : undefined) ?? fieldErrors.subdomain
            }
          />
        )}
      </div>

      <div>
        <label
          htmlFor={ids.whatsapp}
          className="block text-[14px] font-medium text-neutral-900"
        >
          WhatsApp number
        </label>
        <GhanaPhoneInput
          id={ids.whatsapp}
          name="whatsappNumber"
          whatsapp
          required
          requiredMessage="Enter your WhatsApp number."
          wrapperClassName="mt-2"
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-base outline-none focus:border-neutral-900 aria-invalid:border-red-500"
          error={fieldErrors.whatsappNumber}
          errorClassName="mt-1.5 text-[13px] text-red-600"
          hint="Shown on your shop so shoppers can message you about their orders."
          hintClassName="mt-1.5 text-[13px] text-neutral-500"
        />
      </div>

      <div>
        <label
          htmlFor={ids.description}
          className="block text-[14px] font-medium text-neutral-900"
        >
          What do you sell?{" "}
          <span className="font-normal text-neutral-400">Optional</span>
        </label>
        <input
          id={ids.description}
          name="description"
          placeholder="Phone accessories and gadgets in Accra"
          className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-neutral-900"
        />
      </div>

      <div>
        <label
          htmlFor={ids.primaryColor}
          className="block text-[14px] font-medium text-neutral-900"
        >
          Shop colour
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id={ids.primaryColor}
            name="primaryColor"
            type="color"
            defaultValue="#000000"
            className="h-11 w-16 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1"
          />
          <p className="text-[13px] text-neutral-500">
            Used for buttons and links on your shop. You can change it later.
          </p>
        </div>
        <FieldError message={fieldErrors.primaryColor} />
      </div>

      <SubmitButton />

      <p className="text-center text-[13px] text-neutral-500">
        Your shop goes live straight away, and your 14-day free trial starts
        today. No payment details needed. By opening your shop you agree to
        the{" "}
        <a href="/terms" className="underline underline-offset-2">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
