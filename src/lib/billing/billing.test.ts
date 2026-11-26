/**
 * Unit tests for the pure D-18 modules. Run with `npm test` (Node's built-in
 * runner with native TypeScript type stripping; no extra dependencies).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addMonths,
  nextPeriodStart,
  parseInterval,
  periodFor,
  pricePesewas,
  quoteCovers,
} from "./plans.ts";
import { closesAt, daysLeft, effectiveStatus, isClosed, isOffline, offlineAt } from "./status.ts";
import { reminderFor } from "./reminder-due.ts";
import { normalizeGhanaPhone, waMeLink } from "../phone.ts";

const d = (iso: string) => new Date(iso);
const none = { priceOverridePercent: null, priceOverrideEndsAt: null };
const founding = { priceOverridePercent: 50, priceOverrideEndsAt: d("2027-11-18T00:00:00Z") };

describe("parseInterval", () => {
  it("accepts the three intervals only", () => {
    assert.equal(parseInterval("MONTHLY"), "MONTHLY");
    assert.equal(parseInterval("QUARTERLY"), "QUARTERLY");
    assert.equal(parseInterval("YEARLY"), "YEARLY");
    assert.equal(parseInterval("WEEKLY"), null);
    assert.equal(parseInterval("toString"), null);
    assert.equal(parseInterval(undefined), null);
    assert.equal(parseInterval(12), null);
  });
});

describe("pricePesewas", () => {
  const start = d("2026-12-01T00:00:00Z");
  it("standard prices", () => {
    assert.equal(pricePesewas(none, "MONTHLY", start), 8900);
    assert.equal(pricePesewas(none, "QUARTERLY", start), 26700);
    assert.equal(pricePesewas(none, "YEARLY", start), 89000);
  });
  it("founding 50% on every interval while the period starts inside the deal", () => {
    assert.equal(pricePesewas(founding, "MONTHLY", start), 4450);
    assert.equal(pricePesewas(founding, "QUARTERLY", start), 13350);
    assert.equal(pricePesewas(founding, "YEARLY", start), 44500);
    // A yearly payment starting in month 11 still gets the full founding price.
    assert.equal(pricePesewas(founding, "YEARLY", d("2027-11-17T00:00:00Z")), 44500);
  });
  it("list price once the period starts at or after the deal ends", () => {
    assert.equal(pricePesewas(founding, "MONTHLY", d("2027-11-18T00:00:00Z")), 8900);
    assert.equal(pricePesewas(founding, "YEARLY", d("2028-01-01T00:00:00Z")), 89000);
  });
});

describe("quoteCovers", () => {
  const start = d("2026-12-01T00:00:00Z");
  it("list-price payment started before the merchant became founding still applies", () => {
    assert.equal(quoteCovers(8900, pricePesewas(founding, "MONTHLY", start)), true);
  });
  it("exact price applies", () => {
    assert.equal(quoteCovers(4450, pricePesewas(founding, "MONTHLY", start)), true);
    assert.equal(quoteCovers(8900, pricePesewas(none, "MONTHLY", start)), true);
  });
  it("paying less is rejected: founding quote after the deal ended, or tampered", () => {
    assert.equal(quoteCovers(4450, pricePesewas(founding, "MONTHLY", d("2027-12-01T00:00:00Z"))), false);
    assert.equal(quoteCovers(100, pricePesewas(none, "MONTHLY", start)), false);
    assert.equal(quoteCovers(8899.5, 8900), false);
  });
});

describe("nextPeriodStart", () => {
  const now = d("2026-11-18T10:00:00Z");
  it("pay during trial starts at trialEndsAt", () => {
    const trialEndsAt = d("2026-12-02T10:00:00Z");
    assert.deepEqual(nextPeriodStart({ trialEndsAt, currentPeriodEnd: null }, now), trialEndsAt);
  });
  it("pay while lapsed starts now", () => {
    assert.deepEqual(
      nextPeriodStart({ trialEndsAt: d("2026-11-01T00:00:00Z"), currentPeriodEnd: d("2026-11-10T00:00:00Z") }, now),
      now
    );
  });
  it("payments stack on currentPeriodEnd", () => {
    const currentPeriodEnd = d("2027-02-16T00:00:00Z");
    assert.deepEqual(nextPeriodStart({ trialEndsAt: null, currentPeriodEnd }, now), currentPeriodEnd);
  });
});

describe("addMonths / periodFor", () => {
  it("adds 1/3/12 calendar months", () => {
    const start = d("2026-12-02T10:00:00Z");
    assert.deepEqual(periodFor("MONTHLY", start).periodEnd, d("2027-01-02T10:00:00Z"));
    assert.deepEqual(periodFor("QUARTERLY", start).periodEnd, d("2027-03-02T10:00:00Z"));
    assert.deepEqual(periodFor("YEARLY", start).periodEnd, d("2027-12-02T10:00:00Z"));
  });
  it("clamps to month end", () => {
    assert.deepEqual(addMonths(d("2027-01-31T08:00:00Z"), 1), d("2027-02-28T08:00:00Z"));
    assert.deepEqual(addMonths(d("2028-01-31T08:00:00Z"), 1), d("2028-02-29T08:00:00Z"));
    assert.deepEqual(addMonths(d("2026-11-30T00:00:00Z"), 3), d("2027-02-28T00:00:00Z"));
  });
  it("crosses year boundaries", () => {
    assert.deepEqual(addMonths(d("2026-11-15T00:00:00Z"), 3), d("2027-02-15T00:00:00Z"));
  });
});

describe("effectiveStatus", () => {
  const now = d("2026-11-18T10:00:00Z");
  it("legacy (unmigrated) merchant is ACTIVE", () => {
    assert.equal(effectiveStatus({ subscriptionStatus: null, trialEndsAt: null, currentPeriodEnd: null }, now), "ACTIVE");
  });
  it("stale Phase 13 status with no D-18 dates is not lapsed", () => {
    for (const stale of ["TRIAL", "ACTIVE", "EXPIRED"]) {
      assert.equal(effectiveStatus({ subscriptionStatus: stale, trialEndsAt: null, currentPeriodEnd: null }, now), "ACTIVE");
    }
  });
  it("trial, active, lapsed", () => {
    assert.equal(
      effectiveStatus({ subscriptionStatus: "TRIAL", trialEndsAt: d("2026-12-02T00:00:00Z"), currentPeriodEnd: null }, now),
      "TRIAL"
    );
    assert.equal(
      effectiveStatus({ subscriptionStatus: "ACTIVE", trialEndsAt: d("2026-11-01T00:00:00Z"), currentPeriodEnd: d("2026-12-01T00:00:00Z") }, now),
      "ACTIVE"
    );
    assert.equal(
      effectiveStatus({ subscriptionStatus: "TRIAL", trialEndsAt: d("2026-11-17T00:00:00Z"), currentPeriodEnd: null }, now),
      "LAPSED"
    );
  });
  it("paid during trial shows ACTIVE (paid time is already bought)", () => {
    assert.equal(
      effectiveStatus({ subscriptionStatus: "ACTIVE", trialEndsAt: d("2026-12-02T00:00:00Z"), currentPeriodEnd: d("2027-01-02T00:00:00Z") }, now),
      "ACTIVE"
    );
  });
  it("daysLeft rounds up", () => {
    assert.equal(daysLeft(d("2026-11-19T09:00:00Z"), now), 1);
    assert.equal(daysLeft(d("2026-12-02T10:00:00Z"), now), 14);
    assert.equal(daysLeft(null, now), 0);
  });
});

describe("grace period (D-24)", () => {
  const end = d("2026-11-18T10:00:00Z");
  const trial = { trialEndsAt: end, currentPeriodEnd: null };
  it("closes exactly 7 days after the end", () => {
    assert.deepEqual(closesAt(trial), d("2026-11-25T10:00:00Z"));
    assert.equal(isClosed(trial, d("2026-11-18T10:00:00Z")), false);
    assert.equal(isClosed(trial, d("2026-11-25T09:59:59Z")), false);
    assert.equal(isClosed(trial, d("2026-11-25T10:00:00Z")), true);
  });
  it("counts from the later of trial and paid time", () => {
    const both = { trialEndsAt: end, currentPeriodEnd: d("2026-12-18T10:00:00Z") };
    assert.equal(isClosed(both, d("2026-12-01T00:00:00Z")), false);
    assert.deepEqual(closesAt(both), d("2026-12-25T10:00:00Z"));
    assert.deepEqual(closesAt({ trialEndsAt: d("2027-01-01T00:00:00Z"), currentPeriodEnd: end }), d("2027-01-08T00:00:00Z"));
  });
  it("goes off exactly 10 days after the end, and back on when paid", () => {
    assert.deepEqual(offlineAt(trial), d("2026-11-28T10:00:00Z"));
    assert.equal(isOffline(trial, d("2026-11-28T09:59:59Z")), false);
    assert.equal(isOffline(trial, d("2026-11-28T10:00:00Z")), true);
    const now = d("2026-12-01T00:00:00Z");
    assert.equal(isOffline({ ...trial, currentPeriodEnd: d("2027-01-01T00:00:00Z") }, now), false);
    assert.equal(isOffline({ trialEndsAt: null, currentPeriodEnd: null }, now), false);
  });
  it("never closes a merchant with no dates", () => {
    const none = { trialEndsAt: null, currentPeriodEnd: null };
    assert.equal(closesAt(none), null);
    assert.equal(isClosed(none, d("2030-01-01T00:00:00Z")), false);
  });
  it("paying after closing reopens", () => {
    const now = d("2026-12-01T00:00:00Z");
    assert.equal(isClosed({ ...trial, currentPeriodEnd: d("2027-01-01T00:00:00Z") }, now), false);
  });
});

describe("reminderFor", () => {
  const lapsed = d("2026-11-18T10:00:00Z");
  const due = (now: string) => reminderFor("LAPSED", null, lapsed, d(now))?.kind ?? null;
  it("expired, then a warning in the last day before closing, then nothing", () => {
    assert.equal(due("2026-11-18T10:00:00Z"), "expired");
    assert.equal(due("2026-11-24T09:59:59Z"), "expired");
    assert.equal(due("2026-11-24T10:00:00Z"), "closing-1");
    assert.equal(due("2026-11-25T09:59:59Z"), "closing-1");
    assert.equal(due("2026-11-25T10:00:00Z"), null);
  });
  it("a daily run always hits the warning exactly once", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const runs = Array.from({ length: 9 }, (_, day) =>
        reminderFor("LAPSED", null, lapsed, new Date(Date.UTC(2026, 10, 18 + day, hour, 5)))?.kind
      );
      assert.equal(runs.filter((kind) => kind === "closing-1").length, 1, `hour ${hour}`);
    }
  });
  it("trial and renewal reminders are unchanged", () => {
    const now = d("2026-11-18T10:00:00Z");
    assert.equal(reminderFor("TRIAL", d("2026-11-21T10:00:00Z"), null, now)?.kind, "trial-3");
    assert.equal(reminderFor("TRIAL", d("2026-11-19T10:00:00Z"), null, now)?.kind, "trial-1");
    assert.equal(reminderFor("ACTIVE", d("2026-11-25T10:00:00Z"), null, now)?.kind, "renew-7");
    assert.equal(reminderFor("ACTIVE", d("2026-11-19T10:00:00Z"), null, now)?.kind, "renew-1");
    assert.equal(reminderFor("ACTIVE", d("2026-12-25T10:00:00Z"), null, now), null);
  });
});

describe("normalizeGhanaPhone", () => {
  it("accepts the three formats", () => {
    assert.equal(normalizeGhanaPhone("0244000000"), "+233244000000");
    assert.equal(normalizeGhanaPhone("024 400 0000"), "+233244000000");
    assert.equal(normalizeGhanaPhone("233244000000"), "+233244000000");
    assert.equal(normalizeGhanaPhone("+233 24-400-0000"), "+233244000000");
    assert.equal(normalizeGhanaPhone(" +233244000000 "), "+233244000000");
  });
  it("rejects anything else", () => {
    for (const bad of ["", "24400000", "02440000000", "+2330244000000", "+44 7700 900000", "00233244000000", "abc", "0044000000", "0144000000", "0444000000", "+233744000000"]) {
      assert.equal(normalizeGhanaPhone(bad), null, bad);
    }
  });
  it("accepts every kind of Ghanaian number", () => {
    for (const good of ["0204000000", "0234000000", "0554000000", "0594000000", "0302000000"]) {
      assert.ok(normalizeGhanaPhone(good), good);
    }
  });
  it("builds wa.me links", () => {
    assert.equal(waMeLink("+233244000000"), "https://wa.me/233244000000");
    assert.equal(waMeLink("0244000000", "Hi & bye"), "https://wa.me/233244000000?text=Hi%20%26%20bye");
  });
});
