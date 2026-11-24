/** The merchant's own returns and refunds policy (D-23). Plain text. */
export const MAX_RETURNS_POLICY = 3000;

/**
 * Browsers submit textarea line breaks as CRLF but count each as one character
 * towards maxLength, so normalise before checking the length.
 */
export function cleanReturnsPolicy(
  input: unknown
): { ok: true; policy: string | null } | { ok: false; error: string } {
  const policy = (typeof input === "string" ? input : "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (policy.length > MAX_RETURNS_POLICY) {
    return { ok: false, error: `Use at most ${MAX_RETURNS_POLICY} characters.` };
  }
  return { ok: true, policy: policy || null };
}
