/**
 * D-18 subscription prices and period arithmetic — the one place these live.
 *
 * Pure (no Prisma, no `@/` imports) so it can be unit-tested with plain
 * `node --test` and shared by the billing page, the server action that starts
 * a payment, and the code that applies one. Pricing and applying a payment
 * must never disagree about when a period starts or what it costs, so both
 * go through `nextPeriodStart` and `pricePesewas` below.
 *
 * Never trust an amount, interval or setting sent from the client: the client
 * only ever names an interval, and `parseInterval` rejects anything else.
 */

export const TRIAL_DAYS = 14;

/** D-18c: how long a checkout-on storefront order holds stock for payment. */
export const STOREFRONT_PAYMENT_HOLD_HOURS = 24;

/** T10: when an unpaid checkout-on order gets its one payment reminder. */
export const PAYMENT_REMINDER_MINUTES = 30;

/** Founding deal (D-18): 50% off any interval, for 12 months. */
export const FOUNDING_DISCOUNT_PERCENT = 50;
export const FOUNDING_MONTHS = 12;

export const INTERVALS = {
  MONTHLY: { pesewas: 8900, months: 1, label: "Monthly" },
  QUARTERLY: { pesewas: 26700, months: 3, label: "Quarterly" },
  // 10 months' price for 12: "2 months free".
  YEARLY: { pesewas: 89000, months: 12, label: "Yearly" },
} as const;

export type BillingInterval = keyof typeof INTERVALS;

export const INTERVAL_KEYS = Object.keys(INTERVALS) as BillingInterval[];

export function parseInterval(value: unknown): BillingInterval | null {
  return typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(INTERVALS, value)
    ? (value as BillingInterval)
    : null;
}

/** The subset of Merchant that pricing and periods depend on. */
export type BillingFields = {
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  priceOverridePercent: number | null;
  priceOverrideEndsAt: Date | null;
};

/**
 * When a payment made now would start: never in the past, and never before
 * the paid time or trial the merchant already has. So paying during a trial
 * starts at `trialEndsAt`, paying while active stacks onto `currentPeriodEnd`,
 * and paying while lapsed starts now.
 */
export function nextPeriodStart(
  merchant: Pick<BillingFields, "currentPeriodEnd" | "trialEndsAt">,
  now: Date
): Date {
  let start = now.getTime();
  if (merchant.currentPeriodEnd) {
    start = Math.max(start, merchant.currentPeriodEnd.getTime());
  }
  if (merchant.trialEndsAt) {
    start = Math.max(start, merchant.trialEndsAt.getTime());
  }
  return new Date(start);
}

/**
 * Price in whole pesewas for a period starting at `periodStart`.
 *
 * The founding discount applies only when the period *starts* before the deal
 * ends. Pricing by period start stops a founding merchant prepaying years at
 * 50% in month 11, while a period that starts inside the 12 months gets the
 * founding price in full (D-18 assumption).
 */
export function pricePesewas(
  merchant: Pick<BillingFields, "priceOverridePercent" | "priceOverrideEndsAt">,
  interval: BillingInterval,
  periodStart: Date
): number {
  const list = INTERVALS[interval].pesewas;
  if (discountApplies(merchant, periodStart)) {
    return Math.round((list * (100 - merchant.priceOverridePercent!)) / 100);
  }
  return list;
}

export function discountApplies(
  merchant: Pick<BillingFields, "priceOverridePercent" | "priceOverrideEndsAt">,
  periodStart: Date
): boolean {
  const percent = merchant.priceOverridePercent;
  return (
    percent != null &&
    percent > 0 &&
    percent < 100 &&
    merchant.priceOverrideEndsAt != null &&
    periodStart.getTime() < merchant.priceOverrideEndsAt.getTime()
  );
}

/**
 * Calendar months, clamped to the end of the target month: Jan 31 + 1 month
 * is the last day of February, not 3 March. UTC throughout (Ghana is UTC+0
 * with no daylight saving, so this is also local time).
 */
export function addMonths(date: Date, months: number): Date {
  const month = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** The period a payment for `interval` buys, given when it starts. */
export function periodFor(
  interval: BillingInterval,
  periodStart: Date
): { periodStart: Date; periodEnd: Date } {
  return { periodStart, periodEnd: addMonths(periodStart, INTERVALS[interval].months) };
}
