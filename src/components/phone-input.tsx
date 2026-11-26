"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import GhanaFlag from "country-flag-icons/react/3x2/GH";
import PhoneNumberInput from "react-phone-number-input/input";

import {
  GHANA_MOMO_ERROR,
  GHANA_PHONE_ERROR,
  normalizeGhanaMobile,
  normalizeGhanaPhone,
} from "@/lib/phone";

/**
 * A Ghanaian phone number, formatted as it's typed (`024 400 0000`, or
 * `+233 24 400 0000` when typed with the code). Every phone field in the app
 * uses this: onboarding, checkout, settings (WhatsApp and the MoMo payout
 * number) and manual orders.
 *
 * The check is `normalizeGhanaPhone` (or `normalizeGhanaMobile` with
 * `mobile`), the same one the server runs, on the
 * text the server will receive, so the two can't disagree. It works through
 * the browser's own form validation: a bad number stops the submit, whatever
 * handles it, and the message shows under the field instead of a browser
 * bubble. It shows on leaving a filled-in field or on submit, and clears as
 * soon as the number is right.
 *
 * Styles come from the form, which passes its own input and error classes.
 * A Ghana flag sits inside the field on the left, as numbers from elsewhere
 * aren't accepted.
 */
export function GhanaPhoneInput({
  id,
  name,
  className,
  wrapperClassName,
  errorClassName,
  hint,
  hintClassName,
  defaultValue,
  required = false,
  requiredMessage = "Enter a WhatsApp number.",
  placeholder = "024 400 0000",
  mobile = false,
  error,
}: {
  id: string;
  name: string;
  className: string;
  /** Spacing above the field goes here, not on the input, so the flag lines up. */
  wrapperClassName?: string;
  errorClassName: string;
  /** Shown under the field while there's no error. */
  hint?: ReactNode;
  hintClassName?: string;
  /** A saved number, in any form. */
  defaultValue?: string | null;
  required?: boolean;
  requiredMessage?: string;
  placeholder?: string;
  /** Mobile numbers only (02x, 05x), for mobile money. */
  mobile?: boolean;
  /** From the server. */
  error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // Passed once and never changed: the library keeps the typed digits itself.
  // Feeding its output back in as `value` makes it re-derive the digits from
  // a half-typed number, which drops the leading 0 when typing fast.
  const [initial] = useState(() => toE164(defaultValue));
  const [shown, setShown] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const check = useCallback(
    (raw: string): string | null => {
      const text = raw.trim();
      const found = !text
        ? required
          ? requiredMessage
          : null
        : (mobile ? normalizeGhanaMobile : normalizeGhanaPhone)(text)
          ? null
          : mobile
            ? GHANA_MOMO_ERROR
            : GHANA_PHONE_ERROR;
      ref.current?.setCustomValidity(found ?? "");
      setProblem(found);
      return found;
    },
    [required, requiredMessage, mobile]
  );

  const message = (shown ? problem : null) ?? error;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <>
      <div className={`relative ${wrapperClassName ?? ""}`}>
        <GhanaFlag
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-auto -translate-y-1/2 rounded-xs"
        />
        <PhoneNumberInput
          ref={ref}
          id={id}
          name={name}
          type="tel"
          autoComplete="tel"
          placeholder={placeholder}
          defaultCountry="GH"
          value={initial}
          onChange={ignore}
          inputComponent={TextInput}
          onText={check}
          onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
            if (event.currentTarget.value.trim()) setShown(true);
          }}
          onInvalid={(event: React.InvalidEvent<HTMLInputElement>) => {
            // Show our message instead of the browser's bubble.
            event.preventDefault();
            setShown(true);
            const firstInvalid = event.currentTarget.form?.querySelector(":invalid");
            if (firstInvalid === event.currentTarget) event.currentTarget.focus();
          }}
          aria-required={required || undefined}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : hint ? hintId : undefined}
          className={`${className} pl-11!`}
        />
      </div>
      {message ? (
        <p id={errorId} className={errorClassName}>
          {message}
        </p>
      ) : (
        hint && (
          <p id={hintId} className={hintClassName}>
            {hint}
          </p>
        )
      )}
    </>
  );
}

function ignore() {}

/**
 * The library's input renders this, with the formatted text as `value`: the
 * text the form will submit, checked after every change.
 */
const TextInput = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<"input"> & { onText?: (text: string) => unknown }
>(function TextInput({ onText, ...props }, ref) {
  const text = String(props.value ?? "");
  useEffect(() => void onText?.(text), [text, onText]);
  return <input {...props} ref={ref} />;
});

/**
 * The library only takes E.164. A number saved before numbers were checked
 * may be in another form, or not Ghanaian at all; it's still shown, so that
 * saving the form doesn't quietly erase it, and the check then asks for a
 * Ghanaian one.
 */
function toE164(saved: string | null | undefined): string | undefined {
  if (!saved?.trim()) return undefined;
  const ghana = normalizeGhanaPhone(saved);
  if (ghana) return ghana;
  const digits = saved.replace(/\D/g, "");
  if (!digits) return undefined;
  // 0XXXXXXXXX is a Ghanaian number written nationally.
  if (/^0\d{9}$/.test(digits)) return `+233${digits.slice(1)}`;
  return `+${digits}`;
}
