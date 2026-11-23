# PrimeCart — D-18 Implementation Brief

**Subscriptions, 14-day trial, and storefront checkout as an opt-in add-on**

**Date:** 2026-11-17
**Owner:** Napster
**Status:** decisions final; ready to build
**Code audited against:** branch `feat/v2` at commit `96de037` (7 Oct 2026) — the source of truth. Phase 15 (DEV-6 profit tracking, DEV-7 customisation) is built and verified on this branch.

---

## How to use this file (read first, Claude Code)

1. Read this whole file before writing any code.
2. **Branch from `feat/v2`**, not `main` (`main` is behind at `269a880` and lacks Phase 15). Suggested branch: `feat/subscriptions-d18`, one commit per task in §5. Don't push to `main` or `feat/v2` directly.
3. Every file path, line number and behaviour in §3 was observed on `96de037`. If the local checkout is ahead of that, re-check each one before editing and trust the local code over this file.
4. The repo's `AGENTS.md` applies: this is Next.js 16 with breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing code, and heed deprecation notices.
5. Before starting, add the D-18 rows from §2 to the decision log in `docs/TASKS.md`, and log §5's tasks as a new phase (Phase 16), per the project's scope rule.
6. Schema changes: `npm run db:push`, **never** raw `npx prisma db push` (it drops the manual `storefront.subdomain` / `customDomain` indexes). Restart the dev server after `prisma generate`.
7. **The owner has no shell against the dev or production database.** Schema pushes and data migrations run during the Vercel build via the `vercel-build` script (see Phase 15 notes in `docs/TASKS.md`). Any migration in this brief must therefore be idempotent and safe to run on **every** deploy.
8. Don't break Phase 15: customisation lines (`lineKey`, `customization*` snapshots), cost snapshots and `platformFee` must keep working on both checkout paths and manual orders.
9. Where this file says "decide" or "assumption", ask the owner before changing it. Everything else is settled.

---

## 1. Context: why this is changing

- **Market:** most Ghanaian small sellers sell only through social media, and sales close on WhatsApp with direct MoMo payment. Storefronts alone are free elsewhere (Hubtel, Panta), so a checkout fee can't carry the business: merchants can and do route payment around it.
- **New model:** PrimeCart earns from a **monthly subscription** for the tools (store, inventory, orders, profit, tax records). Online checkout becomes an optional add-on with a 3% fee.
- **Target customer:** Accra fashion and accessories sellers on Instagram/TikTok (clothing, jewellery, custom pieces), roughly GHS 10k+/month in sales.
- **Revenue goal:** GHS 20–50k/month. At GHS 89/month that's roughly 225–560 paying merchants. Subscriptions carry the target; checkout fees are a small extra (PrimeCart nets about 1.05% per online order after Paystack's fee).
- **Validation (six weeks):** 10 paying fashion merchants including the two founding ones. Fewer than 5 at any price means the product needs to change, not the price.
- **History:** D-16 (Aug 2026) removed an earlier GHS 79 subscription after merchants objected to the 3% feeling like a charge *on top of* it. D-18 brings a subscription back but makes the 3% optional, which answers that objection. The two existing merchants were told pricing wasn't final.

---

## 2. Decisions — add to `docs/TASKS.md` as D-18

| ID | Decision |
| --- | --- |
| D-18 | **Subscription pricing, superseding D-16.** GHS 89/month, GHS 267/quarter, GHS 890/year (2 months free). Prepaid via one-off Paystack payments, because Paystack can't auto-renew over Mobile Money. 14-day free trial, no payment details asked for. Founding merchants: 50% off any interval for 12 months, agreed privately (never on a public page). |
| D-18a | **Storefront checkout is an opt-in add-on, off by default for everyone**, including the existing merchants (owner tells them personally). Without it, shoppers still place orders; the merchant contacts them on WhatsApp to confirm and arrange payment. |
| D-18b | **Checkout fee: 3% of every order, no cap.** The GHS 100 cap from D-16 is removed (Paystack doesn't cap its own fee in Ghana). PrimeCart keeps paying Paystack's 1.95% out of the 3% (`bearer: "account"`, unchanged): merchants pay 3% all-in. |
| D-18c | **Stock.** Checkout **on**: stock is reserved when the order is placed and held 24 hours for payment; unpaid orders then expire via the existing cron. Checkout **off**: placing an order doesn't touch stock; stock is deducted when the merchant confirms the order (or marks it paid), and that's blocked if stock has run out. |
| D-18d | **Payout setup leaves onboarding.** It happens when the merchant switches checkout on, only if they don't already have a Paystack subaccount. |
| D-18e | **Buyers give a WhatsApp number at checkout.** Automated WhatsApp messages (Cloud API) are a separate post-launch project; until then, payment reminders go by email and merchants get one-tap `wa.me` links. |
| D-18f | **A lapsed subscription locks the dashboard only.** Storefront stays up and checkout keeps taking payments. Consistent with D-17: no automatic takedowns. |
| D-18g | **Delivery fees:** after launch. |

### Assumptions the owner hasn't objected to (confirm if in doubt)
- Checkout-off stock is deducted at confirmation, with an oversell block (rather than fully manual stock).
- Manual orders created in the dashboard deduct stock at creation and never expire (replaces today's 30-minute expiry on unpaid manual orders).
- The 30-minute payment reminder goes by email for now and links to the PrimeCart order page, not a raw Paystack link.
- Yearly = 10 months' price; quarterly has no discount.
- A founding period that *starts* within the 12 months gets the founding price in full (a yearly payment in month 6 covers 12 months at 50%). Periods starting after the 12 months pay list price.

---

## 3. What the codebase looks like today (observed on `feat/v2` @ `96de037`)

Use this to orient; verify against local code.

| Area | File | Current behaviour | Relevant to |
| --- | --- | --- | --- |
| Schema | `prisma/schema.prisma` | MongoDB, Prisma pinned to 6.19.x (never v7). `Merchant` has `paystackSubaccountCode String?`, no subscription fields. `Order` has `status`, `paymentStatus`, `paymentRef`, `reservedUntil`, and **`platformFee Float?`** (DEV-6); index `[status, paymentStatus, reservedUntil]` for the expiry cron. `ProductVariant.costPrice`, `Product.allowCustomization` + `customization*` config, and `OrderLineItem.costPrice` + `customization`/`customizationLabel`/`customizationFee` snapshots all exist (Phase 15). Embedded types (`MerchantStorefront`, `ProductVariant`, `OrderLineItem`) need `$runCommandRaw` for partial writes (`src/lib/db/embedded.ts`); top-level `Merchant`/`Order` fields can use the typed client. | T2 |
| Build & migrations | `package.json` | `vercel-build` = `prisma generate && npm run db:push && npm run db:backfill && next build`. `build` is database-free on purpose. `db:backfill` runs `scripts/backfill-customization.mjs` (idempotent, exits non-zero on failure). The owner can't run scripts against the DB by hand. Phase 15 notes warn: Preview and Production must use different `DATABASE_URL`s, or every branch build migrates production. | T3 |
| Old subscription code | — | Phase 13 built `trialExpiresAt`, a `subscriptionStatus` enum, `/billing`, `/api/cron/expire-trials`, a proxy redirect; **all removed in Phase 13b**. Don't resurrect those names or files; build fresh per §5. The webhook still has an empty "Subscriptions (Phase 13)" comment header. Leftovers that stay: `setStorefrontActive` in `src/lib/merchant/storefront.ts`, the proxy's `isActive: false` → `/store-unavailable` path, and comments calling that "subscription lapsed". D-18f doesn't use them (no automatic takedown); don't wire them to billing. | T6, §6 |
| Storefront checkout | `src/app/store/[subdomain]/cart/actions.ts` | Requires `paystackSubaccountCode` ("This store cannot accept payments yet"). Re-derives every line from the live catalogue and runs `validateCustomization` per line (DEV-7); line `subtotal = (price + customizationFee) × qty`; snapshots `costPrice` and `customization*`. Computes `platformFee = storefrontFeePesewas(subtotal) / 100` **unconditionally** and stores it on the order. `reserveStock` at order time, `RESERVATION_MINUTES = 30`, reference `PCART-<orderId>`, `initializeTransaction`; on Paystack failure calls `expireOrder`. Collects name, email, phone, address, city. | T8 |
| Fee | `src/lib/paystack.ts` | `STOREFRONT_FEE_RATE = 0.03`, `STOREFRONT_FEE_CAP_PESEWAS = 100*100`. **`storefrontFeePesewas(amount)` already exists** (min of 3% and cap) and is the single source for both `transaction_charge` and the `platformFee` snapshot. `bearer: "account"`. Subaccounts created with `percentage_charge: 0` (D-6: never stack). | T4 |
| Profit | `src/lib/dashboard/queries.ts` → `getProfitSummary` | Subtracts `platformFee` from the merchant's profit. For storefront orders with no `platformFee` (placed before DEV-6), falls back to `min(total × 3%, STOREFRONT_FEE_CAP_PESEWAS / 100)` — it imports the cap constant. | T4 |
| Stock | `src/lib/orders/stock.ts` | `reserveStock` is oversell-safe and **already sums quantities by variant** before checking (DEV-7 §B.3), then decrements per line with rollback. | T8, T9 |
| Webhook | `src/app/api/webhooks/paystack/route.ts` | HMAC-SHA512 on raw body. `charge.success` → `confirmPaidOrder(reference, amount)`: finds order by `paymentRef`, compares amount with `Number()` (amount can arrive as a string — real bug found earlier), settles from PENDING or EXPIRED (re-reserves stock), flags anything else for review. Passes `lines` (with customization) to `notifyNewOrder`. Unknown references are logged and acknowledged. | T6, T10 |
| Expiry | `src/lib/orders/expire.ts`, `src/app/api/cron/expire-orders/route.ts` | 5-minute cron (cron-job.org, `CRON_SECRET`). Expires `PENDING` + `UNPAID` + `reservedUntil < now`; claim-then-restore pattern. Orders with `reservedUntil: null` are never expired. | T8, T10 |
| Dashboard orders | `src/app/(app)/dashboard/orders/actions.ts` | `markOrderPaid` **already exists** (PENDING → CONFIRMED, PAID, clears `reservedUntil`; ignores CANCELLED/EXPIRED; returns `void`). `cancelOrder` restores stock when `holdsReservedStock(status)`. `createManualOrder` validates customization, snapshots cost, sets `platformFee: 0`, reserves stock, and with "mark paid" off sets a **30-minute** `reservedUntil`, so unpaid manual orders auto-expire. | T9, T12 |
| Dashboard order detail | `src/app/(app)/dashboard/orders/[orderId]/page.tsx` | Shows per-line cost/margin and order profit (DEV-6) and customization text (DEV-7). | T10, T12 |
| Onboarding | `src/app/(app)/onboarding/actions.ts` | Requires `bankCode` + `accountNumber` and calls `createSubaccount` before the shop goes live. | T5 |
| Settings | `src/app/(app)/dashboard/settings/` | Has a payout details card (`getSubaccount`, `updateSubaccount`). | T7 |
| Storefront order page | `src/app/store/[subdomain]/orders/[orderId]/page.tsx` | `isWaiting = status === "PENDING" && paymentStatus === "UNPAID"` → shows waiting-for-payment. Lines show customization text. | T12 |
| Cart | `src/lib/storefront/cart.ts`, `src/components/store/cart-view.tsx` | Zustand cart keyed by `lineKey` (variant + customization), persist `version: 1` with migration. UI: "Proceed to checkout"; "You will pay securely on Paystack…". | T8 |
| Notifications | `src/lib/notifications/events.ts` (Resend) | `notifyNewOrder({ …, lines })` fires only from the webhook on payment, subject "New order … — total", heading "You've got a new paid order". **`escapeHtml()` already exists** and is applied to `customerName` and customization text. | T11 |
| Landing copy | `src/app/page.tsx` (~88, ~216, ~226–301), `src/app/layout.tsx` (~36) | "No subscription — you only pay when you sell", "No subscription. Ever.", 3% worked example, "capped at GHS 100". | T1 |
| Dormancy | `src/lib/admin/dormancy.ts` | Weekly owner digest: storefront ≥30 days old with no paid order in 30 days. Flags only. | §7 |
| Storefront data | `MerchantStorefront.whatsappNumber` | Already exists (footer socials). | T12 |

---

## 4. Prices, trial, add-on

| Interval | Standard | Founding (50% off, 12 months) | Months added |
| --- | --- | --- | --- |
| Monthly | GHS 89 (8900) | GHS 44.50 (4450) | 1 |
| Quarterly | GHS 267 (26700) | GHS 133.50 (13350) | 3 |
| Yearly | GHS 890 (89000) | GHS 445 (44500) | 12 |

Pesewas in brackets. Constants in one place: `src/lib/billing/plans.ts` holds `INTERVALS`, `TRIAL_DAYS = 14`, `STOREFRONT_PAYMENT_HOLD_HOURS = 24`. The 3% stays in `src/lib/paystack.ts`. **Never trust an amount, interval or setting sent from the client.**

- **Trial:** 14 days, full access, one per merchant. Paying during the trial starts the paid period when the trial ends.
- **Founding:** the 50% logic is in code; the terms (monthly feedback call, testimonial, one referral) live in a private message to each merchant.
- **Checkout add-on:** no extra subscription charge; works during trial, paid and lapsed periods.

---

## 5. Build tasks — ship in this order

### T0. Backup before every migration
Production runs on an Atlas Free (M0) cluster, and Atlas-managed backups aren't available on the owner's account without upgrading the cluster. So backups are ours to run, with one script used in two places: before every production deploy, and on a daily schedule.
- **Code: `scripts/backup-db.mjs`**, run in `vercel-build` **before** `db:push`, so every deploy that might migrate takes a fresh copy first:
  - [ ] Add the `mongodb` driver (Prisma can't export collections). Connect with `DATABASE_URL`.
  - [ ] Skip unless `VERCEL_ENV === "production"` (or `BACKUP_ON_BUILD=1`), so Preview builds don't pile up copies.
  - [ ] For every collection in the database: stream documents with a cursor and write them as **canonical EJSON** (`EJSON.stringify(doc, { relaxed: false })`), one per line, so `ObjectId`s, dates and numbers survive a restore exactly. Also save each collection's indexes (`listIndexes`).
  - [ ] Gzip and upload to a **private** R2 bucket (e.g. `primecart-backups`) at `production/<ISO timestamp>-<VERCEL_GIT_COMMIT_SHA short>.ejson.gz`, using the existing `@aws-sdk/client-s3`. Use a separate R2 API token scoped to that bucket only, not the image-upload key.
  - [ ] Log the file name, collection names and document counts. **Exit non-zero on any failure**, so a deploy never migrates without a backup.
  - [ ] Owner sets an R2 lifecycle rule deleting backups after 60 days (they contain customers' personal data; the privacy policy should mention backup retention).
  - [ ] M0 limits to respect: 0.5 GB storage, 10 GB out per rolling 7 days, 100 ops/second. A cursor export of PrimeCart's current data is far inside these; log total bytes so growth is visible.
- **Code: `scripts/restore-db.mjs <backup file> <target DATABASE_URL>`:** downloads a backup, recreates indexes, inserts documents in batches. Refuses to write into a database that isn't empty unless `--force` is passed. Intended target is a **new, empty** cluster or database, then switch `DATABASE_URL`; restoring over live production is a last resort.
  - [ ] Restoring needs a machine that can reach the target cluster. Since the owner has no database access today, the owner needs at least one way in (an Atlas database user plus their IP on the allowlist, or a temporary new cluster) — a backup nobody can restore isn't a backup.
  - [ ] **Test it once now:** restore the latest dev backup into a throwaway database and spot-check counts and a few documents.
- `vercel-build` becomes: `prisma generate && npm run db:backup && npm run db:push && npm run db:backfill && npm run db:backfill-d18 && next build`
- **Code: `.github/workflows/db-backup.yml` — daily scheduled backup (free, no paid cron):**
  - [ ] `on: schedule` (e.g. `cron: "30 2 * * *"`, 02:30 GMT) plus `workflow_dispatch` so the owner can run it by hand from the GitHub UI.
  - [ ] Ubuntu runner, Node 24, `npm ci`, then `node scripts/backup-db.mjs` with `BACKUP_ON_BUILD=1` and a `BACKUP_SOURCE=scheduled` label in the file name (`production/scheduled/<timestamp>.ejson.gz`, beside the per-deploy ones).
  - [ ] Secrets from GitHub Actions secrets only: `DATABASE_URL` (a **read-only** Atlas database user created just for backups, not the app's user), and the backup-bucket R2 credentials.
  - [ ] **The repository is public**, so: never print documents or connection strings in the log (counts and file names only), never use `actions/upload-artifact` for the dump (artifacts on public repos are downloadable), and upload only to the private R2 bucket. Secrets are masked in logs, but don't echo them anyway.
  - [ ] The job fails loudly if the backup fails; GitHub emails the repo owner on scheduled-workflow failures by default.
  - [ ] Atlas network access must allow GitHub's runners. If the Atlas IP allowlist is `0.0.0.0/0` (typical with Vercel's changing IPs), nothing to do; otherwise this job can't connect — check before relying on it.
  - [ ] GitHub disables scheduled workflows in public repos after 60 days without repository activity; any push resets that. Note it for quiet periods.
- **Restore drill:** run `restore-db.mjs` against a throwaway database once now, then monthly. Record the date in `docs/TASKS.md`.

### T1. Public copy (before anyone is asked to pay)
- [ ] `src/app/page.tsx`: replace the hero badge ("No subscription — you only pay when you sell"), "No subscription. Ever.", and the pricing section with its worked example. New message: "GHS 89/month, everything included. 14-day free trial. Online checkout optional: 3% per order, payment fees included."
- [ ] `src/app/layout.tsx` metadata description: drop "No subscription — 3% per sale, capped at GHS 100."
- [ ] Sign-up page title and header CTA: "Start your free trial."
- [ ] Footer: links to `/privacy` and `/terms` (T14).

### T2. Schema (`prisma/schema.prisma`) — all new fields optional, no backfill needed to load
- [ ] `Merchant`:
  ```prisma
  subscriptionStatus        String?   // "TRIAL" | "ACTIVE"; LAPSED is computed from dates, never stored
  plan                      String?   // "STANDARD" | "FOUNDING"
  billingInterval           String?   // "MONTHLY" | "QUARTERLY" | "YEARLY" (last chosen; preselects the renew option)
  priceOverridePercent      Int?      // founding: 50; null = no discount
  priceOverrideEndsAt       DateTime? // founding deal end (12 months)
  trialEndsAt               DateTime? // set once; non-null = trial already used
  currentPeriodEnd          DateTime?
  storefrontPaymentsEnabled Boolean?  // null/false = checkout off
  ```
- [ ] `Order`:
  ```prisma
  stockReserved   Boolean?  // null = legacy order (decide by status, as today); true/false explicit from now on
  paymentMethod   String?   // "PAYSTACK" | "MOMO" | "CASH" | "BANK" | "OTHER"
  reminderSentAt  DateTime? // 30-minute payment reminder (T10)
  ```
- [ ] New model `SubscriptionPayment`: `id`, `merchantId` (ObjectId, indexed), `reference` (unique), `interval`, `amount` (GHS, Float), `periodStart`, `periodEnd`, `status`, `channel`, `createdAt`. Receipt history and idempotency guard in one.
- [ ] `npm run db:push`; restart dev server.

### T3. Migration script — `scripts/backfill-d18.mjs`, run on every deploy via `vercel-build`
The owner can't run scripts against the database, so this follows the Phase 15 pattern exactly (same style as `scripts/backfill-customization.mjs`): add `"db:backfill-d18": "node scripts/backfill-d18.mjs"` and put it in `vercel-build` after `db:backfill` (full script in T0, which adds the backup step first).

Because it runs on **every** deploy, every step must match only documents not yet migrated. A step that sets a value unconditionally would reset merchants on each deploy (e.g. switch checkout back off for someone who turned it on).
- [ ] Merchants where `subscriptionStatus` **doesn't exist**: set `TRIAL`, `plan = "STANDARD"`, `trialEndsAt = now + 14 days`.
- [ ] Merchants where `storefrontPaymentsEnabled` **doesn't exist**: set `false` (D-18a). Keep existing `paystackSubaccountCode` values, so switching checkout back on needs no payout setup.
- [ ] Founding merchants: IDs from an env var `FOUNDING_MERCHANT_IDS` (comma-separated; set in Vercel Production only). Match only those IDs whose `plan` is not already `"FOUNDING"`, and set `plan = "FOUNDING"`, `priceOverridePercent = 50`, `priceOverrideEndsAt = now + 12 months`. Never touch `priceOverrideEndsAt` once set, or each deploy would extend the deal.
- [ ] Leave open Paystack orders alone (`PENDING`, `UNPAID`, `paymentRef` set); they settle or expire as today.
- [ ] Exit non-zero if any merchant is still missing `subscriptionStatus` or `storefrontPaymentsEnabled` afterwards, so a partial run fails the build (same guard as the customisation backfill).
- [ ] Log a summary of what changed.
- [ ] Before the first deploy, confirm Preview and Production use different `DATABASE_URL`s in Vercel (Phase 15 note), and that `FOUNDING_MERCHANT_IDS` is set only on Production.

### T4. Remove the fee cap (`src/lib/paystack.ts`, `src/lib/dashboard/queries.ts`)
- [ ] `storefrontFeePesewas(amount)` (already the single source for `transaction_charge` and the `platformFee` snapshot) becomes `Math.round(amount * STOREFRONT_FEE_RATE)`, no cap. Nothing else needs to change for new orders.
- [ ] **Don't just delete the cap constant:** `getProfitSummary` imports it for its fallback on storefront orders placed before `platformFee` existed, and those orders really were charged under the cap. Rename it to `LEGACY_D16_FEE_CAP_PESEWAS`, keep it only for that fallback, and say so in a comment.
- [ ] Keep `bearer: "account"` and `percentage_charge: 0`.
- [ ] Update comments referencing D-16 to D-18b; grep for any other use of the cap.

### T5. Onboarding without payout (`src/app/(app)/onboarding/`)
- [ ] Remove the bank/MoMo fields and the `createSubaccount` call from the action and the form.
- [ ] Onboarding sets `subscriptionStatus = "TRIAL"`, `plan = "STANDARD"`, `trialEndsAt = now + 14 days`, `storefrontPaymentsEnabled = false`.
- [ ] Keep checkout's "This store cannot accept payments yet" guard as a safety net.

### T6. Billing
- [ ] `src/lib/billing/plans.ts`:
  - `INTERVALS = { MONTHLY: { pesewas: 8900, months: 1 }, QUARTERLY: { pesewas: 26700, months: 3 }, YEARLY: { pesewas: 89000, months: 12 } }`; reject anything else.
  - `nextPeriodStart(merchant, now) = max(now, currentPeriodEnd ?? now, trialEndsAt ?? now)` — one function used by both pricing and the webhook so they can't disagree.
  - `pricePesewas(merchant, interval, periodStart)`: applies `priceOverridePercent` only when `periodStart < priceOverrideEndsAt`; whole pesewas. (Pricing by period start stops a founding merchant prepaying years at 50% in month 11.)
- [ ] `src/lib/billing/status.ts`: `effectiveStatus(merchant, now)` → `ACTIVE` while `currentPeriodEnd > now`, else `TRIAL` while `trialEndsAt > now`, else `LAPSED`; also `daysLeft`. Legacy merchants with no fields are covered by T3; until T3 runs, treat null as `ACTIVE`.
- [ ] Server action `startSubscriptionPayment(interval)`: auth via the existing merchant helper, validate interval, compute `periodStart` and price server-side, call Paystack `transaction/initialize` with:
  - `amount`, `email` (merchant), `currency: "GHS"`, `channels: ["mobile_money", "card"]`
  - `reference: PCSUB-<merchantId>-<timestamp>` (Paystack allows only `-`, `.`, `=`, alphanumerics)
  - `metadata: { type: "subscription", merchantId, interval, quotedPesewas }`
  - `callback_url: /dashboard/billing?ref=<reference>`
  - **No `subaccount`, no `transaction_charge`** — this money goes to PrimeCart's main account.
  - Save `billingInterval`; redirect to `authorization_url`. Must work while lapsed.
  - This needs a new function in `paystack.ts` (the existing `initializeTransaction` always sends a subaccount and fee).
- [ ] Webhook: on `charge.success`, branch on `data.metadata.type === "subscription"` **before** `confirmPaidOrder`:
  - Verify with `GET /transaction/verify/:reference`; status success, currency GHS, amount (compare with `Number()`) equals `metadata.quotedPesewas`, and the quote matches `pricePesewas` for the period start at initialization time. Mismatch → log, don't extend.
  - Idempotent: existing `SubscriptionPayment` with that `reference` → return 200, do nothing.
  - `periodStart = nextPeriodStart(merchant, now)`; `periodEnd = periodStart + months`, using calendar months clamped to month end (Jan 31 + 1 month = last day of Feb).
  - Write `SubscriptionPayment`, then set `subscriptionStatus = "ACTIVE"`, `currentPeriodEnd = periodEnd`.
- [ ] `/dashboard/billing` page:
  - Status line: "Free trial — 9 days left" / "Paid until 16 Feb 2027" / "Expired".
  - Monthly / Quarterly / Yearly options with prices; founding price beside a struck-through list price while it applies; "2 months free" on yearly; "Founding price until <date>" for founding merchants; last interval preselected; one Pay button.
  - Copy: "Your paid time starts when your current trial or plan ends."
  - On return with `?ref=`, call `transaction/verify` and, if it succeeded, **apply the payment through the same idempotent function the webhook uses** (keyed on `reference`, so whichever arrives first wins and the other is a no-op). Paystack only retries a webhook when the endpoint doesn't return 200; if the handler returns 200 but fails to apply the payment (a bug, an amount mismatch it logs and acknowledges), Paystack never retries, so the return path is the second chance.
  - Add a "Check payment" button beside any payment still showing pending, which runs the same verify-and-apply, for merchants who closed the tab before returning.
  - Payment history table.
- [ ] Trial banner on every dashboard page: "N days left in your free trial — choose a plan"; more prominent at ≤ 3 days. Link in the side rail to Billing.

### T7. Checkout add-on toggle (`/dashboard/settings`)
- [ ] Card titled "Take payments on your storefront". Copy: "Shoppers pay online by MoMo or card and you're paid the next working day. PrimeCart keeps 3% of each order, and that includes all payment fees. Stock is held for 24 hours while a shopper pays."
- [ ] Switching **on**: if no `paystackSubaccountCode`, show the payout form in the same flow (reuse `listGhanaianBanks`, `createSubaccount` with `percentage_charge: 0`, and the existing payout card); enable only after the subaccount is created. Show the payout card only when a subaccount exists or checkout is being enabled.
- [ ] Switching **off**: immediate.
- [ ] Switching never changes existing orders.

### T8. Storefront checkout — both paths (`cart/actions.ts`, `cart-view.tsx`)
- [ ] Phone field becomes **"WhatsApp number"**, required, normalised server-side to `+233XXXXXXXXX` (accept `0XXXXXXXXX`, `233XXXXXXXXX`, `+233XXXXXXXXX`; reject anything else with a clear message). Email stays required (receipts, T10 reminder).
- [ ] Consent line under the button: "By placing this order, you agree that [Store] may contact you on WhatsApp about it." Link to `/privacy`.
- [ ] Read `storefrontPaymentsEnabled` **on the server**, fresh (same query that reads `paystackSubaccountCode` today). Drop the "cannot accept payments" error for checkout-off merchants.
- [ ] **Checkout off:**
  - Validate lines exactly as today, including `validateCustomization` and the customization/cost snapshots (Phase 15).
  - Read-only stock check: each variant's total quantity across lines (lines can share a variant via different customizations) ≤ current stock. Otherwise return the same "Sorry, only N of … available" message `reserveStock` uses. Extract that comparison from `reserveStock` into a shared helper rather than duplicating it.
  - Create the order `PENDING`, `UNPAID`, `source: STOREFRONT`, `reservedUntil: null`, `stockReserved: false`, **`platformFee: 0`** (today `platformFee` is computed unconditionally; it must only be the 3% when the order goes through Paystack, or the merchant's profit is understated). No `reserveStock`, no Paystack call.
  - Send the merchant's new-order alert immediately (T11).
  - Return the storefront order page URL.
  - Button label: "Place order". Line above it: "You won't pay now. [Store] will contact you on WhatsApp to confirm your order and arrange payment."
- [ ] **Checkout on:** today's flow (including `platformFee = storefrontFeePesewas(...)`, now uncapped), with `reservedUntil = now + 24h` (`STOREFRONT_PAYMENT_HOLD_HOURS`), `stockReserved: true`, `paymentMethod: "PAYSTACK"`. Button label: "Pay now".
- [ ] The cart page needs to know which path applies for labels: pass `storefrontPaymentsEnabled` from the server component; the server action still re-checks.

### T9. Stock for checkout-off orders (`dashboard/orders/actions.ts`, `src/lib/orders/transitions.ts`)
- [ ] **Confirm** (`advanceOrderStatus`, PENDING → CONFIRMED) and **mark paid** (`markOrderPaid` on a PENDING order): if `stockReserved === false`, call `reserveStock` with the order's line items first (it's oversell-safe and already sums quantities by variant). On `OversellError`, block with "Only N left of [item] — update your stock or cancel this order." On success, set `stockReserved: true` in the same update that changes status; if that update loses a race (count 0), `restoreStock` what was just reserved.
- [ ] Return the error to the UI (these actions currently return `void`); show it on the order page.
- [ ] **Cancel:** restore stock only when `stockReserved === true`, or when `stockReserved === null` and `holdsReservedStock(status)` (legacy orders behave exactly as before).
- [ ] **Manual orders** (`createManualOrder`): deduct stock at creation (as today) and never expire: `stockReserved: true`, `reservedUntil: null`, paid or not.
- [ ] Expiry cron needs no change: checkout-off orders have `reservedUntil: null`, so they're never expired.

### T10. Checkout-on payment reminder (30 minutes) and re-pay
- [ ] In the 5-minute cron, after `expireAbandonedOrders`: find `PENDING`, `UNPAID`, `stockReserved: true`, `paymentMethod: "PAYSTACK"` orders created > 30 minutes ago with `reminderSentAt: null` and `reservedUntil > now`. Claim each with `updateMany({ where: { id, reminderSentAt: null }, data: { reminderSentAt: now } })`; only the winner sends.
- [ ] Email the buyer (Resend): "Your order from [Store] is saved until [time]. Pay now to secure it." Link to the **storefront order page**, not a Paystack URL.
- [ ] Storefront order page "Pay now" button, shown while `PENDING`, `UNPAID`, `stockReserved: true`, `reservedUntil > now`: server action initializes a fresh Paystack transaction with reference `PCART-<orderId>-<n>` (n = attempt count or timestamp), same subaccount and 3% charge, and saves it as `paymentRef`.
- [ ] **Webhook must still settle a payment made on an older link:** in `confirmPaidOrder`, if no order matches `paymentRef`, fall back to `metadata.orderId` when the reference starts with `PCART-<orderId>`. Keep the amount check.
- [ ] Merchant order detail page: "Send payment link on WhatsApp" → `https://wa.me/<buyer number without +>?text=<encoded message with the order page link>`.

### T11. Notifications (`src/lib/notifications/events.ts`)
- [ ] `notifyNewOrder` (already takes `lines` with customization) gains `paid: boolean` and `buyerWhatsapp`. Checkout-off orders: sent at creation, subject "New order … — unpaid", heading "You've got a new order — arrange payment", body includes the buyer's number and a `wa.me` link, plus the customization list as today. Paid orders: unchanged trigger (webhook) and wording.
- [ ] `escapeHtml()` already exists; apply it to every new interpolated value too (buyer number, notes, store name).
- [ ] New `notifyPaymentReminder` for T10 (to the buyer), using the same layout and escaping.

### T12. Order pages and mark-as-paid
- [ ] Storefront order page: split today's single "waiting" state:
  - **Checkout off** (`stockReserved === false`, unpaid): "Order received. [Store] will contact you on WhatsApp at [buyer number] to confirm your order and arrange payment." Plus "Message [Store] on WhatsApp" when `storefront.whatsappNumber` is set, pre-filled with the order number.
  - **Checkout on, unpaid:** Pay now button (T10) and time left.
  - **Legacy orders** (`stockReserved === null`): today's behaviour.
- [ ] Mark as paid: add a one-tap "How was it paid?" choice — MoMo, Cash, Bank, Other — saved to `paymentMethod`. Optional; skipping it still marks the order paid. (Purpose: lets the merchant look up a disputed payment later, and shows the owner how much money moves outside checkout.)
- [ ] Orders list: "Unpaid" filter and badge.

### T13. Tests before deploy
- [ ] New sign-up: no payout step; `TRIAL`, 14 days; checkout off; storefront shows "Place order".
- [ ] Checkout off: order created unpaid; stock **unchanged**; merchant emailed with WhatsApp link; order page shows the WhatsApp message, never "waiting for payment".
- [ ] Checkout off, order more than stock → rejected at checkout.
- [ ] Confirm or mark paid deducts stock; blocked with a clear message when stock ran out in between.
- [ ] Two checkout-off orders for the last unit: both accepted; second confirmation blocked.
- [ ] Cancel checkout-off order before confirming: stock unchanged; after confirming: stock restored.
- [ ] Unpaid manual order: stock deducted; still open after 30 minutes and after the cron runs.
- [ ] Turn checkout on without a subaccount → payout form → enabled. With a subaccount → enabled immediately. Off → immediate.
- [ ] Checkout on: `transaction_charge` = exactly 3% on a GHS 6,000 order (GHS 180), no cap.
- [ ] Reminder email sent once at ~30 minutes (run the cron twice); order expires at 24 hours and stock returns.
- [ ] Pay on the original Paystack link after a new one was generated → order still settles.
- [ ] Forged client request claiming checkout is on → server ignores it.
- [ ] Billing: monthly/quarterly/yearly add 1/3/12 months; payments stack; pay during trial starts at `trialEndsAt`; pay while lapsed starts today; founding 50% on all intervals; standard price once the period starts after `priceOverrideEndsAt`; webhook replay → one record; tampered amount or unknown interval rejected.
- [ ] Storefront `charge.success` for orders still works exactly as before (subscription branch doesn't swallow it).
- [ ] Legacy orders (no `stockReserved`) still cancel, expire and settle as before.
- [ ] `platformFee`: checkout-off storefront order = 0; checkout-on = uncapped 3%; manual = 0. Profit KPI for old pre-DEV-6 storefront orders unchanged (legacy cap fallback).
- [ ] Phase 15 regressions on both checkout paths: same variant with two different engravings → two order lines; customization fee included in subtotal; required customization enforced; customization text shown on both order pages and in the new-order email; `costPrice` never in the storefront payload.
- [ ] `db:backfill-d18` run twice in a row: second run changes nothing; a merchant who switched checkout on stays on; a founding merchant's end date doesn't move.
- [ ] `tsc --noEmit`, `eslint`, `next build` clean.

### T14. Legal pages (drafts; owner gets them reviewed before go-live)
- [ ] `/privacy` (public): what PrimeCart collects from merchants and from their customers, why, processors (Clerk, Paystack, MongoDB Atlas, Cloudflare R2, Resend, Vercel), merchants contacting buyers on WhatsApp, retention, how to request deletion. **No pricing or founding terms.**
- [ ] `/terms` (public): subscription intervals; prepaid, no automatic renewal; no refunds for partly used periods; trial terms; what happens on lapse (D-18f); 3% checkout fee including payment fees; merchants responsible for their goods, delivery and refunds to buyers; acceptable use. **No founding terms.**
- [ ] Sign-up: "By creating a shop you agree to the Terms and Privacy Policy."

### Deploy order
1. Open a PR from `feat/subscriptions-d18` into `feat/v2` (or whichever branch the owner deploys from) and review.
2. Confirm Vercel env vars: separate `DATABASE_URL` for Preview and Production; `FOUNDING_MERCHANT_IDS` on Production only.
3. Owner tells both merchants checkout is now off and how the new flow works.
4. Merge and deploy. `vercel-build` backs up the database, pushes the schema and runs both backfills before the new code goes live; a failed backup or backfill fails the build.
5. Check the build log for the backup file name and the D-18 backfill summary.
6. One live monthly subscription payment on a test merchant, then refund it from the Paystack dashboard.

---

## 6. Before the first trials end (by 30 November 2026)

- [ ] **Gate (D-18f):** when `LAPSED`, dashboard is read-only except `/dashboard/billing`, and confirm / mark paid / cancel on existing orders. Enforce in server actions, not only the UI. Storefront and checkout keep working.
- [ ] **Billing emails:** trial ending in 3 days and 1 day; renewal due in 7 days and 1 day; expired. Each links to `/dashboard/billing`. A daily cron (cron-job.org, `checkCronAuth`) with claim-then-send per reminder. Until this ships, the owner sets calendar reminders for the two merchants.

---

## 7. After launch (not now)

- [ ] **WhatsApp notifications** via the WhatsApp Cloud API directly (not a BSP): merchant new-order alerts first, buyer payment reminders second. Needs Meta business verification, approved utility templates, per-message cost, and a PrimeCart sender number.
- [x] **Delivery fees** on checkout (D-18g): areas and prices per shop, pickup, agreed on WhatsApp (2026-11-23).
- [ ] MoMo transaction ID on mark-as-paid.
- [ ] Public pricing page.
- [ ] Dormancy digest (D-17) counts paid orders only; checkout-off merchants who don't mark orders paid will be flagged. Revisit.
- [ ] `docs/PROFIT_AND_CUSTOMIZATION.md`: add a note that new orders are uncapped from D-18 onward and the cap survives only in the legacy profit fallback (T4).
- [ ] Remove `npm run db:backfill` (customisation, one-off) from `vercel-build` once production has run it; same for `db:backfill-d18` after its first successful production deploy.
- [ ] Quarterly turnover report (CSV) for the 3% Modified Taxation Scheme.
- [ ] Marketing campaign: rewrite planned content around the new pricing before it starts.

---

## 8. Owner actions (not code)

- [ ] Tell both merchants checkout is off and how ordering now works — before the production deploy (the D-18 backfill runs during that build).
- [ ] Set `FOUNDING_MERCHANT_IDS` in Vercel (Production only) and confirm Preview and Production use different databases.
- [ ] Create the private `primecart-backups` R2 bucket, a token scoped to it, and a 60-day lifecycle rule; add the token to Vercel Production and to GitHub Actions secrets.
- [ ] Create a read-only Atlas database user for backups and add its connection string as the `DATABASE_URL` GitHub Actions secret; check Atlas network access allows GitHub's runners.
- [ ] Get one way to reach the database for restores (Atlas database user + your IP on the allowlist), and run T0's restore test once.
- [ ] Send each founding merchant their private terms: 50% off any interval for 12 months from the start date, in exchange for a monthly 20-minute feedback call, a testimonial and one referral; moves to the then-current list price afterwards with 30 days' notice.
- [ ] DPC registration under Act 843, if still open.
- [ ] Have `/privacy` and `/terms` reviewed by someone qualified.
- [ ] Merchant conversations this week: present the list price and the founding discount; don't ask "what would you pay?". Record first reaction, objections, and whether they paid on the spot.
