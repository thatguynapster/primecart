# PrimeCart Rebuild — Task List

Tracking file for the rebuild described in [`PrimeCart_Handoff.md`](./PrimeCart_Handoff.md).

**Rules for this file**

- Scope comes from the handover document only. Nothing is added here that is not in that document.
- Anything requiring a decision goes in [Open Decisions](#open-decisions) — it is not resolved unilaterally.
- Deviations from the handover text require owner approval, are logged in [Owner-Approved Amendments](#owner-approved-amendments), and are written back into the handover document itself.
- Mark a task `[x]` only when it is implemented **and** verified. Record the date in the Done column.
- Build sequence is fixed (handover §Build Sequence Recommendation, 13 steps). Do not skip ahead.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked (see Open Decisions)

**Standing rules that apply to every phase**

- Every DB query filters on `merchantId` **first**. `merchantId` is always derived from the Clerk session server-side — never from client input.
- Server Actions for all dashboard/form mutations. API Routes only where public access is required (Paystack webhook, storefront product API, cron endpoints).
- Any write touching an embedded type (`ProductVariant`, `OrderLineItem`, `ShippingAddress`, `MerchantStorefront`) uses `prisma.$runCommandRaw`. Reads of embedded arrays through Prisma Client are permitted — verified by task 9.17.
- Mobile-first for **all** UI, dashboard included.
- Follow official documentation for every third-party integration (Next.js, Clerk, Prisma, Paystack, Cloudflare R2, Shadcn/ui).
- Domain is `primecart.app`. Storefronts are `merchant.primecart.app`.
- The Next.js app lives in `web/`. `docs/` and `bak/` stay at the repo root. All paths in this file that refer to application code are relative to `web/`.

---

## Owner-Approved Amendments

Three changes to the original handover, approved by the project owner on 2026-08-13. **`PrimeCart_Handoff.md` has been updated to match** — see its Decision Log. These ids are referenced by the tasks below.

| ID    | Originally                                                  | Now                                                              | Why                                                                                      |
| ----- | ------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| DEV-1 | `Merchant` has `email @unique` + `password`                 | `Merchant` has `clerkUserId @unique`; `password` removed         | Auth is Clerk — PrimeCart never handles passwords, and a Clerk session needs a link field |
| DEV-2 | `OrderStatus` has no `EXPIRED`; expiry job sets `CANCELLED` | `EXPIRED` added to `OrderStatus`; expiry job sets `EXPIRED`      | Separates abandoned checkouts from genuine merchant cancellations in reporting            |
| DEV-3 | Middleware sets `x-business-id` / `x-business-slug`         | Middleware sets `x-merchant-id` / `x-merchant-slug`              | Consistent with `merchantId` used everywhere in the schema and service layer               |

---

## Phase 1 — Project Setup

**Scaffolding rule:** use the official `create-next-app` flow and let it install everything it offers (TypeScript, Tailwind, ESLint, App Router) rather than adding dependencies by hand afterwards. The repo root is not empty — it holds `.git`, `.gitignore`, `bak/`, and `docs/` — so `create-next-app` will refuse to scaffold there. Scaffold into a subfolder instead; `bak/` and `docs/` stay at the repo root.

| #    | Task                                                                                                  | Status | Done |
| ---- | ----------------------------------------------------------------------------------------------------- | ------ | ---- |
| 1.1  | Scaffold via `npx create-next-app@latest` into `web/` — App Router, TypeScript, Tailwind, ESLint, src dir, import alias. Verify it resolves to Next.js 16.x (14 is EOL — do not use) | [ ]    |      |
| 1.2  | Verify the generated Tailwind setup; add mobile-first conventions on top of it                        | [ ]    |      |
| 1.3  | Shadcn/ui init (`npx shadcn@latest init`) inside `web/`                                               | [ ]    |      |
| 1.4  | Install Prisma pinned: `npm install prisma@6.19 @prisma/client@6.19` (v7 has no MongoDB support)      | [ ]    |      |
| 1.5  | Add `.vscode/settings.json` — `prisma.prismaFmtBinPath` + prisma formatter binding                    | [ ]    |      |
| 1.6  | Add `.vscode/extensions.json` recommending `Prisma.prisma`                                            | [ ]    |      |
| 1.7  | Provision the new MongoDB Atlas database, wire `DATABASE_URL`, Prisma client singleton                | [ ]    |      |
| 1.8  | Clerk.js install + provider wiring (merchant auth only)                                               | [ ]    |      |
| 1.9  | Zustand install (client state only)                                                                   | [ ]    |      |
| 1.10 | `.env.example` — `DATABASE_URL`, Clerk keys, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `CRON_SECRET`, R2 vars | [ ]    |      |

## Phase 2 — Schema & Indexes

Database is brand new and empty — no migration or backfill concerns (D-12 resolved).

| #    | Task                                                                                                                            | Status | Done |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ------ | ---- |
| 2.1  | Write `schema.prisma` per handover §Database Schema                                                                             | [ ]    |      |
| 2.2  | **DEV-1:** `Merchant` gets `clerkUserId String @unique` + `@@index([clerkUserId])`; remove the `password` field                  | [ ]    |      |
| 2.3  | Add `reservedUntil DateTime?` to `Order` (§Stock Deduction Logic)                                                                | [ ]    |      |
| 2.4  | Add `paystackSubaccountCode String?` to `Merchant` (§Paystack Integration Spec)                                                  | [ ]    |      |
| 2.5  | Add subscription fields to `Merchant`: `trialExpiresAt DateTime` (required), `subscriptionStatus SubscriptionStatus @default(TRIAL)`, `paystackSubscriptionCode String?` | [ ]    |      |
| 2.6  | Add `SubscriptionStatus` enum: `TRIAL \| ACTIVE \| EXPIRED \| CANCELLED`                                                          | [ ]    |      |
| 2.7  | **DEV-2:** Add `EXPIRED` to the `OrderStatus` enum                                                                               | [ ]    |      |
| 2.8  | `prisma db push` + generate client                                                                                              | [ ]    |      |
| 2.9  | Manual index: `db.Merchant.createIndex({ "storefront.subdomain": 1 }, { unique: true })`                                         | [ ]    |      |
| 2.10 | Manual index: `db.Merchant.createIndex({ "storefront.customDomain": 1 }, { sparse: true })`                                      | [ ]    |      |
| 2.11 | Script both manual indexes so they are reproducible per environment                                                             | [ ]    |      |
| 2.12 | Build the `$runCommandRaw` helper layer for embedded-type writes                                                                | [ ]    |      |

## Phase 3 — Middleware Fixes

Port `bak/middleware.ts` (subdomain resolution logic is correct — keep it) and apply the three fixes.

| #   | Task                                                                                                                       | Status | Done |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ---- |
| 3.1 | Fix 1 — in-memory `businessCache` Map, 5-minute TTL, via `getCachedBusiness`                                                | [ ]    |      |
| 3.2 | Fix 2 — **DEV-3:** set `x-merchant-id` and `x-merchant-slug` headers only; never the full merchant object                   | [ ]    |      |
| 3.3 | Fix 3 — wrap lookup in try/catch, fail open with `NextResponse.next()`; 404 "Store not found" when no merchant             | [ ]    |      |
| 3.4 | Rename `business_id` → `merchantId` throughout the ported middleware and its lookup helper                                  | [ ]    |      |
| 3.5 | Verify root domain `primecart.app` (no subdomain) resolves to the landing page, not a store                                 | [ ]    |      |
| 3.6 | Compose Clerk middleware with subdomain middleware without breaking either                                                  | [ ]    |      |
| 3.7 | Dashboard route guard — `subscriptionStatus: EXPIRED` merchants see only the payment/reactivation page                       | [ ]    |      |

## Phase 4 — Vercel Wildcard Subdomain Config

**Project owner handles Vercel configuration** (D-4). My deliverable is the setup instructions plus verification.

| #   | Task                                                                          | Status | Done |
| --- | ------------------------------------------------------------------------------- | ------ | ---- |
| 4.0 | Vercel **Root Directory** must be set to `web/` — the app is not at the repo root | [ ]    |      |
| 4.1 | Write setup instructions for wildcard `*.primecart.app` + root DNS on Vercel   | [ ]    |      |
| 4.2 | *(Owner)* Apply the Vercel wildcard domain and DNS records                     | [ ]    |      |
| 4.3 | Verify a test subdomain resolves and hits middleware                           | [ ]    |      |

## Phase 5 — Landing Page (`primecart.app` root)

UI must be **fully redesigned** — do not reuse the previous visual design.
Design reference: [`docs/landing_sample.webp`](./landing_sample.webp) · source: https://dribbble.com/shots/27117831-Akuma-Landing-Page

| #    | Task                                                                                                                     | Status | Done |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ------ | ---- |
| 5.1  | Read `/bak/app/site` (`page.tsx`, `layout.tsx`) and extract copy, sections, value propositions to carry over             | [ ]    |      |
| 5.2  | Design system: off-white/light-grey background (#F5F5F5 range), subtle grid/tile pattern behind hero                      | [ ]    |      |
| 5.3  | Typography: large heavy sans-serif headlines, bold weight, tight tracking; small restrained body text                     | [ ]    |      |
| 5.4  | Palette: near-monochromatic — light greys, white surfaces, dark text; one near-black CTA, ghost/outline secondary CTA     | [ ]    |      |
| 5.5  | Navigation: horizontal, logo left, links centre, single pill/rounded CTA right                                            | [ ]    |      |
| 5.6  | Hero: centred — trust badge, large headline, short subheadline, two side-by-side CTAs                                     | [ ]    |      |
| 5.7  | Product preview: partial dashboard screenshot below hero CTAs, partially visible below the fold                           | [ ]    |      |
| 5.8  | Cards/surfaces: white, soft shadows, rounded corners, generous padding                                                    | [ ]    |      |
| 5.9  | Subtle 3D accent decorations in corners/background (optional — only if execution is clean)                                | [ ]    |      |
| 5.10 | Section: Problem statement — life without PrimeCart (lost stock, manual tracking, WhatsApp chaos)                         | [ ]    |      |
| 5.11 | Section: Features overview — inventory, orders, storefront, reporting                                                     | [ ]    |      |
| 5.12 | Section: Pricing — GHS 79/month + 3% per transaction (covers all payment processing fees), 30-day free trial, no hidden fees | [ ]    |      |
| 5.13 | Pricing transparency copy, verbatim: "We charge 3% on storefront sales only. That 3% covers all payment processing fees — no hidden charges on top. Manual orders are always free. You keep 97% of every sale." | [ ]    |      |
| 5.14 | Section: bottom CTA — signup prompt (Start free trial)                                                                    | [ ]    |      |
| 5.15 | Copy tone check: practical and direct, aimed at small Ghanaian retailers — operational pain points, not abstract SaaS benefits | [ ]    |      |
| 5.16 | Mobile-first responsive pass across the whole page                                                                        | [ ]    |      |

## Phase 6 — Merchant Onboarding

| #    | Task                                                                                                     | Status | Done |
| ---- | -------------------------------------------------------------------------------------------------------- | ------ | ---- |
| 6.1  | Clerk sign-up / sign-in flows for merchants                                                              | [ ]    |      |
| 6.2  | On first sign-in, create the `Merchant` record keyed to `clerkUserId` (DEV-1)                            | [ ]    |      |
| 6.3  | Server-side helper: resolve Clerk session → `merchantId` — never from client input                       | [ ]    |      |
| 6.4  | Merchant profile creation: business name, subdomain, logo, primary colour, description                   | [ ]    |      |
| 6.5  | Subdomain availability check against the unique index                                                    | [ ]    |      |
| 6.6  | Set `trialExpiresAt = now + 30 days` and `subscriptionStatus = TRIAL` at signup — no payment details collected | [ ]    |      |
| 6.7  | Set `storefront.isActive = true` immediately on onboarding completion (no manual approval step)          | [ ]    |      |
| 6.8  | Ghanaian bank dropdown with Paystack bank codes                                                          | [ ]    |      |
| 6.9  | Paystack Create Subaccount — `business_name`, `settlement_bank`, `account_number`, **`percentage_charge: 0`** (must be 0; the 3% is applied per-transaction via `transaction_charge`, setting both stacks to ~6%) | [ ]    |      |
| 6.10 | Persist returned `subaccount_code` to `Merchant.paystackSubaccountCode`                                  | [ ]    |      |
| 6.11 | Onboarding flow states the 3% transparency copy (see 5.13)                                               | [ ]    |      |

## Phase 7 — Product & Inventory Module

| #    | Task                                                                              | Status | Done |
| ---- | --------------------------------------------------------------------------------- | ------ | ---- |
| 7.1  | Product create (Server Action) with embedded variants                             | [ ]    |      |
| 7.2  | Product edit — variant edits via `$runCommandRaw`                                 | [ ]    |      |
| 7.3  | Product archive (`isActive: false`)                                               | [ ]    |      |
| 7.4  | Variant management: name, sku, price, stock, `lowStockThreshold` (default 5), attributes | [ ]    |      |
| 7.5  | Stock level display + manual adjustment                                           | [ ]    |      |
| 7.6  | Low stock alerts driven by per-variant threshold                                  | [ ]    |      |
| 7.7  | *(Owner)* Complete Cloudflare R2 setup, supply bucket name, Account ID, Access Key ID, Secret Access Key, public bucket URL | [ ]    |      |
| 7.8  | R2 client via `@aws-sdk/client-s3` — endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto` | [ ]    |      |
| 7.9  | Image upload → public R2 URL stored in `Product.images` (public bucket, no signed requests) | [ ]    |      |
| 7.10 | Product list + detail dashboard UI (mobile-first)                                 | [ ]    |      |
| 7.11 | Verify every product query filters on `merchantId` first                          | [ ]    |      |

## Phase 8 — Storefront

| #   | Task                                                                                              | Status | Done |
| --- | --------------------------------------------------------------------------------------------------- | ------ | ---- |
| 8.1 | Subdomain-resolved storefront layout, single default theme, mobile-first                          | [ ]    |      |
| 8.2 | Merchant branding applied: logo, business name, primary colour                                    | [ ]    |      |
| 8.3 | Public product listing page                                                                       | [ ]    |      |
| 8.4 | Public product detail page with variant selection                                                 | [ ]    |      |
| 8.5 | Cart (Zustand, client state)                                                                      | [ ]    |      |
| 8.6 | Public storefront product API route (API Route, not Server Action)                                | [ ]    |      |
| 8.7 | Guest checkout form incl. `ShippingAddress` fields                                                | [ ]    |      |
| 8.8 | `storefront.isActive: false` → "store temporarily unavailable" page, distinct from the 404 shown for an unknown subdomain (D-9) | [ ]    |      |

## Phase 9 — Checkout & Paystack

| #    | Task                                                                                                                     | Status | Done |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ------ | ---- |
| 9.1  | Oversell check: `variant.stock >= quantity` for **every** line item before reserving; reject the whole order otherwise ("Sorry, only X units available.") — never partially fulfil | [ ]    |      |
| 9.2  | Create Order first — `paymentStatus: UNPAID`, `status: PENDING`, `reservedUntil: now + 30min`, snapshot line items       | [ ]    |      |
| 9.3  | `decrementVariantStock` via `$runCommandRaw` — hard decrement as reservation at creation                                 | [ ]    |      |
| 9.4  | `restoreVariantStock` (opposite `$inc`)                                                                                  | [ ]    |      |
| 9.5  | Paystack transaction initialize — `reference = PCART-${order.id}`, `subaccount`, `transaction_charge: Math.round(totalInPesewas * 0.03)` (the only place the 3% is applied), `bearer: "account"`, metadata | [ ]    |      |
| 9.6  | Write `paymentRef` back to the Order immediately after initialization                                                    | [ ]    |      |
| 9.7  | Redirect customer to Paystack checkout URL                                                                               | [ ]    |      |
| 9.8  | Return/callback page shows order status only — no status mutation here                                                   | [ ]    |      |
| 9.9  | `POST /api/webhooks/paystack` with `x-paystack-signature` HMAC verification                                              | [ ]    |      |
| 9.10 | On `charge.success`: find Order by `paymentRef` → `paymentStatus: PAID`, `status: CONFIRMED`, clear `reservedUntil`; no additional stock op | [ ]    |      |
| 9.11 | `expireAbandonedOrders` — restore stock per line item, set `status: EXPIRED` (DEV-2), **and clear `reservedUntil`** (D-11) | [ ]    |      |
| 9.12 | `GET /api/cron/expire-orders` route                                                                                      | [ ]    |      |
| 9.13 | Endpoint auth: reject unless `Authorization: Bearer ${process.env.CRON_SECRET}` — 401 otherwise                          | [ ]    |      |
| 9.14 | Generate `CRON_SECRET`, set in env                                                                                       | [ ]    |      |
| 9.15 | *(Owner)* Register cron-job.org job: `https://primecart.app/api/cron/expire-orders`, every 5 min (`*/5 * * * *`), Authorization header — **not** Vercel Cron (Pro-plan only) | [ ]    |      |
| 9.16 | Confirm the 3% transaction fee applies to storefront orders only, never to manual orders                                 | [ ]    |      |
| 9.17 | **Verify** reading `order.lineItems` (embedded array) through Prisma Client returns fully populated items — if not, rewrite the expiry query with `$runCommandRaw` (D-11) | [ ]    |      |

## Phase 10 — Order Management

| #    | Task                                                                          | Status | Done |
| ---- | ----------------------------------------------------------------------------- | ------ | ---- |
| 10.1 | Order list dashboard with status filters (incl. `EXPIRED`)                    | [ ]    |      |
| 10.2 | Order detail view (line item snapshots, shipping address)                     | [ ]    |      |
| 10.3 | Manual order creation for walk-in / WhatsApp sales — `source: MANUAL`         | [ ]    |      |
| 10.4 | Status transitions PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → CANCELLED | [ ]    |      |
| 10.5 | Mark as paid / mark as fulfilled actions                                      | [ ]    |      |
| 10.6 | `orderNumber` generation                                                      | [ ]    |      |
| 10.7 | `EXPIRED` is system-set only — not a status a merchant can pick manually      | [ ]    |      |

## Phase 11 — Customer Records

| #    | Task                                                       | Status | Done |
| ---- | ------------------------------------------------------------ | ------ | ---- |
| 11.1 | Auto-create/match Customer from storefront orders          | [ ]    |      |
| 11.2 | Auto-create/match Customer from manual orders              | [ ]    |      |
| 11.3 | Customer list (name, email, phone)                         | [ ]    |      |
| 11.4 | Customer detail with purchase history                      | [ ]    |      |
| 11.5 | Confirm no standalone customer creation flow exists        | [ ]    |      |

## Phase 12 — Reporting Dashboard

All queries use MongoDB aggregation pipelines — **not** `prisma.findMany`.

| #    | Task                                                   | Status | Done |
| ---- | -------------------------------------------------------- | ------ | ---- |
| 12.1 | Total sales aggregation: daily / weekly / monthly      | [ ]    |      |
| 12.2 | Best selling products aggregation                      | [ ]    |      |
| 12.3 | Current stock value aggregation                        | [ ]    |      |
| 12.4 | Dashboard UI for the three reports (mobile-first)      | [ ]    |      |

## Phase 13 — Subscription Billing

Built against **test-mode** plan `PLN_2b0d04ozbt798kj`. A live plan code is created at deploy time (D-3) — keep the plan code in an env var, not hardcoded.

| #     | Task                                                                                                             | Status | Done |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ------ | ---- |
| 13.1  | Plan code in env (`PAYSTACK_PLAN_CODE`) so test → live is a config change, not a code change                      | [ ]    |      |
| 13.2  | Daily cron endpoint — separate from the order-expiry cron; finds merchants where `trialExpiresAt < now` AND `subscriptionStatus: TRIAL` | [ ]    |      |
| 13.3  | Protect the daily cron endpoint with `CRON_SECRET` the same way as 9.13                                          | [ ]    |      |
| 13.4  | *(Owner)* Register the daily job on cron-job.org                                                                  | [ ]    |      |
| 13.5  | Payment page collecting card details, initiating a Paystack subscription against the plan code                   | [ ]    |      |
| 13.6  | On successful subscription: store `paystackSubscriptionCode`, set `subscriptionStatus: ACTIVE`                    | [ ]    |      |
| 13.7  | Unpaid after trial expiry → `subscriptionStatus: EXPIRED` + `storefront.isActive: false`                          | [ ]    |      |
| 13.8  | Webhook `subscription.create` → confirm active, update merchant record                                            | [ ]    |      |
| 13.9  | Webhook `invoice.payment_failed` → `subscriptionStatus: EXPIRED`, deactivate storefront                           | [ ]    |      |
| 13.10 | Webhook `subscription.disable` → same as `invoice.payment_failed`                                                 | [ ]    |      |
| 13.11 | Dashboard lockout for EXPIRED merchants (built in 3.7) verified end to end                                        | [ ]    |      |
| 13.12 | Merchant-facing subscription/trial status view                                                                    | [ ]    |      |
| 13.13 | *(Owner, at deploy)* Create the live-mode Paystack plan and swap `PAYSTACK_PLAN_CODE`                             | [ ]    |      |

---

## Open Decisions

**None.** All decisions raised against the handover document have been resolved — see below.

### Resolved 2026-08-13 by project owner

| ID   | Question                                              | Resolution                                                                                          |
| ---- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| D-1  | Cloudflare R2 credentials                             | Setup completed when Phase 7 is reached. Task 7.7 is the owner's handoff point                       |
| D-2  | Paystack live activation                              | **Live-activated.** No blocker on Phases 6 and 9                                                     |
| D-3  | Live subscription plan code                           | Build against the test plan; live plan created at deploy. Plan code lives in env (13.1, 13.13)       |
| D-4  | Who configures Vercel + cron-job.org                  | Owner handles both. Tasks 4.2, 9.15, 13.4 marked *(Owner)*; I supply instructions                    |
| D-5  | Landing page design reference                         | [`docs/landing_sample.webp`](./landing_sample.webp) — matches the written design direction           |
| D-7  | Clerk ↔ Merchant link                                 | Option (a) — add `clerkUserId @unique`, drop `password`. Logged as DEV-1                             |
| D-8  | `EXPIRED` order status                                | Option (b) — add `EXPIRED` to the enum, distinct from merchant cancellations. Logged as DEV-2        |
| D-9  | Storefront when `isActive: false`                     | Option (b) — "store temporarily unavailable" page, distinct from 404. Task 8.8                       |
| D-10 | `merchantId` vs `business` naming                     | Normalise to `x-merchant-id` / `x-merchant-slug`. Logged as DEV-3                                    |
| D-11 | `expireAbandonedOrders` gaps                          | Confirmed: clear `reservedUntil` on expiry (9.11), and **prove** the embedded-array read works (9.17) |
| D-12 | `trialExpiresAt` optionality                          | Required. New empty database — no backfill concern                                                   |

### Resolved by handover revisions

- Image storage: AWS S3 → **Cloudflare R2** via `@aws-sdk/client-s3`, region `auto`, public bucket.
- Domain: `primecart.com` → **`primecart.app`**.
- Transaction fee: 2% → **3%**, PrimeCart bears Paystack's ~1.95% internally.
- Cron: Vercel Cron → **cron-job.org** with `CRON_SECRET` bearer-token protection.
- Subscription billing mechanism: Paystack subscription plans, trial not enrolled at signup.
- Merchant validation: storefront goes live automatically, no manual approval.
- Landing page: added to scope as build step 5.
- **D-6** 3% double-charge: `percentage_charge: 0` at subaccount creation; the 3% is applied once, per-transaction, via `transaction_charge`.

---

## Change Log

| Date       | Change                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| 2026-08-12 | Task list created from `PrimeCart_Handoff.md`                                                                     |
| 2026-08-12 | Regenerated against revised handover — added Landing Page phase, R2, 3% fee, cron-job.org, subscription billing; renumbered to 13 phases |
| 2026-08-13 | D-6 resolved in handover — `percentage_charge: 0` on subaccount, 3% applied once via `transaction_charge`          |
| 2026-08-13 | All remaining decisions resolved by owner. Added Owner-Approved Amendments (DEV-1/2/3), owner-handled tasks marked, verification task 9.17 added. **No open blockers — Phase 1 can start** |
| 2026-08-13 | `PrimeCart_Handoff.md` updated to carry all agreements; Decision Log added to it. The two documents now agree — no divergence to track |
| 2026-08-13 | Scaffolding rule added: official `create-next-app` flow with all offered dependencies, into `web/` since the repo root is non-empty. Vercel Root Directory task (4.0) added as a consequence |
