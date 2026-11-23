# D-18 launch runbook: subscriptions + checkout add-on

**For:** the owner. **Branch:** `feat/subscriptions-d18` (off `feat/v2`). **Spec:** [`PRIMECART_D18_IMPLEMENTATION.md`](./PRIMECART_D18_IMPLEMENTATION.md). **Tasks:** Phase 18 in [`TASKS.md`](./TASKS.md).

Everything in the brief (T0–T14, plus §6's lapsed gate and billing emails) is built and committed. This file covers what only you can do, in the order to do it. The production build **will fail on purpose** until step 1 is done, because a deploy must never migrate the database without a backup.

---

## 1. Backup bucket (blocks the production deploy, ~10 min)

1. Cloudflare dashboard → R2 → **Create bucket** `primecart-backups`. Leave it **private** (no public access, no custom domain).
2. Bucket → Settings → **Object lifecycle rules** → add rule: delete objects after **60 days** (they contain customers' personal data; `/privacy` says 60 days).
3. R2 → **Manage API tokens** → Create token: *Object Read & Write*, **scoped to `primecart-backups` only**. Not the image-upload token.
4. Vercel → Project → Settings → Environment Variables, **Production only**:

   | Name | Value |
   | --- | --- |
   | `BACKUP_R2_ACCESS_KEY_ID` | from step 3 |
   | `BACKUP_R2_SECRET_ACCESS_KEY` | from step 3 |
   | `BACKUP_R2_BUCKET` | `primecart-backups` |

   `R2_ACCOUNT_ID` is reused from the image setup and should already be there.

## 2. Other environment variables

| Name | Where | Value |
| --- | --- | --- |
| `FOUNDING_MERCHANT_IDS` | **Production only** | The founding merchants' Merchant `_id`s, comma-separated. Can be added after launch: see "Founding merchants" below. A malformed id fails the build on purpose. |
| `SUPPORT_EMAIL` | Production + Preview | The address shown on `/privacy` and `/terms`. **The mailbox must exist.** Defaults to `support@primecart.app`. |
| `RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL` | Production | Order emails and error alerts. **The production build fails without them**, or if the sender is `@resend.dev`. `ADMIN_NOTIFICATION_EMAIL` is your own inbox. |

**Check:** Preview and Production use **different** `DATABASE_URL`s (Phase 15 note). Otherwise every branch build migrates production.

## 2a. Founding merchants (can be done after launch)

Launching without `FOUNDING_MERCHANT_IDS` is fine: founding merchants start on the normal trial like everyone else, and get the deal on the first deploy after the ids are set.

1. **Find the ids** (read-only, no emails printed), from a machine that can reach Atlas, with `DATABASE_URL` pointing at **production**:
   ```
   npm run db:list-merchants
   ```
   Or in Atlas → Browse Collections → `Merchant`, filter `{ "storefront.subdomain": { "$exists": true } }`, project `{ "_id": 1, "storefront.subdomain": 1, "storefront.businessName": 1 }`.
2. Vercel → Environment Variables → **Production only**: `FOUNDING_MERCHANT_IDS=<id>,<id>`.
3. **Redeploy** production (env var changes only apply on a new deploy; the backfill runs in `vercel-build`).
4. Build log: `"foundingIdsConfigured":2,"foundingIdsFound":2`. Found fewer = a wrong id or a dev id; the build still passes but that merchant pays list price.
5. Each founding merchant's Billing page shows "Founding price until <deploy date + 12 months>" and 50% prices.

What happens to them in the meantime, and after:
- **The 12 months start on the deploy that applies the ids**, not at launch. Adding a second id later never moves the first one's end date. Their trial dates are untouched.
- **A payment they start at list price before the ids are applied still counts** if they finish it afterwards (a payment is accepted when it covers at least the current price). It is not refunded down to 50%: if that happens, refund the difference from the Paystack dashboard.
- Payments already made at list price are not adjusted automatically.

## 3. Test on dev first (`dev.primecart.app`)

`dev.primecart.app` builds from `feat/v2`. Merge the PR into `feat/v2` (Preview env: the backup step skips itself there, and the D-18 backfill runs against `primecart-dev`). In the build log, check for:

```
Backup skipped: VERCEL_ENV=preview …
D-18 backfill summary: {"trialStarted":{…},"checkoutDefaultedOff":{…},…,"onboardedStillMissing":0}
```

Then walk through the checklist in §6 below on `aura-stone.dev.primecart.app` with Paystack in test mode. I can drive most of it in the browser if you're signed in to the dashboard there.

## 4. cron-job.org

| Job | URL | Schedule | Notes |
| --- | --- | --- | --- |
| Order expiry + reminders | `…/api/cron/expire-orders` | every 5 min | **Existing job, no change.** Now also sends the 30-minute payment reminder. |
| Billing reminders | `https://primecart.app/api/cron/billing-reminders` | **daily** (e.g. 08:00 GMT) | **New.** Same `Authorization: Bearer <CRON_SECRET>` header. Trial-ending / renewal / expired emails. |

The first trials end about 14 days after the production deploy. The billing-reminder job needs to exist by then (first email goes 3 days before).

## 5. Daily backup on GitHub Actions

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
| --- | --- |
| `DATABASE_URL` | A **read-only** Atlas user made just for backups (Atlas → Database Access → Add user → role *Read only any database*, or `read` on `primecart`). |
| `R2_ACCOUNT_ID` | same as Vercel |
| `BACKUP_R2_ACCESS_KEY_ID` / `BACKUP_R2_SECRET_ACCESS_KEY` | the backup token from step 1 |

Then Actions → **Database backup** → *Run workflow* once by hand and check the log ends with `Backup uploaded: r2://primecart-backups/production/scheduled/…`. Atlas network access must allow GitHub's runners (`0.0.0.0/0`, as Vercel already uses).

**Restore drill (once now, then monthly):** from a machine that can reach Atlas, restore the newest backup into a **new, empty** database and check the counts:

```
node --env-file=.env scripts/restore-db.mjs production/<file>.ejson.gz "mongodb+srv://…/primecart-restore-test?…"
```

Record the date in TASKS.md's Phase 18 "Restore drills" table. (The backup → restore round trip itself is covered by `npm run test:db`, which passes.)

## 6. Acceptance checklist on dev (brief T13)

Already verified offline (no database needed):
- [x] Prices, intervals, founding 50% on all intervals, period stacking, pay-during-trial starts at `trialEndsAt`, pay-while-lapsed starts now, month-end clamping, Ghana phone normalisation (`npm test`, 26 checks)
- [x] `db:backfill-d18` run twice: second run changes nothing; checkout-on merchant stays on; founding end date doesn't move; open Paystack orders untouched (`npm run test:db`)
- [x] Merchants who signed up 13–24 Aug 2026 (stale Phase 13 `subscriptionStatus`, no D-18 dates) get a fresh 14-day trial, not "Expired" (`npm run test:db`; found on dev, see below)
- [x] Backup → restore keeps every BSON type and the unique subdomain index; restore refuses a non-empty target (`npm run test:db`)
- [x] `tsc --noEmit`, `eslint` (0 errors), `next build`

Needs the deployed dev environment (ticked = verified on `aura-stone`, 2026-11-18):
- [ ] New sign-up: no payout step; trial 14 days; banner shows; storefront button says "Place order"
- [x] Checkout off: order unpaid, **stock unchanged**, order page says "Order received", never "waiting for payment"
- [ ] Merchant new-order email for a checkout-off order has the WhatsApp button (owner: check the aura-stone inbox)
- [x] Checkout off, order more than stock → rejected at checkout (storefront caps quantity; edited cart blocked)
- [x] Two checkout-off orders for the last unit: both accepted; confirming the second is blocked with "Only 0 left of …"
- [x] Cancel a checkout-off order before confirming: stock unchanged. After confirming: stock restored
- [x] Unpaid manual order: stock deducted; still open after the cron runs. Checkout-off order also still open (verified on dev 2026-11-18 with the cron re-enabled, after the fix below)
- [x] Settings: with a subaccount → on at once; Off → storefront button back to "Place order" immediately. (Without a subaccount → payout form: not exercised on dev, aura-stone has one)
- [x] Checkout on: GHS 6,038 order → stock taken at once, 24 h hold shown to the buyer, "Pay now · GH₵6,038.00". Owner: confirm the Paystack split is GH₵181.14 (no cap)
- [ ] Reminder email ~30 min after an unpaid checkout-on order, once (run the cron twice)
- [x] Pay now issues a new link; paying the **old** link still settles the order (stock not deducted twice)
- [x] Billing: pay monthly in test mode → "Paid until 2 Jan 2027" = trial end + 1 month; webhook + return path both ran, time added once. "Continue payment" reopens the same checkout; a new payment hides earlier unpaid ones
- [x] Existing storefront `charge.success` still settles orders (subscription branch doesn't swallow it)

Launch hardening (2026-11-23), to check on dev:
- [ ] New product with 5 full-size phone photos saves with all 5 photos (from a real phone)
- [ ] Logo with transparency stays transparent; hero and banner upload
- [ ] New product with a missing price: error shows, text and photos are still there
- [ ] Dashboard on a phone: tab bar, orders, order page, products, settings, billing; no sideways scroll
- [ ] Checkout-off order: the buyer gets an email with a working order link
- [ ] Unknown product link shows the shop's "Page not found"
- [ ] Sixth order from one phone number within an hour is refused

## 7. Production deploy

1. Tell both merchants (brief §8): checkout is now **off**; shoppers order and they arrange payment on WhatsApp; they can switch it back on in Settings (no payout setup needed, their subaccounts are kept); 14-day trial starts at deploy.
2. Steps 1–2 done. Merge to the production branch.
3. Build log: `Backup uploaded: r2://primecart-backups/production/…` and the D-18 backfill summary with `"onboardedStillMissing":0`.
4. Set Paystack **live** webhook is unchanged (`https://primecart.app/api/webhooks/paystack`): subscription payments use the same URL.
5. One live monthly payment on a test merchant, then refund it from the Paystack dashboard.

## What changed for merchants, in one paragraph (for your message to them)

PrimeCart is now GHS 89/month with everything included, after a 14-day free trial (no payment details needed). Your shop works the same, but online checkout is now optional and starts **off**: shoppers place orders without paying, you get an email with their WhatsApp number, and you confirm the order and arrange payment yourself. Stock comes off when you confirm or mark it paid. If you'd rather take payment online, switch on "Take payments on your storefront" in Settings: shoppers pay by MoMo or card, PrimeCart keeps 3% (payment fees included), and you're paid the next working day.

## Found on dev and fixed

- **Stale Phase 13 subscription status.** The removed Aug 2026 subscription left `subscriptionStatus` (enum default `TRIAL`, sometimes `EXPIRED`) on merchants who signed up 13–24 Aug, with no D-18 dates. The first backfill skipped them (it matched `subscriptionStatus: null`), so they showed **Expired** with a read-only dashboard. On dev that was `aura-stone`; in production it would almost certainly have been the founding merchants. The backfill, onboarding and the status check now key on the D-18 dates instead, so those merchants get their 14-day trial on the next deploy.

- **Checkout-off and unpaid manual orders were expired by the 5-minute cron.** They store `reservedUntil: null` ("never expires"), but on MongoDB Prisma's `reservedUntil: { lt: now }` also matches `null`. On dev, two checkout-off orders went to Expired within a minute; an unpaid manual order would also have had its stock put back. The sweep and `expireOrder` now require a real hold (`src/lib/orders/expiry-filter.ts`), checked against Prisma in `npm run test:db`.
- **Vercel Build Command override.** The project's Build Command was `npm run build && npm run db:push`, so `vercel-build` never ran on any deploy: no pre-deploy backup, no `db:backfill` (Phase 15) and no `db:backfill-d18`. Changed to `npm run vercel-build` on 2026-11-18; the next dev deploy started aura-stone's trial. `npm run build` now fails on Vercel (`scripts/require-vercel-build.mjs`) so the override can't silently come back. **Before the first production deploy, check Production also builds with `npm run vercel-build`.**

## Decisions I made that weren't spelled out (tell me if you want any changed)

- **Trial clock for not-yet-onboarded merchants.** The backfill gives a trial only to merchants who have a shop. Anyone mid-signup gets their 14 days when they finish onboarding, not at deploy time.
- **Legacy fee cap is GHS 100, not 500.** Orders without a `platformFee` snapshot all predate 6 Oct, when the cap was GHS 100.
- **Lapsed merchants can still** advance any existing order (not just confirm), switch checkout **off**, and update payout details. All protect money or buyers. Everything else is read-only.
- **Duplicate payments are flagged.** If a buyer pays two links, or pays online after you marked an order paid, the merchant gets a "needs review" email and the extra payment is logged for a refund. Previously it would have been silently ignored.
- **Pending checkout-off orders** count in the side-rail badge and show "New — confirm" in the orders list, since nothing else prompts the merchant to contact the buyer.
- **Legal pages** live at `/privacy` and `/terms` (the brief's paths; supersedes 17.1/17.2's `/legal/*`). They are drafts: get them reviewed.
