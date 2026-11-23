/**
 * Minutes to wait before each retry of a failed email. The total stays under
 * 24 hours, the life of a Resend idempotency key, so a retry of an email that
 * did go out (a timeout, say) is not delivered twice.
 */
const DELAYS_MINUTES = [5, 15, 60, 240, 720];

/** When to try again after `failures` failed attempts, or null to give up. */
export function nextAttemptAt(failures: number, now: Date): Date | null {
  const minutes = DELAYS_MINUTES[failures - 1];
  return minutes === undefined ? null : new Date(now.getTime() + minutes * 60 * 1000);
}
