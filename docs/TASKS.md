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
- The Next.js app lives at the **repo root** — `src/`, `prisma/`, `public/`, `package.json` are all top-level. `docs/` and `bak/` sit alongside them. All paths in this file are relative to the repo root.
- `bak/` is reference-only: excluded in `tsconfig.json` and ignored in `eslint.config.mjs`. It is never compiled, linted, or imported from.

---

## Owner-Approved Amendments

Three changes to the original handover, approved by the project owner on 2026-08-13. **`PrimeCart_Handoff.md` has been updated to match** — see its Decision Log. These ids are referenced by the tasks below.

| ID    | Originally                                                  | Now                                                              | Why                                                                                      |
| ----- | ------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| DEV-1 | `Merchant` has `email @unique` + `password`                 | `Merchant` has `clerkUserId @unique`; `password` removed         | Auth is Clerk — PrimeCart never handles passwords, and a Clerk session needs a link field |
| DEV-2 | `OrderStatus` has no `EXPIRED`; expiry job sets `CANCELLED` | `EXPIRED` added to `OrderStatus`; expiry job sets `EXPIRED`      | Separates abandoned checkouts from genuine merchant cancellations in reporting            |
| DEV-3 | Middleware sets `x-business-id` / `x-business-slug`         | Proxy sets `x-merchant-id` / `x-merchant-slug`                   | Consistent with `merchantId` used everywhere in the schema and service layer               |
| DEV-4 | `middleware.ts` exporting `middleware`                      | `proxy.ts` exporting `proxy`                                     | Next.js 16 renamed Middleware to Proxy; `middleware.ts` is deprecated. Same functionality, new convention |

---

## Phase 1 — Project Setup

**Scaffolding rule:** use the official `create-next-app` flow and let it install everything it offers (TypeScript, Tailwind, ESLint, App Router) rather than adding dependencies by hand afterwards. `create-next-app` refuses to scaffold into a non-empty directory, so it was run into a temporary subfolder and the result relocated to the repo root — the Next.js app is top-level, not nested.

| #    | Task                                                                                                  | Status | Done |
| ---- | ----------------------------------------------------------------------------------------------------- | ------ | ---- |
| 1.1  | Scaffold via `npx create-next-app@latest` — App Router, TypeScript, Tailwind, ESLint, src dir, import alias. Verify it resolves to Next.js 16.x (14 is EOL — do not use). Scaffolded into a temp subfolder because the repo root was non-empty, then relocated to the root | [x] Next.js 16.3.0, React 19.2.8 | 2026-08-13 |
| 1.2  | Verify the generated Tailwind setup; add mobile-first conventions on top of it                        | [x] Tailwind v4, CSS-first config (no `tailwind.config.ts`) | 2026-08-13 |
| 1.3  | Shadcn/ui init (`npx shadcn@latest init`)                                                             | [x] Base UI + Nova preset — see note below | 2026-08-13 |
| 1.4  | Install Prisma pinned: `npm install prisma@6.19 @prisma/client@6.19` (v7 has no MongoDB support)      | [x] `6.19.3` exact, no caret | 2026-08-13 |
| 1.5  | Add `.vscode/settings.json` — `prisma.prismaFmtBinPath` + prisma formatter binding                    | [x] path `./node_modules/.bin/prisma`, plus `prisma.pinToPrisma6` | 2026-08-13 |
| 1.6  | Add `.vscode/extensions.json` recommending `Prisma.prisma`                                            | [x]    | 2026-08-13 |
| 1.7  | Prisma datasource + client singleton (`src/lib/prisma.ts`); `prisma generate` passes                  | [x]    | 2026-08-13 |
| 1.8  | *(Owner)* Provision the new MongoDB Atlas database and supply `DATABASE_URL` — needed for 2.8 `db push` | [x] db `primecart-dev`, verified by a successful `db push` | 2026-08-13 |
| 1.9  | Clerk install + `ClerkProvider` in root layout                                                        | [x] `@clerk/nextjs` 7.7.4, Next 16 supported | 2026-08-13 |
| 1.10 | *(Owner)* Supply Clerk publishable + secret keys — needed to exercise auth in Phase 6                 | [x] test-mode keys; dev server no longer runs keyless | 2026-08-13 |
| 1.11 | Zustand install (client state only)                                                                   | [x] 5.0.15 | 2026-08-13 |
| 1.12 | `.env.example` — DB, Clerk, Paystack (incl. `PAYSTACK_PLAN_CODE`), `CRON_SECRET`, R2, root domain      | [x]    | 2026-08-13 |
| 1.13 | Verify build: `tsc --noEmit`, `eslint`, `next build` all pass                                          | [x] all clean | 2026-08-13 |

**Phase 1 notes**

- **Shadcn/ui now asks which primitive library to use** — Base UI (its own "Recommended"), React Aria, or Radix UI. Took the recommended default, Base UI, with the `Nova` preset (Lucide icons, Geist font) per the CLI's documented default of `base-nova`. Radix was the classic shadcn foundation; if you want it instead, say so before components are built.
- **Tailwind v4** configures through CSS (`src/app/globals.css`), not `tailwind.config.ts`. The `/bak` project used v3 — its Tailwind config does not port across.
- `tsconfig.json` excludes `bak` and `eslint.config.mjs` ignores `bak/**` — without this the old codebase is compiled and fails the build.
- Before keys were supplied, Clerk ran in "keyless mode" and wrote a `.clerk/` directory (gitignored). With real keys present it no longer does; the leftover directory is inert.

**Environment readiness** (`.env`, gitignored — `.env.example` is the committed template)

| Variable | State | Needed by |
| --- | --- | --- |
| `DATABASE_URL` | ✅ set — `primecart-dev` | Phase 2 onward |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | ✅ set (test mode) | Phase 6 |
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` | ✅ set (test mode) | Phases 6, 9 |
| `PAYSTACK_PLAN_CODE` | ✅ set (test plan `PLN_2b0d04ozbt798kj`) | Phase 13 |
| `NEXT_PUBLIC_ROOT_DOMAIN` | ✅ set to `localhost:3000` for dev — must become `primecart.app` in the Vercel environment | Phases 3, 8 |
| `CRON_SECRET` | ⬜ empty — generate a long random string, and set the identical value in cron-job.org's Authorization header | Phase 9 (9.13–9.15) |
| `R2_*` (5 vars) | ⬜ empty — supplied by owner when Phase 7 is reached | Phase 7 (7.7–7.9) |

All keys are test-mode, which is correct for development. Live Paystack keys and the live plan code are swapped in at deploy (D-2, D-3).

## Phase 2 — Schema & Indexes

Database is brand new and empty — no migration or backfill concerns (D-12 resolved).

| #    | Task                                                                                                                            | Status | Done |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ------ | ---- |
| 2.1  | Write `schema.prisma` per handover §Database Schema                                                                             | [x]    | 2026-08-13 |
| 2.2  | **DEV-1:** `Merchant` gets `clerkUserId String @unique`; remove the `password` field                                            | [x] see note on duplicate indexes | 2026-08-13 |
| 2.3  | Add `reservedUntil DateTime?` to `Order` (§Stock Deduction Logic)                                                                | [x]    | 2026-08-13 |
| 2.4  | Add `paystackSubaccountCode String?` to `Merchant` (§Paystack Integration Spec)                                                  | [x]    | 2026-08-13 |
| 2.5  | Add subscription fields to `Merchant`: `trialExpiresAt DateTime` (required), `subscriptionStatus SubscriptionStatus @default(TRIAL)`, `paystackSubscriptionCode String?` | [x]    | 2026-08-13 |
| 2.6  | Add `SubscriptionStatus` enum: `TRIAL \| ACTIVE \| EXPIRED \| CANCELLED`                                                          | [x]    | 2026-08-13 |
| 2.7  | **DEV-2:** Add `EXPIRED` to the `OrderStatus` enum                                                                               | [x]    | 2026-08-13 |
| 2.8  | `prisma db push` + generate client                                                                                              | [x] db `primecart-dev`, 4 collections, 15 indexes | 2026-08-13 |
| 2.9  | Manual index on `storefront.subdomain` — unique **and sparse** (see note)                                                        | [x]    | 2026-08-13 |
| 2.10 | Manual index: `{ "storefront.customDomain": 1 }, { sparse: true }`                                                               | [x]    | 2026-08-13 |
| 2.11 | Script both manual indexes so they are reproducible per environment                                                             | [x] `prisma/indexes.mjs`, `npm run db:indexes`, idempotent | 2026-08-13 |
| 2.12 | Build the `$runCommandRaw` helper layer for embedded-type writes                                                                | [x] `src/lib/db/embedded.ts` | 2026-08-13 |
| 2.13 | Prove the embedded mechanics against the real database before building on them                                                  | [x] 13/13 checks passed | 2026-08-13 |

**Phase 2 notes**

- **The handover's schema does not validate as written.** It declares `email String @unique` *and* `@@index([email])` on `Merchant`; Prisma 6 rejects the pair with "Index already exists in the model", because `@unique` already creates the index. Both `@@index([email])` and the equivalent for `clerkUserId` are omitted. No behavioural difference — the indexes exist either way.
- **The `storefront.subdomain` index is `sparse` as well as `unique`.** The handover specifies only `unique`. A `Merchant` row is created at first Clerk sign-in (6.2) before the storefront is configured (6.4), so `storefront` is briefly absent. A non-sparse unique index treats every missing value as `null`, and the *second* merchant to sign up without a storefront would collide with the first — onboarding would break for everyone after the first user. `sparse` exempts documents missing the field while still enforcing uniqueness among those that have it.
- **Two extra indexes were added** for the cron queries the handover requires: `Order(status, paymentStatus, reservedUntil)` for the order-expiry job, and `Merchant(subscriptionStatus, trialExpiresAt)` for the daily trial-expiry job. Without these both cron jobs do full collection scans every five minutes / every day.
- **D-11 / task 9.17 is answered.** Verified against the real database: embedded arrays read back fully populated through Prisma Client, including on the exact `findMany` shape `expireAbandonedOrders` uses — `order.lineItems` returned both items with fields intact. No `$runCommandRaw` needed for *reads*. Task 9.17 remains, narrowed to re-confirming this inside the finished job.
- **Silent no-match confirmed as a real hazard.** A raw update whose filter matches nothing returns `ok:1, n:0` — indistinguishable from success. `runEmbeddedUpdate` throws on `n === 0` by default (`requireMatch`), which is why all embedded writes must go through it rather than calling `$runCommandRaw` directly.

## Phase 3 — Proxy (formerly Middleware)

Port `bak/middleware.ts` — the subdomain resolution logic is correct, keep it — into `src/proxy.ts` (**DEV-4**) and apply the three fixes. The file exports a `proxy` function, not `middleware`.

| #   | Task                                                                                                                       | Status | Done |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ---- |
| 3.1 | Create `src/proxy.ts` exporting `proxy` (sibling of `src/app`), with `config.matcher`                                       | [x] build reports `ƒ Proxy (Middleware)` | 2026-08-13 |
| 3.2 | Fix 1 — in-memory merchant cache Map, 5-minute TTL (`src/lib/merchant/lookup.ts`)                                          | [x] proven live — see note | 2026-08-13 |
| 3.3 | Fix 2 — **DEV-3:** set `x-merchant-id` and `x-merchant-slug` only; never the full merchant object                          | [x] as **request** headers — see note | 2026-08-13 |
| 3.4 | Fix 3 — wrap lookup in try/catch, fail open with `NextResponse.next()`; 404 "Store not found" when no merchant             | [x] 404 verified; fail-open path not runtime-tested | 2026-08-13 |
| 3.5 | Rename `business_id` → `merchantId` throughout the ported logic and its lookup helper                                       | [x] no `business` naming remains | 2026-08-13 |
| 3.6 | Verify root domain (no subdomain) resolves to the landing page, not a store                                                 | [x] root and `www` both → 200 landing | 2026-08-13 |
| 3.7 | Compose Clerk's `clerkMiddleware` with the subdomain logic inside `proxy.ts` without breaking either                        | [x] `/dashboard` → 307 to Clerk sign-in | 2026-08-13 |
| 3.8 | Dashboard route guard — `subscriptionStatus: EXPIRED` merchants redirected to `/billing`                                    | [x] logic in place; needs a signed-in EXPIRED merchant to exercise (Phase 13) | 2026-08-13 |
| 3.9 | Confirm no `middleware.ts` exists anywhere — only one proxy file is supported per project                                    | [x]    | 2026-08-13 |
| 3.10 | Placeholder rewrite targets so the proxy is testable: `/store/[subdomain]`, `/store-unavailable`, `/billing`               | [x] replaced in Phases 8 and 13 | 2026-08-13 |
| 3.11 | Call `invalidateStorefront` / `invalidateSubscription` wherever those fields are mutated                                    | [ ] Phases 6 and 13 | |
| 3.12 | Re-derive `merchantId` from the session and authorize inside every page, route handler and Server Action — never rely on the proxy alone | [ ] Phases 6 onward | |
| 3.13 | `/.well-known/*` treated as public — domain verification and ACME must never hit the auth guard                             | [x] verified 404 not 307 | 2026-08-13 |

**Phase 3 notes — verified behaviour**

Exercised against the running app with real `Host` headers and live fixture merchants (created, tested, deleted):

| Request | Result |
| --- | --- |
| `localhost:3000/` | 200 landing |
| `www.localhost:3000/` | 200 landing (www is not a tenant) |
| `nosuchstore.localhost:3000/` | 404 `Store not found` |
| `proxytest-active.localhost:3000/` | 200 storefront, correct `x-merchant-id` + slug received by the page |
| `proxytest-inactive.localhost:3000/` | 200 store-unavailable, storefront page not leaked |
| `/dashboard` signed out | 307 → Clerk sign-in |
| `/billing` signed out | 307 → Clerk sign-in (correct — see below) |
| `/sign-in`, `/api/webhooks/paystack` | 404, **not** 307 — confirms they are public; the routes themselves arrive in Phases 6 and 9 |

- **The handover's Fix 2 does not work as written, and leaks what it set out to protect.** It sets `response.headers`, but a Server Component reads *request* headers — response headers go to the browser. As specified, the app could not read the merchant id, and the id would be sent to the client, which is exactly what the fix says to avoid. Implemented via `NextResponse.rewrite(url, { request: { headers } })`. Verified both directions: the page receives the id, and `curl -D -` confirms it is absent from the response headers.
- **`bak/middleware.ts` contains no subdomain resolution.** The handover says the "existing middleware subdomain resolution logic is correct and should be kept", but the file only does route protection and a `/site` rewrite; there is no `getBusiness` call, no caching, and no storefront routing anywhere in `/bak` (the old app had no public storefront routes at all). The three fixes describe a target state rather than edits to existing code, so this was written fresh to match that description.
- **Prisma in the proxy works only because of Next 16.** Proxy defaults to the Node.js runtime in 16; on Next 15's Edge default a Prisma query here would fail outright. `runtime` cannot be overridden in a proxy file.
- **Cache proven live:** deleting a merchant from MongoDB and immediately re-requesting still served the storefront, confirming the 5-minute cache is serving rather than passing through. That is also its hazard — storefront changes take up to 5 minutes to appear unless invalidated, hence task 3.11.
- **Misses are cached too**, so a scanner hitting random subdomains cannot hammer the database.
- **Fail-open is not runtime-verified.** Forcing a database failure would mean pointing `DATABASE_URL` at a bad host and restarting; the code path is straightforward but has only been reviewed, not executed.
- **Route structure chosen** (not specified in the handover — say if you want it different): storefronts rewrite to `/store/[subdomain]`, the dashboard lives at `/dashboard`, reactivation at `/billing`. Storefront URLs stay clean — customers only ever see `merchant.primecart.app/...`.
- **`/billing` requires sign-in, and that is correct.** Two independent guards apply to root-domain traffic: Clerk's `auth.protect()` (are you signed in?) and the subscription check (is your subscription live?). `/billing` is subject to the first and exempt from the second — an anonymous visitor has no subscription to reactivate, while an EXPIRED merchant redirected here must not be redirected again. Verified by matcher inspection: `/billing` → public `false`, subscription-guarded `false`; `/dashboard` → `false` / `true`. No loop.
- **Clerk's `createRouteMatcher` is deprecated in v7** and slated for removal. Its own warning: middleware path matching "can diverge from how Next.js routes requests and leave protected resources reachable", and auth checks belong in each page, layout, route handler and Server Function. Replaced with plain path predicates — same behaviour, no deprecated dependency, and slightly stricter (`/sign-in-evil` no longer matches, where `/sign-in(.*)` would have).
- **Proxy checks are a first line of defence, not the security boundary.** Both Clerk and the Next.js docs are explicit that a matcher change or a moved Server Action can silently remove proxy coverage. Every page, route handler and Server Action touching merchant data must re-derive `merchantId` from the session and authorize on its own — which the handover's multi-tenancy rule already requires. Carried into Phases 6 onward.

## Phase 4 — Vercel Wildcard Subdomain Config

**Project owner handles Vercel configuration** (D-4). My deliverable is the setup instructions plus verification afterwards.

Full guide: **[`VERCEL_SETUP.md`](./VERCEL_SETUP.md)**

| #   | Task                                                                          | Status | Done |
| --- | ------------------------------------------------------------------------------- | ------ | ---- |
| 4.0 | Vercel **Root Directory** stays as the repo root (default) — the Next.js app is top-level | [x] documented | 2026-08-13 |
| 4.1 | Write setup instructions for wildcard `*.primecart.app` + root DNS on Vercel   | [x] `VERCEL_SETUP.md`, from current Vercel docs | 2026-08-13 |
| 4.2 | *(Owner)* Move nameservers to Vercel, add apex + wildcard domain, set env vars | [~] done for `dev.primecart.app`; apex/production still failing | |
| 4.3 | Verify subdomain resolution, TLS, and the 404/unavailable paths through real DNS | [x] passes on `*.dev.primecart.app` | 2026-08-13 |

**Phase 4 verification — `*.dev.primecart.app` (2026-08-13)**

Run against the live deployment with a real merchant created in MongoDB, then deleted:

| Check | Result |
| --- | --- |
| `dev.primecart.app` | ✅ 200 |
| `<merchant>.dev.primecart.app` | ✅ 200, storefront renders, correct slug reached the page |
| `nosuchstore.dev.primecart.app` | ✅ 404 `Store not found` |
| Wildcard TLS | ✅ valid (`ssl_verify=0`) |
| `x-merchant-id` in response headers | ✅ absent — reaches the app only, never the browser |
| `/.well-known/vercel/*` | ✅ 404, not redirected to auth |

Subdomain routing therefore works end to end through real DNS, TLS and Vercel — not just locally.

**Outstanding on the apex / production domains**

| Domain | Result |
| --- | --- |
| `primecart.app` | `DEPLOYMENT_NOT_FOUND` — not assigned to a deployment |
| `www.primecart.app` | **500 `MIDDLEWARE_INVOCATION_FAILED`** |
| `<anything>.primecart.app` | **500 `MIDDLEWARE_INVOCATION_FAILED`** |

The proxy throws on every request to those domains, so even the marketing site 500s.

**Cause reproduced locally: invalid or missing Clerk environment variables.** Running the dev server with a bad publishable key produces `Error: Publishable key not valid.` and a 500 on *every* route — marketing site and storefronts alike — which matches the production symptom exactly. `clerkMiddleware` wraps the whole proxy, so it fails before any of our routing logic runs, and no try/catch inside the handler can intercept it.

Fix: set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (production instance) in the Vercel **Production** scope, alongside `DATABASE_URL` and `NEXT_PUBLIC_ROOT_DOMAIN=primecart.app`. Supporting evidence: `dev.primecart.app` returns `X-Clerk-Auth-Reason: dev-browser-missing`, so that environment's Clerk keys resolve correctly.

**Correction to an earlier note here:** this was first attributed to `DATABASE_URL` throwing at module load. That is wrong — Prisma 6.19 does not throw when constructed with a missing or malformed `DATABASE_URL`; it throws on first query, which the proxy's try/catch already catches. Verified directly. `src/lib/prisma.ts` was still made lazy (worthwhile hardening — no connection opened for requests that never query, and any future construction-time failure lands inside the request path), but it was not the cause of the 500s and does not fix them.

**Phase 4 notes**

- **A wildcard domain forces DNS onto Vercel's nameservers.** Vercel must answer the ACME DNS challenge to issue wildcard certificates, so a CNAME or A record at the current registrar cannot work for `*.primecart.app`. This is the one part with no alternative.
- **The migration risk is email, not the website.** Switching nameservers drops every DNS record not recreated in Vercel — MX, SPF, DKIM, DMARC. The guide's pre-flight step is to export the existing zone first.
- **Clerk needs a production instance with its own DNS records** (`clerk`, `accounts`, `clkmail`, two DKIM). Development keys work only on localhost. Best done in the same sitting as the nameserver move so the DNS work happens once.
- **Storefronts cannot be tested on preview deployments.** Preview URLs are `*.vercel.app`, which don't match `NEXT_PUBLIC_ROOT_DOMAIN`, so the proxy treats them as the root domain and serves the marketing site. Production or local only.
- **MongoDB Atlas needs to accept Vercel's traffic.** Vercel functions have no fixed IPs, so Atlas's default IP allowlist blocks them — the build succeeds and every database call then fails at runtime.
- **`NEXT_PUBLIC_ROOT_DOMAIN` is the single highest-risk variable.** Left at its dev value, every storefront silently serves the marketing site instead.

## Phase 5 — Landing Page (`primecart.app` root)

UI must be **fully redesigned** — do not reuse the previous visual design.
Design reference: [`docs/landing_sample.webp`](./landing_sample.webp) · source: https://dribbble.com/shots/27117831-Akuma-Landing-Page

| #    | Task                                                                                                                     | Status | Done |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ------ | ---- |
| 5.1  | Read `/bak/app/site` (`page.tsx`, `layout.tsx`) and extract copy, sections, value propositions to carry over             | [x] most copy rejected — see note | 2026-08-13 |
| 5.2  | Design system: off-white/light-grey background (#F5F5F5 range), subtle grid/tile pattern behind hero                      | [x] `#F5F5F4` + 64px rule grid, masked, with filled cells | 2026-08-13 |
| 5.3  | Typography: large heavy sans-serif headlines, bold weight, tight tracking; small restrained body text                     | [x] Archivo 800 display / Geist body | 2026-08-13 |
| 5.4  | Palette: near-monochromatic — light greys, white surfaces, dark text; one near-black CTA, ghost/outline secondary CTA     | [x]    | 2026-08-13 |
| 5.5  | Navigation: horizontal, logo left, links centre, single pill/rounded CTA right                                            | [x] sticky, blurred | 2026-08-13 |
| 5.6  | Hero: centred — trust badge, large headline, short subheadline, two side-by-side CTAs                                     | [x]    | 2026-08-13 |
| 5.7  | Product preview: partial dashboard screenshot below hero CTAs, partially visible below the fold                           | [x] built as markup, not a screenshot — see note | 2026-08-13 |
| 5.8  | Cards/surfaces: white, soft shadows, rounded corners, generous padding                                                    | [x]    | 2026-08-13 |
| 5.9  | Subtle 3D accent decorations in corners/background (optional — only if execution is clean)                                | [—] deliberately skipped — see note | 2026-08-13 |
| 5.10 | Section: Problem statement — life without PrimeCart (lost stock, manual tracking, WhatsApp chaos)                         | [x] three cards | 2026-08-13 |
| 5.11 | Section: Features overview — inventory, orders, storefront, reporting                                                     | [x] four cards | 2026-08-13 |
| 5.12 | Section: Pricing — GHS 79/month + 3% per transaction (covers all payment processing fees), 30-day free trial, no hidden fees | [x] plus the GHS 200 worked example | 2026-08-13 |
| 5.13 | Pricing transparency copy, verbatim: "We charge 3% on storefront sales only. That 3% covers all payment processing fees — no hidden charges on top. Manual orders are always free. You keep 97% of every sale." | [x] verbatim | 2026-08-13 |
| 5.14 | Section: bottom CTA — signup prompt (Start free trial)                                                                    | [x]    | 2026-08-13 |
| 5.15 | Copy tone check: practical and direct, aimed at small Ghanaian retailers — operational pain points, not abstract SaaS benefits | [x] rewritten from scratch | 2026-08-13 |
| 5.16 | Mobile-first responsive pass across the whole page                                                                        | [ ] **not yet verified on a real viewport** | |

**Phase 5 notes**

- **Most of the old copy was rejected, not carried over.** `/bak/app/site` advertised a drag-and-drop store builder, multi-language support, a freemium tier and 24/7 support. All four are outside MVP scope — multi-language is explicitly deferred and pricing is a flat GHS 79 with a 30-day trial — so carrying them over would have promised things we are not building. What survived is the section skeleton (hero → features → CTA) and the dashboard-preview idea.
- **No fabricated social proof.** The design reference badge reads "Trusted by 10,000+ Online Stores". Replaced with "30 days free — no card needed", which is true.
- **The product preview is markup, not a screenshot** (`src/components/site/dashboard-preview.tsx`). The real dashboard does not exist until Phase 6, so the only available screenshots were of the deleted old UI. It shows the moment after a storefront order lands — order notice visible, `−2 sold` chip, stock already down to 10 — which demonstrates the sync rather than asserting it. Swap for a real screenshot once the dashboard ships.
- **3D accents skipped.** The brief marks them optional and conditional on clean execution; in a strictly monochrome palette they tend to read as cheap gradient blobs. The weight went into the grid and filled cells instead. Easy to add later.
- **Tailwind only, no custom CSS.** An earlier pass used custom `@keyframes` for an animated stock tick. That was removed on instruction — and it was also a latent hazard, since the rules sat outside Tailwind's layers and outranked every utility. The preview is now static.
- **Nav IA fixed after review:** "How it works" pointed at the problem section, which describes life *without* PrimeCart. Renamed to "Why PrimeCart" (`#why`), and the hero's secondary CTA now points at `#features`, which genuinely answers "how it works". Added `scroll-mt-16` so anchored headings don't land under the sticky header.
- **Known gap:** CTAs link to `/sign-up`, which 404s until Phase 6. Correct targets, not yet live.

**Cause of the first broken render, for the record:** the dev server was serving a stale, incomplete CSS chunk — `py-20`, `p-7`, `mt-12`, `gap-5` and others were missing from it while present in the production build. Every gap collapsed and the `h1` fell back to body size, because Tailwind preflight resets `h1` to inherit. A clean rebuild plus a dev-server restart resolved it. Worth remembering: if a page renders as near-unstyled markup, suspect the dev CSS chunk before the markup.

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
| 9.14 | Generate `CRON_SECRET` and set it in env — the key is present in `.env` but empty                                        | [ ]    |      |
| 9.15 | *(Owner)* Register cron-job.org job: `https://primecart.app/api/cron/expire-orders`, every 5 min (`*/5 * * * *`), Authorization header — **not** Vercel Cron (Pro-plan only) | [ ]    |      |
| 9.16 | Confirm the 3% transaction fee applies to storefront orders only, never to manual orders                                 | [ ]    |      |
| 9.17 | Re-confirm inside the finished expiry job that `order.lineItems` is fully populated. Already proven in isolation against the real DB in Phase 2 (D-11) | [ ]    |      |

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
| 13.5a | **Resolve D-14 first** — does `/billing` stay sign-in-only, or split into a public explainer + protected payment page? | [ ]    |      |
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

Deferred by the project owner — revisit before the phase that depends on it.

| ID   | Question                                                                                                                                                                                                                                          | Decide before |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| D-14 | **Should `/billing` be reachable signed-out?** It currently requires sign-in, which is correct for a payment page — Phase 13 charges a specific merchant's card, so a session is needed, and an anonymous visitor has no subscription to reactivate. The alternative is to split it: a public "your trial has ended" explainer with a sign-in button, plus a protected payment page behind it. Purely a product/UX choice; both are straightforward to build. Current behaviour is safe to leave until then. | Phase 13      |

All other decisions raised against the handover document are resolved — see below.

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
| D-13 | `middleware.ts` vs Next 16's `proxy.ts`               | Port to `proxy.ts` — the new standard. Logged as DEV-4                                               |

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
| 2026-08-13 | Scaffolding rule added: official `create-next-app` flow with all offered dependencies |
| 2026-08-13 | **Phase 1 complete** — Next.js 16.3.0 scaffolded, Tailwind v4, shadcn (Base UI/Nova), Prisma 6.19.3 exact, Clerk 7.7.4, Zustand. Build/lint/typecheck clean. Owner still to supply `DATABASE_URL` (1.8) and Clerk keys (1.10). New decision D-13 raised: Next 16 deprecates `middleware.ts` in favour of `proxy.ts` |
| 2026-08-13 | App relocated from `web/` to the repo root by owner. All `web/` references in this file corrected; `tsconfig`/`eslint` excludes added for `bak/`; package renamed to `primecart`. Build, lint, typecheck and dev server all verified from the root |
| 2026-08-13 | D-13 resolved: port to `proxy.ts` (DEV-4). Phase 3 rewritten around the Proxy convention; handover §Middleware updated to §Proxy |
| 2026-08-13 | **Phase 2 complete** — schema deployed to `primecart-dev`, manual embedded indexes scripted and applied, `$runCommandRaw` helper layer built and verified against the real database (13/13 checks). Two handover schema defects found and corrected: duplicate `@@index` on `@unique` fields, and a non-sparse unique index that would have broken onboarding |
| 2026-08-13 | **Phase 1 fully closed** — owner supplied `DATABASE_URL` and Clerk keys (1.8, 1.10), both verified. Paystack test keys and plan code also already in place, ahead of their phases. Environment readiness table added; `CRON_SECRET` and the R2 vars remain the only gaps |
| 2026-08-13 | **Phase 3 complete** — `src/proxy.ts` built and verified live against fixture merchants. Found that the handover's Fix 2 (response headers) could not work and leaked the merchant id to the client; implemented as request headers instead. Also found `bak/middleware.ts` has no subdomain logic to port, so it was written fresh from the fixes' description |
| 2026-08-13 | Replaced Clerk's deprecated `createRouteMatcher` with plain path predicates after it emitted a removal warning. Confirmed `/billing` requires sign-in but is not subscription-guarded, so there is no redirect loop. Added task 3.12 for resource-level authorization |
| 2026-08-13 | **Phase 4 instructions delivered** — `VERCEL_SETUP.md` written from current Vercel docs. Key constraint: wildcard domains require moving nameservers to Vercel, which drops any DNS records not recreated there. Awaiting owner to apply (4.2) before verification (4.3) |
| 2026-08-13 | Owner moved nameservers and added `*.dev.primecart.app`; Vercel reported a proxy-check failure. Diagnosed: DNS and wildcard TLS both correct, no deployment existed (`DEPLOYMENT_NOT_FOUND`). Fixed a real proxy bug found while investigating — `/.well-known/*` was hitting the auth guard and would have broken domain verification post-deploy (3.13). Documented that a `dev.` environment needs `NEXT_PUBLIC_ROOT_DOMAIN=dev.primecart.app` |
| 2026-08-13 | D-14 raised and deferred by owner: whether `/billing` should be reachable signed-out. Current sign-in-only behaviour left in place; revisit in Phase 13 (13.5a) |
| 2026-08-13 | **Phase 4 verified on `*.dev.primecart.app`** — subdomain routing, wildcard TLS, 404 and header-leak checks all pass against the live deployment. Apex and `www` still return 500 `MIDDLEWARE_INVOCATION_FAILED`, almost certainly missing Production env vars |
| 2026-08-13 | Made `src/lib/prisma.ts` lazy. Reproduced the production 500 locally: **invalid Clerk keys**, not `DATABASE_URL` — Prisma 6.19 does not throw at construction, contrary to the earlier note, which is now corrected in the Phase 4 section |
| 2026-08-13 | **Phase 5 complete** except the mobile pass (5.16). Landing page built with Archivo/Geist, monochrome palette, markup-based product preview. Custom CSS removed on instruction — Tailwind only. Nav IA corrected after visual review |
