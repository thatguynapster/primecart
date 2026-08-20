# Storefront branding — deferred proposal

**Status: proposed, not approved, not built.** Parked deliberately until the remaining phases are done. Nothing in the codebase depends on this document.

Raised 2026-08-15 while discussing whether merchants should be able to pick a storefront template. The conclusion was that templates are a v2 concern, but that the underlying worry — *every shop looking identical* — is better answered first by giving merchants more to brand with.

---

## The problem this addresses

A storefront currently has three branding levers: **logo, business name, primary colour**. Two shops selling different things look near-identical, because the only things that differ are a word, a small image and a button colour.

That thinness — not the shared layout — is what makes stores look samey. Shopify's default theme backs an enormous number of stores without anyone calling it lazy, because merchants differentiate through content. PrimeCart merchants currently cannot.

---

## Recommended fields

All on `MerchantStorefront`, all **optional**, all with app-level defaults.

| Field | Type | What it does |
| --- | --- | --- |
| `bannerUrl` | `String?` | Hero image at the top of the shop |
| `surfaceTone` | `String?` | Page ground, from a curated set |
| `fontChoice` | `String?` | Type personality, from a curated set |

### 1. `bannerUrl` — hero image

The single biggest differentiator. Two shops with identical layout but different banner photography read as completely different shops. One R2 upload, reusing everything already built for the logo. Absent → the current clean header, unchanged.

### 2. `surfaceTone` — page ground

**Not a free-form hex.** A constrained set of three or four grounds:

- *Paper* — the current white (default)
- *Warm* — cream/sand
- *Cool* — soft grey-blue
- *Ink* — dark

This changes the whole page, which is where the sameness actually lives.

> Deliberately **not** a colour picker. A merchant choosing `#FFFF00` produces an unreadable shop, and we would be doing contrast maths across every storefront surface forever. A curated set gives most of the variety with none of the risk. The same reasoning already applies to `primaryColor`, where `onBrandColor()` computes readable text from luminance — that works for a button, but not for an entire page.

### 3. `fontChoice` — type personality

Three curated pairings loaded via `next/font`, switched with a CSS variable — the same mechanism the dashboard already uses for Inter:

- *Modern* — Geist (default)
- *Editorial* — a serif
- *Bold* — a tight grotesque

Typography moves perceived brand more than almost anything else at this price point. A jewellery seller genuinely should not look like a charger seller.

### 4. Wider use of `primaryColor` — no new field

Let the storefront use the existing colour in more places than buttons: section rules, active states, banner overlay. A usage change, not a schema change.

---

## Deliberately excluded

- **Product card shape** (square vs portrait) — fiddly, low payoff; product photography varies in aspect regardless.
- **A hero headline field** — `description` already exists and is underused. Render that over the banner rather than adding another string.
- **Free-form background or text colours** — see the contrast argument above.

---

## Adjacent, not branding: `whatsappNumber`

A `whatsappNumber String?` and a "Chat on WhatsApp" link on the storefront.

For this market it is arguably worth more than any field above — the target merchants already sell over WhatsApp, and a `wa.me` link is just a link, **not** the bot integration the handover defers to Phase 2. Kept out of the recommendation because it is utility rather than branding, but worth deciding on separately.

---

## Implementation notes for whoever picks this up

**Make every field optional.** A field added to an embedded type reads back as `null` on documents written before it existed — verified against MongoDB during DEV-5, and the cause of a genuinely confusing bug where variant photos saved but never appeared. With `String?` fields, `null` simply means "not chosen" and no backfill is needed.

**Curated sets: `String?` with app-level validation, not a Prisma enum.** Adding a tone or a font then costs a code change and no migration. It also sidesteps any question about enums inside composite types on MongoDB, which we have not tested.

**Where the work lands:** schema (three optional fields), the settings page (form patterns already exist — the logo upload is directly reusable for the banner), and the storefront reading the choices. Most of the effort is the storefront applying them, not collecting them.

**Scope:** this is an amendment to the handover, which specifies only logo, business name and primary colour under storefront branding. Log it as a DEV-numbered amendment on approval, alongside DEV-1…DEV-5.

---

## Relationship to storefront templates (v2)

Templates were assessed at the same time and deferred. The reasoning is worth keeping:

- **Templates multiply QA surface.** Every storefront behaviour — variant selection, sold-out states, low stock, cart, and the whole Phase 9 checkout — must work in every template. Introducing layout variance before checkout is proven means validating the riskiest remaining work across N surfaces instead of one.
- **Build checkout once**, in one storefront, with real Paystack money. Then vary presentation.
- **The cheap groundwork is a discipline, not a feature:** route loads data → passes a typed props object → a presentational component renders it. That turns "add a template" into "add a component and a map entry". Worth maintaining as the storefront grows.
- **Add `template String?` opportunistically** the next time the schema is pushed for another reason — not as a special trip.
- **Never let a template change routes or URL shape.** Templates must be swappable presentation over identical routes, or the project inherits per-template SEO and link-stability problems that are painful to undo.

These branding fields are compatible with templates rather than competing with them — a template decides layout, branding decides how a given layout is dressed.
