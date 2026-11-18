/**
 * D-18 (Phase 18, task 18.3 / brief T3). Runs on EVERY deploy via
 * `vercel-build`, so every step only matches documents not yet migrated —
 * a step that set a value unconditionally would reset merchants on each
 * deploy (e.g. switch checkout back off for someone who turned it on).
 *
 * Steps:
 *   1. Onboarded merchants with no subscription yet -> 14-day TRIAL from now,
 *      plan STANDARD. Merchants who haven't finished onboarding are left
 *      alone: onboarding starts their trial (src/app/(app)/onboarding/
 *      actions.ts), so the clock doesn't run before they have a shop.
 *   2. Any merchant with no checkout setting -> checkout off (D-18a).
 *      Existing paystackSubaccountCode values are kept, so switching checkout
 *      back on needs no payout setup.
 *   3. FOUNDING_MERCHANT_IDS (comma-separated ObjectIds; set on Production
 *      only) whose plan isn't FOUNDING yet -> FOUNDING, 50% for 12 months.
 *      priceOverrideEndsAt is only ever set when missing, so a redeploy can
 *      never extend the deal.
 *
 * Open Paystack orders are not touched: they settle or expire as before.
 *
 * Exits non-zero if an onboarded merchant is still missing either field
 * afterwards, so a partial run fails the build (same guard as
 * backfill-customization.mjs).
 *
 * Locally: node --env-file=.env scripts/backfill-d18.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TRIAL_DAYS = 14;
const FOUNDING_PERCENT = 50;
const FOUNDING_MONTHS = 12;

const ejsonDate = (date) => ({ $date: date.toISOString() });

/** Calendar months, clamped to month end. Mirrors src/lib/billing/plans.ts. */
function addMonths(date, months) {
  const month = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(month / 12);
  const target = ((month % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      target,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    )
  );
}

// `field: null` matches both a missing field and an explicit null.
const ONBOARDED = { "storefront.subdomain": { $exists: true } };
const NO_CLOCK = { trialEndsAt: null, currentPeriodEnd: null };

async function count(query) {
  const result = await prisma.$runCommandRaw({ count: "Merchant", query });
  return result.n;
}

async function updateMany(q, u) {
  const result = await prisma.$runCommandRaw({
    update: "Merchant",
    updates: [{ q, u, multi: true }],
  });
  if (result.ok !== 1) throw new Error(`update failed: ${JSON.stringify(result)}`);
  return { matched: result.n, modified: result.nModified };
}

function foundingIds() {
  const raw = process.env.FOUNDING_MERCHANT_IDS ?? "";
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const invalid = ids.filter((id) => !/^[0-9a-f]{24}$/i.test(id));
  if (invalid.length > 0) {
    // Fail loudly: a typo here would silently charge a founding merchant
    // full price.
    throw new Error(`FOUNDING_MERCHANT_IDS has invalid ids: ${invalid.join(", ")}`);
  }
  return ids;
}

async function main() {
  const now = new Date();
  const summary = {};

  // 1. Trial for onboarded merchants without a D-18 clock. Keyed on the
  // dates, not subscriptionStatus: merchants created 13–24 Aug 2026 still
  // carry a Phase 13 status (enum default TRIAL, or EXPIRED) with no
  // trialEndsAt, and would otherwise be skipped and show as lapsed.
  // Idempotent: the update sets trialEndsAt, so a rerun matches nothing.
  summary.trialStarted = await updateMany(
    { ...ONBOARDED, ...NO_CLOCK },
    {
      $set: {
        subscriptionStatus: "TRIAL",
        trialEndsAt: ejsonDate(new Date(now.getTime() + TRIAL_DAYS * 864e5)),
      },
    }
  );
  // Plan separately, only where missing, so it can never overwrite FOUNDING.
  summary.planDefaulted = await updateMany(
    { ...ONBOARDED, plan: null },
    { $set: { plan: "STANDARD" } }
  );

  // 2. Checkout off where never set (D-18a).
  summary.checkoutDefaultedOff = await updateMany(
    { storefrontPaymentsEnabled: null },
    { $set: { storefrontPaymentsEnabled: false } }
  );

  // 3. Founding merchants.
  const ids = foundingIds();
  if (ids.length > 0) {
    const byId = { _id: { $in: ids.map((id) => ({ $oid: id })) } };
    summary.foundingPlan = await updateMany(
      { ...byId, plan: { $ne: "FOUNDING" } },
      { $set: { plan: "FOUNDING", priceOverridePercent: FOUNDING_PERCENT } }
    );
    summary.foundingEndsAtSet = await updateMany(
      { ...byId, priceOverrideEndsAt: null },
      { $set: { priceOverrideEndsAt: ejsonDate(addMonths(now, FOUNDING_MONTHS)) } }
    );
    summary.foundingIdsConfigured = ids.length;
    summary.foundingIdsFound = await count(byId);
  } else {
    summary.foundingIdsConfigured = 0;
  }

  const remaining = await count({
    ...ONBOARDED,
    $or: [{ subscriptionStatus: null }, NO_CLOCK, { storefrontPaymentsEnabled: null }],
  });
  summary.onboardedStillMissing = remaining;

  console.log(`D-18 backfill summary: ${JSON.stringify(summary)}`);

  if (remaining > 0) {
    throw new Error(
      `${remaining} onboarded merchant(s) still missing subscriptionStatus or storefrontPaymentsEnabled after backfill`
    );
  }
  if (ids.length > 0 && summary.foundingIdsFound !== ids.length) {
    // Not fatal: the ids may belong to the other environment's database.
    console.warn(
      `FOUNDING_MERCHANT_IDS: ${ids.length} configured, ${summary.foundingIdsFound} found in this database.`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
