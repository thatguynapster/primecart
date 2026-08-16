# Platform notifications (Resend) — proposal

**Status: built and verified live (2026-08-16).** Decisions already made with the owner are marked **Decided**; everything else is open.

Raised 2026-08-16: the owner wants merchants notified by email of platform events (product added, low stock, order made, payment received), and flagged that this needs planning up front so no relevant event is missed.

---

## Decided (2026-08-16)

| Question | Decision |
| --- | --- |
| Recipients for v1 | **Merchant-only.** No customer-facing transactional email (order confirmation, shipped, delivered) in this pass — that is a separate piece of work with its own template tone and deliverability concerns, and it touches the "receipt sent to your email" copy on the storefront order-status page (see below). |
| "Product added" | **Dropped from v1.** The merchant is the one who just added it — there is no one else to notify yet, since PrimeCart is single-user per shop today. Worth revisiting if/when staff accounts exist. |
| Low-stock cadence | **Once per crossing.** Alert when a variant's stock first reaches its threshold; stay silent on further sales of the same variant until it is restocked above the threshold and crosses down again. |

### A finding along the way, not a decision needed

The storefront order-status page already says *"A receipt has been sent to your email"* (`src/app/store/[subdomain]/orders/[orderId]/page.tsx`). Nothing in PrimeCart sends that — it is riding entirely on **Paystack's own automatic payment receipt** to the payer (`initializeTransaction` passes the guest's email; Paystack emails its own receipt on a successful charge, independent of anything PrimeCart does). That is consistent with "merchant-only, no customer email in v1" above — the copy is not false, just not ours. Flagging so nobody mistakes it for a gap and "fixes" it by mistake before customer-facing email is actually scoped.

---

## v1 event catalog

Three events, both traced to their exact trigger point in the current code. Nothing else in the codebase changes state on the merchant's behalf in a way that isn't already visible to them at the moment they cause it (see "Deliberately excluded" for the full reasoning per action).

| # | Event | Trigger point | Why this point, not another |
| --- | --- | --- | --- |
| 1 | **New paid order** | `src/app/api/webhooks/paystack/route.ts` — inside `settleFromPending` and the success branch of `settleFromExpired`, only when the claiming `updateMany` actually reports `count > 0` | Firing on order *creation* (`checkout()`) would alert on every abandoned cart — most PENDING orders that never get paid expire silently 30 minutes later. The moment worth an email is confirmed money, not an intent to pay. Using the existing claim-count guard means the email is naturally idempotent against Paystack's webhook retries — it fires exactly once, on the one call that actually wins the race. |
| 2 | **Needs review — payment received, order not confirmed** | Same file: the `OversellError` branch of `settleFromExpired` (late payment, stock no longer available), and the final fallback branch of `confirmPaidOrder` (payment arrived while status was `CANCELLED` or otherwise unexpected) | This is exactly the task 10.8 gap — money has moved but the order did not confirm, and nothing is watching the dashboard in real time. This is the one event where a delay in noticing has a real cost (a customer paid and is waiting), so it gets its own urgent-toned template rather than sharing #1's. |
| 3 | **Low stock** | `src/lib/orders/stock.ts` — inside `reserveStock`, after each line's atomic decrement succeeds, comparing the *new* stock against `lowStockThreshold` | This only fires from stock leaving through a sale (`reserveStock` is called by both storefront checkout and manual order creation — task 10.3 reuses it deliberately). It does **not** fire from a merchant's own manual recount (`adjustStock`/`editVariant`'s `setVariantStock`) — if a merchant types "3" into the stock field themselves, they already know it is 3. Only a sale silently crossing the line while nobody is looking is worth an email. |

**Explicitly not in v1, and why:**

| Candidate | Why excluded |
| --- | --- |
| Product created | Decided above — merchant did it themselves |
| Order status changes merchants make themselves (`advanceOrderStatus`, `cancelOrder`, `markOrderPaid`, `createManualOrder`) | Every one of these is a merchant clicking a button in their own dashboard. Emailing someone about an action they just took in the same session adds noise, not information. |
| Order expiry (cron) | Routine housekeeping for an abandoned cart nobody paid for. Visible in the order list if anyone cares; not urgent enough for an inbox. |
| Trial ending / subscription lapsed | Real candidates, but they belong to Phase 13 (Subscription Billing), which is not built yet. Raising here as a note so it is not forgotten when that phase starts — do not build it now against a phase that does not exist. |
| Welcome email on onboarding complete | Nice-to-have, not one of the four examples given, no urgency. Candidate for a later pass alongside customer-facing email. |

---

## Architecture

### Where the sending logic lives

`src/lib/notifications/` — new module, mirroring how `src/lib/paystack.ts` wraps that SDK:

- `resend.ts` — a thin client wrapper: `sendEmail({ to, subject, html })`. No React Email templates for v1 — three plain, mobile-readable HTML emails do not need a templating layer, and it avoids a new dependency for three static shapes. Revisit if the customer-facing pass (deferred above) brings the count up.
- `events.ts` — one function per event (`notifyNewOrder`, `notifyNeedsReview`, `notifyLowStock`), each building its own subject/body and calling `sendEmail`. Keeping one function per event, named for the event rather than generic, is what makes "did we cover everything" auditable later — the three trigger points above call these by name, not a generic `notify(type, payload)` dispatcher that could silently swallow a typo'd event name.

### Reliability rule: notifications never fail the operation they're attached to

A payment confirming or stock reserving must never fail, roll back, or hang because Resend is down. Every call site wraps the notification in its own `try/catch`, logs on failure, and continues — the same pattern already used for R2 upload rollups and the webhook's own stray-reservation cleanup. An unsent low-stock email is a missed alert; a payment that fails to confirm because an email API timed out is a much worse bug.

### Low-stock dedupe needs one schema field

To honor "once per crossing," something has to remember whether this crossing was already alerted. Add to `ProductVariant` (embedded — writes go through `runEmbeddedUpdate`, same as every other per-field variant edit):

```prisma
type ProductVariant {
  ...
  lowStockAlertedAt DateTime?
}
```

- Set when the alert fires.
- Cleared (`null`) whenever stock rises back above `lowStockThreshold` — both `adjustStock` (manual recount) and `restoreStock` (cancel/expire) already touch stock and are the two places to add this reset.
- `reserveStock` only sends when `newStock <= lowStockThreshold && !variant.lowStockAlertedAt`, and sets the field in the same call.

New field on an existing embedded type reads back as `null` on every document written before it exists — already-established behavior from DEV-5, and exactly what "not yet alerted" should mean by default, so no backfill is needed.

### Env

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key |
| `NOTIFICATIONS_FROM_EMAIL` | Verified sender address, e.g. `alerts@primecart.app` |

---

## Owner task: Resend setup

Same shape as the R2 and Vercel domain setups already documented (`R2_SETUP.md`, `VERCEL_SETUP.md`) — I'll write the equivalent `RESEND_SETUP.md` once this proposal is approved. In short, ahead of time:

1. Resend account, add `primecart.app` (or a subdomain like `mail.primecart.app`) as a sending domain.
2. Add the DNS records Resend issues (SPF + DKIM, similar shape to the Clerk production DNS records from Phase 4) — same nameserver-is-now-Vercel caveat applies as last time.
3. Until that domain is verified, Resend only delivers to the account's own signup email — fine for building and testing this against a real inbox, not for sending to arbitrary merchants.
4. Supply `RESEND_API_KEY` for `.env`.

---

## Deliberately excluded

- **A generic event bus / notification queue.** Three events, all triggered synchronously from two files. A queue (or an outbox table for retry) is solving a scale problem PrimeCart does not have yet — add it if delivery reliability actually becomes a problem, not preemptively.
- **Per-category merchant preferences (toggle each alert on/off).** All three v1 events are alerts a merchant would want by default (new revenue, money at risk, stock running out) — there is no obvious "I don't want to know about this" case yet. A settings toggle is easy to add later without a schema migration headache, since it would just be new optional fields on `Merchant`.
- **SMS or WhatsApp delivery.** The owner asked specifically for Resend/email. WhatsApp in particular is explicitly deferred to Phase 2 elsewhere in the handover.
- **A notification history/log page in the dashboard.** Email *is* the log for v1. Worth reconsidering once there are more event types than fit comfortably in an inbox.

---

## Implementation plan — done

1. Schema: `lowStockAlertedAt DateTime?` on `ProductVariant`, `db:push` + `db:indexes` + `prisma generate`.
2. `src/lib/notifications/resend.ts` (thin Resend wrapper, falls back to Resend's unverified-domain sender when `NOTIFICATIONS_FROM_EMAIL` isn't set yet) + `events.ts` (`notifyNewOrder`, `notifyNeedsReview`, `notifyLowStock` — each catches and logs its own failures, never throws).
3. Wired `notifyNewOrder` into `settleFromPending`'s and `settleFromExpired`'s success paths, `notifyNeedsReview` into `settleFromExpired`'s `OversellError` branch and `confirmPaidOrder`'s CANCELLED/unexpected-status fallback, in `src/app/api/webhooks/paystack/route.ts`.
4. Wired `notifyLowStock` into `reserveStock` (`src/lib/orders/stock.ts`), with the once-per-crossing dedupe (`lowStockAlertedAt`) set there and cleared in `restoreStock` (once stock rises back above threshold) and `setVariantStock` (`src/lib/products/variants.ts`, any manual recount always clears it).
5. Added `getDashboardOrigin()` to `src/lib/domain.ts` so email links to `/dashboard/orders/...` resolve correctly in both local dev and production.
6. `RESEND_API_KEY` / `NOTIFICATIONS_FROM_EMAIL` added to `.env` and `.env.example`.

**Verified live** — real database, real Resend sends (no mocking), fixtures cleaned up afterward:

| Check | Result |
| --- | --- |
| Low-stock dedupe (10 checks): first crossing alerts and sets the flag, a second sale below threshold does not re-alert, restocking above threshold clears the flag, a fresh crossing after that alerts again, a manual recount always clears the flag | ✅ 10/10 |
| Webhook notifications (6 checks): an ordinary payment confirms and fires `notifyNewOrder`; redelivering the same webhook is still idempotent (no state change, no re-notify); a late payment on an exhausted-stock EXPIRED order fires `notifyNeedsReview` and correctly leaves `status: EXPIRED` / `paymentStatus: PAID`; stock fully restored afterward | ✅ 6/6 |
| Real emails | Both "New order" and "Needs review" templates were actually delivered through the live Resend API to the merchant's own address during the checks above — not just logic-verified |

**One real bug found and fixed during verification:** `reserveStock`'s `$set` for `lowStockAlertedAt` originally passed a plain JS `Date`, which `$runCommandRaw` serialises as an ISO *string*, not a BSON date — Prisma Client then threw `Inconsistent column data: Failed to convert ... to DateTime` on the next read. Fixed by using MongoDB extended JSON (`{ $date: date.toISOString() }`), the same convention `dashboard/queries.ts`'s `isoDate()` already uses for raw aggregation pipelines. This codebase's one prior raw embedded write of a date value; worth remembering for the next one.

**Resend sending domain verified (2026-08-16).** Owner set `NOTIFICATIONS_FROM_EMAIL=noreply@primecart.app`. Confirmed live with a throwaway send through the real `sendEmail()` wrapper — accepted by Resend, no fallback to the unverified-domain sender. Notifications can now reach any merchant's real email, not just the Resend account's own signup address.

`docs/TASKS.md` change log entry added below — this was never in the original handover, so it's logged as scope, not a numbered phase task, the same way `STOREFRONT_BRANDING.md` and D-15 were.
