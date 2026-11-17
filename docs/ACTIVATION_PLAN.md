# Activation Plan — getting to one genuinely active merchant

**Status:** active plan, written 2026-11-04. Supersedes nothing; pauses the Phase 16 / Phase 17 build decision until the gates below are met.

This exists because a strategic question ("should PrimeCart reposition from storefront to order management?") turned out to rest on an assumption the production data does not support. The plan below is designed to produce the evidence that question actually needs, rather than answering it from intuition.

---

## 1. What the production data says (2026-11-04)

Queried `.env.prod` directly. All five merchants, all orders, all time:

| Signal | Value |
| --- | --- |
| Merchants with a live storefront | 5 |
| Orders, all merchants, all time | **4** |
| Storefront checkouts started | 4 |
| → abandoned at payment (`EXPIRED` / unpaid `PENDING`) | **0** |
| → completed (`PAID`) | 4 |
| Manual / WhatsApp orders entered | **0** |
| Total paid revenue | GHS 28.00 (test transactions) |

Products per merchant: `GadgetHub: 1`, `Thibaut: 0`, `GadgetzHub: 1`, `EverythingShop: 4`, `ELFRANKDREW ENTERPRISE: 1`.

Of the five, four are internal (owner + brother + a test store). **The only real external merchant is ELFRANKDREW ENTERPRISE** — storefront live 2026-09-22, one product uploaded, zero orders, no return visits.

## 2. The diagnosis this forces

**Three conclusions follow directly, and one does not.**

1. **No buyer has ever refused to prepay.** Zero abandoned checkouts. The pay-on-delivery hypothesis is not disproven — it is *untested*, because no buyer ever reached the payment step. Nothing in this dataset says anything about prepayment resistance in either direction.
2. **The shops were never stocked.** One product is not a catalogue. Nobody can buy from an empty shop, so dormancy has an ordinary explanation that does not require any theory about buyer behaviour.
3. **Order management already has zero uptake too.** Manual/WhatsApp order entry is built, free, and sitting in the dashboard. Merchants entered **none**. The half of the product the pivot would move toward has exactly the same usage record as the half it would move away from.

**What does not follow:** that PrimeCart is positioned wrongly. This is an **activation problem** — merchants sign up, meet the catalogue-setup work, and stop — not a positioning problem. Repositioning does not touch it. A merchant who will not enter ten products once will not log ten orders a day either.

### What remains true despite the above

The pay-on-delivery observation came from real conversations with people in the trade and is very likely true of the Ghanaian market generally. The structural problems it creates for a percentage-of-payment revenue model are real and unresolved:

- A take-rate model earns nothing on sales that settle in cash at the door.
- Any doorstep fee is trivially avoidable ("just send it to my MoMo"), because the merchant is standing there at the moment of payment.
- Per-order pricing on a tool whose value is a *complete* record creates an incentive to keep records incomplete.

These are genuine future constraints. They are simply **not the cause of the current dormancy**, and solving them would not have made these five shops active. See §6.

## 3. What we are explicitly NOT doing yet

| Not doing | Why |
| --- | --- |
| Repositioning the product or marketing copy | The evidence it rests on does not exist yet |
| Removing or demoting the storefront in code | It is built, verified, and is the only working revenue line. Costs nothing to keep |
| Starting the Phase 16 WhatsApp build | Large, and its shape depends on whether we are building a notifier or a buyer-reputation network (§5) |
| Changing the pricing model (D-18) | Premature: optimising the price of a product with no real usage. See §6 |
| Building COD/deposit/dispatch features | Would be built on an untested hypothesis |

Phase 17 (Legal & Compliance) is **not** paused — 17.1–17.5 are owner/lawyer tasks with external lead times and should run in parallel regardless of direction.

## 4. The plan

### Phase A — Make one merchant genuinely live (target: 2 weeks)

Focus entirely on **ELFRANKDREW ENTERPRISE**. One merchant, done properly, beats five half-finished.

| # | Action | Owner | Done when |
| --- | --- | --- | --- |
| A1 | Book a 2-hour in-person (or screen-share) setup session | Owner | Session scheduled |
| A2 | Send the prep list from [`MERCHANT_ONBOARDING.md`](./MERCHANT_ONBOARDING.md) §2 **before** the session | Owner | Merchant has gathered photos, prices, cost prices, stock counts |
| A3 | Run the session and **do the data entry yourself** — do not watch them struggle through it | Owner | Shop meets the "stocked" bar: **≥10 products**, each with photo, price, cost price, stock count, low-stock threshold |
| A4 | Walk them through sending the shop link — actually watch them paste it into a real WhatsApp chat or status | Owner | Link sent to ≥20 real customers / posted to status |
| A5 | Enter one real past order together as a manual order, so they have seen the flow once | Owner | ≥1 manual order exists |
| A6 | Agree the follow-up cadence and the two things we need them to log (§Phase B) | Owner | Merchant has agreed |

Repeat for 2–3 more **real** merchants only once ELFRANKDREW is through A4. Do not onboard in parallel at this stage — the point is to learn what breaks, and that requires watching closely.

### Phase B — Instrument the two unknowns (runs during Phase A, 2–4 weeks)

Two numbers decide the entire strategy. Neither requires building anything.

**B1 — The pay-on-delivery ratio.** For every order the merchant takes (any channel): did the customer prepay, or pay on delivery? A tally on paper or a WhatsApp message to the owner is fine. Target: 30+ orders logged.

**B2 — The failed-delivery rate.** For every delivery attempted: completed, refused, or no-show? Target: 30+ deliveries logged.

Ask five merchant contacts the retrospective version this week, independent of the pilot: *"Of your last 20 deliveries, how many failed?"* That is twenty minutes of phone calls and gives a usable prior immediately.

**B3 — Did the link get used?** Re-run the production query (script pattern in §7) weekly. Specifically watch for storefront orders reaching `PENDING`, which is the first direct evidence of real buyer behaviour.

### Phase C — Decision gates

Each gate maps evidence to a decision. Nothing is decided before its gate is met.

| Gate | Evidence | Decision it triggers |
| --- | --- | --- |
| **G1** | Shop is stocked (A3) and link sent (A4), but still **no traffic and no orders after 2 weeks** | The problem is demand/distribution, not product. Neither pivot nor Phase 16 helps. Investigate how the merchant actually reaches customers before building anything |
| **G2** | Buyers **reach checkout and abandon** (`EXPIRED` / unpaid `PENDING` climbing) | Pay-on-delivery confirmed as the blocker. Build the COD order flow: reservation window measured in days not minutes, `PARTIALLY_PAID` made real, failed delivery as a first-class status |
| **G3** | Buyers **check out and pay normally** | Prepayment is viable for this segment. Keep the storefront primary; dormancy was purely activation. Revisit COD only when a merchant actually hits it |
| **G4** | Merchant records WhatsApp/walk-in orders **without being prompted** | Order management has genuine pull. Justifies investment in editing, partial payment, dispatch |
| **G5** | Merchant records nothing manually even after setup is done for them | Order management has no pull either. The product problem is deeper than positioning — stop and reassess before any further build |
| **G6** | Failed-delivery rate (B2) **≥ 20%** | The buyer-reputation layer is the real business, not a feature. Re-scope Phase 16 around it |
| **G7** | Failed-delivery rate **< 10%** | Reputation is a nice-to-have. Phase 16 stays a notification channel as currently specced |

## 5. Why Phase 16's shape depends on this

Phase 16 as written registers **one dedicated PrimeCart number** (16.5) and sends *from* it. That means PrimeCart cannot read merchants' existing WhatsApp conversations, so it cannot auto-ingest orders from where orders actually arrive. Auto-ingestion would require each merchant onboarding their own number to the Cloud API (losing the WhatsApp Business app on that number — a non-starter for a trader whose number *is* their shop) or a full multi-tenant BSP / Embedded Signup setup. That is materially more work than 16.8–16.21 describe.

If G6 fires, Phase 16 is not a notification feature at all — it is the delivery/reputation network, and should be re-specced before `docs/WHATSAPP.md` (16.4) is written.

## 6. Pricing — deferred, with a recommendation on file

Current live model: **3% per storefront sale, capped at GHS 500** (`STOREFRONT_FEE_RATE`, `STOREFRONT_FEE_CAP_PESEWAS`). PrimeCart absorbs Paystack's ~1.95% via `bearer: "account"`, so the merchant sees a single all-in 3% and PrimeCart nets ~1.05%.

**Decision: do not change pricing now.** Optimising price before a single merchant uses the product daily is premature, and the data needed to price well (B1, B2, G4) does not exist yet.

**Pilot merchants pay nothing**, explicitly and with a stated end — "free while we build this together, in exchange for your honest feedback and the two tallies." That is a design-partner arrangement, not a trial, and it should be framed that way so introducing a price later is not a betrayal.

**Direction of travel when the gates land:** a flat subscription is the only model that survives a pay-on-delivery market, because it does not depend on money crossing PrimeCart's rails and creates no incentive to under-record orders. Keep the 3% as an opt-in for prepaid storefront orders only. Note that D-16's own record shows merchants objected to the 3% *stacked on top of* GHS 79/month — **not to the subscription itself** — so a standalone subscription has not actually been tested with merchants. Test a weekly price point too (GHS 20–30/week); weekly contribution is a more familiar rhythm than monthly billing for this segment.

This updates the framing of **D-18** but does not resolve it. 16.2 stays open.

## 7. Re-running the production snapshot

The query used for §1 lives in the session scratchpad, not the repo (it reads `.env.prod` and must never be committed with credentials). To rebuild it: parse `DATABASE_URL` out of `.env.prod`, set it on `process.env` before instantiating `PrismaClient`, then report per-merchant order counts grouped by `status` / `paymentStatus` / `source`, plus product counts per merchant. The decisive figures are storefront checkouts started, how many were abandoned at payment, and how many manual orders exist.

Run it weekly during Phase A and record the numbers in the Change Log entry for this plan.

## 8. Related

- Onboarding runbook: [`MERCHANT_ONBOARDING.md`](./MERCHANT_ONBOARDING.md)
- Task tracking: [`TASKS.md`](./TASKS.md) — Phase 16 (WhatsApp + fee review), Phase 17 (Legal & Compliance), D-18, D-23
- D-17's dormancy digest (13b.7) is still unregistered. With five merchants it adds little, but register it anyway — it is the standing instrument for exactly this question.
