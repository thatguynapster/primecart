/**
 * Ghanaian phone numbers (D-18e). Pure: unit-tested with `node --test`.
 *
 * Accepts the three ways people actually type a number (`024 400 0000`,
 * `233244000000`, `+233 24 400 0000`) and normalises to E.164
 * (`+233244000000`). Anything else is rejected rather than guessed at: a
 * wrong WhatsApp number means the merchant can't reach the buyer at all.
 */

const SEPARATORS = /[\s\-().]/g;

export function normalizeGhanaPhone(raw: string): string | null {
  const compact = raw.trim().replace(SEPARATORS, "");

  const match =
    /^0([1-9]\d{8})$/.exec(compact) ??
    /^233([1-9]\d{8})$/.exec(compact) ??
    /^\+233([1-9]\d{8})$/.exec(compact);

  return match ? `+233${match[1]}` : null;
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
