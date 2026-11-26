/**
 * Effective subscription status (D-18). Pure: see plans.ts for why.
 *
 * LAPSED is computed, never stored. Nothing has to run at the moment a trial
 * or period ends, and a late webhook that extends `currentPeriodEnd` takes
 * effect on the very next request.
 */

export type EffectiveStatus = "TRIAL" | "ACTIVE" | "LAPSED";

export type StatusFields = {
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** D-24: days after a lapse before the shop closes and the dashboard locks. */
export const GRACE_DAYS = 7;
/** D-25: days after a lapse before the storefront itself goes off. */
export const OFFLINE_DAYS = 10;

export function effectiveStatus(merchant: StatusFields, now: Date): EffectiveStatus {
  // No D-18 clock yet (scripts/backfill-d18.mjs runs on deploy). Never lock
  // out a merchant because a backfill hasn't reached them. Deliberately
  // ignores `subscriptionStatus`: merchants created 13–24 Aug 2026 carry a
  // stale value from the removed Phase 13 subscription (enum, default TRIAL,
  // sometimes EXPIRED) with no D-18 dates — that is "not migrated", not lapsed.
  if (merchant.trialEndsAt == null && merchant.currentPeriodEnd == null) {
    return "ACTIVE";
  }

  if (merchant.currentPeriodEnd && merchant.currentPeriodEnd.getTime() > now.getTime()) {
    return "ACTIVE";
  }
  if (merchant.trialEndsAt && merchant.trialEndsAt.getTime() > now.getTime()) {
    return "TRIAL";
  }
  return "LAPSED";
}

/** When the current trial or paid time runs out; null when lapsed or legacy. */
export function accessEndsAt(merchant: StatusFields, now: Date): Date | null {
  const status = effectiveStatus(merchant, now);
  if (status === "ACTIVE") return merchant.currentPeriodEnd;
  if (status === "TRIAL") return merchant.trialEndsAt;
  return null;
}

/** When the last trial or paid time ends or ended; null with no D-18 clock. */
export function lastAccessEnd(
  merchant: Pick<StatusFields, "trialEndsAt" | "currentPeriodEnd">
): Date | null {
  const ends = [merchant.currentPeriodEnd, merchant.trialEndsAt].filter(
    (date): date is Date => date != null
  );
  return ends.length > 0 ? new Date(Math.max(...ends.map((date) => date.getTime()))) : null;
}

/** When new orders stop and the dashboard locks, unless they pay. Null: never. */
export function closesAt(
  merchant: Pick<StatusFields, "trialEndsAt" | "currentPeriodEnd">
): Date | null {
  const end = lastAccessEnd(merchant);
  return end ? new Date(end.getTime() + GRACE_DAYS * DAY_MS) : null;
}

/** D-24: past the grace period. No new orders; only billing and existing orders open. */
export function isClosed(
  merchant: Pick<StatusFields, "trialEndsAt" | "currentPeriodEnd">,
  now: Date
): boolean {
  const at = closesAt(merchant);
  return at != null && at.getTime() <= now.getTime();
}

/** When the storefront goes off, unless they pay. Null: never. */
export function offlineAt(
  merchant: Pick<StatusFields, "trialEndsAt" | "currentPeriodEnd">
): Date | null {
  const end = lastAccessEnd(merchant);
  return end ? new Date(end.getTime() + OFFLINE_DAYS * DAY_MS) : null;
}

/** D-25: the storefront is off. Only order pages still open. */
export function isOffline(
  merchant: Pick<StatusFields, "trialEndsAt" | "currentPeriodEnd">,
  now: Date
): boolean {
  const at = offlineAt(merchant);
  return at != null && at.getTime() <= now.getTime();
}

/** Whole days left, rounded up ("1 day left" until the very end). 0 if none. */
export function daysLeft(until: Date | null, now: Date): number {
  if (!until) return 0;
  return Math.max(0, Math.ceil((until.getTime() - now.getTime()) / DAY_MS));
}
