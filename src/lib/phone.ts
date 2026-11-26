/**
 * Ghanaian phone numbers (D-18e). Pure: unit-tested with `node --test`.
 *
 * Accepts the three ways people actually type a number (`024 400 0000`,
 * `233244000000`, `+233 24 400 0000`) and normalises to E.164
 * (`+233244000000`). Anything else is rejected rather than guessed at: a
 * wrong WhatsApp number means the merchant can't reach the buyer at all.
 *
 * The shape check is then confirmed by libphonenumber's rules for Ghana (the
 * same check react-phone-number-input's `isValidPhoneNumber` makes), which
 * turns away numbers no Ghanaian line starts with, like 014 or 044. The
 * browser runs this same function (src/components/phone-input.tsx), so the
 * two always agree.
 */
import { isValidPhoneNumber } from "libphonenumber-js/min";

const SEPARATORS = /[\s\-().]/g;

export function normalizeGhanaPhone(raw: string): string | null {
  const compact = raw.trim().replace(SEPARATORS, "");

  const match =
    /^0([1-9]\d{8})$/.exec(compact) ??
    /^233([1-9]\d{8})$/.exec(compact) ??
    /^\+233([1-9]\d{8})$/.exec(compact);

  if (!match) return null;
  const e164 = `+233${match[1]}`;
  return isValidPhoneNumber(e164) ? e164 : null;
}

export const GHANA_PHONE_ERROR =
  "Enter a Ghanaian WhatsApp number, like 024 400 0000 or +233 24 400 0000.";

/**
 * The digits `wa.me` wants: international format, no `+`. Accepts an E.164
 * number or anything `normalizeGhanaPhone` understands. For other input (a
 * number saved before normalisation existed) it strips non-digits, which is
 * what wa.me needs anyway.
 */
export function waMeDigits(phone: string): string {
  const normalised = normalizeGhanaPhone(phone);
  return (normalised ?? phone).replace(/\D/g, "");
}

export function waMeLink(phone: string, message?: string): string {
  const base = `https://wa.me/${waMeDigits(phone)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
