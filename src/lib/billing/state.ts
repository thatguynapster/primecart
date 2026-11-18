import type { Merchant } from "@prisma/client";

import {
  INTERVAL_KEYS,
  INTERVALS,
  discountApplies,
  nextPeriodStart,
  pricePesewas,
  type BillingInterval,
} from "@/lib/billing/plans";
import { accessEndsAt, daysLeft, effectiveStatus, type EffectiveStatus } from "@/lib/billing/status";

/**
 * The merchant's billing state right now. Reads the clock itself, so Server
 * Components call this rather than `new Date()` inline (the React Compiler's
 * purity rule, same reasoning as `isPast` in src/lib/format.ts).
 */
export type BillingState = {
  status: EffectiveStatus;
  /** When the current trial or paid time ends; null when lapsed. */
  endsAt: Date | null;
  daysLeft: number;
  /** Whether a founding price is still available for some period start. */
  foundingUntil: Date | null;
};

export function getBillingState(merchant: Merchant): BillingState {
  const now = new Date();
  const status = effectiveStatus(merchant, now);
  const endsAt = accessEndsAt(merchant, now);
  const foundingActive =
    merchant.priceOverridePercent != null &&
    merchant.priceOverrideEndsAt != null &&
    merchant.priceOverrideEndsAt.getTime() > now.getTime();

  return {
    status,
    endsAt,
    daysLeft: daysLeft(endsAt, now),
    foundingUntil: foundingActive ? merchant.priceOverrideEndsAt : null,
  };
}

/**
 * D-18f: a lapsed subscription locks the dashboard only. Server actions that
 * change products, settings or create orders return this instead of acting.
 * Still allowed while lapsed: billing; confirming, advancing, marking paid
 * and cancelling existing orders; switching storefront checkout off; and
 * updating payout details (both protect money that's still moving). The
 * storefront and its checkout keep working throughout.
 */
export const LAPSED_MESSAGE =
  "Your plan has expired, so changes are paused. Renew on the Billing page to make changes. Your shop is still online and taking orders.";

/** Lapsed: dashboard is read-only except billing and order handling (D-18f). */
export function isLapsed(merchant: Merchant): boolean {
  return effectiveStatus(merchant, new Date()) === "LAPSED";
}

export type Quote = {
  interval: BillingInterval;
  label: string;
  months: number;
  pesewas: number;
  listPesewas: number;
  discounted: boolean;
};

/** Unfinished checkouts older than this drop out of the payment history. */
export function stalePendingCutoff(): Date {
  return new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
}

/** What each interval would cost if paid now, and when that time would start. */
export function getQuotes(merchant: Merchant): { periodStart: Date; quotes: Quote[] } {
  const periodStart = nextPeriodStart(merchant, new Date());
  return {
    periodStart,
    quotes: INTERVAL_KEYS.map((interval) => ({
      interval,
      label: INTERVALS[interval].label,
      months: INTERVALS[interval].months,
      pesewas: pricePesewas(merchant, interval, periodStart),
      listPesewas: INTERVALS[interval].pesewas,
      discounted: discountApplies(merchant, periodStart),
    })),
  };
}
