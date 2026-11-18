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

/** Whole days left, rounded up ("1 day left" until the very end). 0 if none. */
export function daysLeft(until: Date | null, now: Date): number {
  if (!until) return 0;
  return Math.max(0, Math.ceil((until.getTime() - now.getTime()) / DAY_MS));
}
