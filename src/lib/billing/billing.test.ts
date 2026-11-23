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
import { daysLeft, effectiveStatus } from "./status.ts";
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

describe("normalizeGhanaPhone", () => {
  it("accepts the three formats", () => {
    assert.equal(normalizeGhanaPhone("0244000000"), "+233244000000");
    assert.equal(normalizeGhanaPhone("024 400 0000"), "+233244000000");
    assert.equal(normalizeGhanaPhone("233244000000"), "+233244000000");
    assert.equal(normalizeGhanaPhone("+233 24-400-0000"), "+233244000000");
    assert.equal(normalizeGhanaPhone(" +233244000000 "), "+233244000000");
  });
  it("rejects anything else", () => {
    for (const bad of ["", "24400000", "02440000000", "+2330244000000", "+44 7700 900000", "00233244000000", "abc", "0044000000"]) {
      assert.equal(normalizeGhanaPhone(bad), null, bad);
    }
  });
  it("builds wa.me links", () => {
    assert.equal(waMeLink("+233244000000"), "https://wa.me/233244000000");
    assert.equal(waMeLink("0244000000", "Hi & bye"), "https://wa.me/233244000000?text=Hi%20%26%20bye");
  });
});
