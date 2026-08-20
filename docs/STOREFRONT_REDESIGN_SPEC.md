# Storefront redesign — build spec

**Status: draft, not approved, not built.** Companion to [`STOREFRONT_REDESIGN_REFERENCE.md`](./STOREFRONT_REDESIGN_REFERENCE.md), which inventoried the UI reference and recorded what's excluded/kept. This document turns those decisions into an actual page structure and a buildable task list (see [`TASKS.md`](./TASKS.md) Phase 14). Items still open are marked **OPEN** rather than decided silently.

---

## Goal

Replace the current bare-bones storefront (search box + category chips + a flat product grid) with the richer, sectioned layout the reference demonstrated — while working correctly for the three shop types PrimeCart actually needs to serve: **jewellery, electronics, and clothing**. A given merchant sells within one of these, never all three at once, but the template itself must render sensibly for any of them from the same code — nothing in the layout may assume a specific category's content the way the reference does.

**Visual fidelity requirement, confirmed 2026-08-19:** for every section kept in this redesign, match the reference image's layout, spacing, component structure, and look and feel exactly — this is not "inspired by," it's a precise build against the sample. The only things that legitimately vary from the reference are the parts that *have* to be data-driven per merchant: actual category names/images, actual product photos/names/prices, and the merchant's own logo/business name/`primaryColor` in place of the reference's fixed Lumixio blue/black palette. Sections and features already excluded or deferred above stay excluded/deferred — fidelity applies to what's being built, not an instruction to reconsider what's already been cut.

## Current state (what's being replaced)

- `src/app/store/[subdomain]/layout.tsx` — header (logo, business name, cart button), footer (business name, description, "Powered by PrimeCart"). This shell mostly stays.
- `src/app/store/[subdomain]/page.tsx` — the part being redesigned: currently just an optional description paragraph, a search box, category filter chips, and a flat 2/3-column product grid. No hero, no sections, no promo content.
- Already built and reusable as-is: `listStorefrontProducts` (search + category filter, newest-first), `listStorefrontCategories` (distinct categories for a merchant), `priceRange`/`totalStock` per product, sold-out badge on the product card. The dashboard's `getBestSellers` aggregation (units sold, paid orders only) is also reusable for a "Best Sellers" section without new query work.

## Confirmed exclusions (from the reference doc, decided 2026-08-17)

Account icon, star rating/review-count badge, partner/brand logo strip, product card badge pill (NEW/BEST/TRENDING/SALE %), trust badge strip. None of these appear anywhere in what follows.

The card icon originally catalogued as "wishlist/bookmark" was corrected 2026-08-19 — it's actually **add-to-cart**, and is kept (see the product card treatment under section 5).

## Deferred to the next version

Promo banners, and the discount/compare-at-price concept underneath them — reversed 2026-08-17. Discounts are a real, confirmed requirement, but they'll be scoped and designed properly as their own piece of work rather than folded into this redesign. Nothing in the page structure below includes a promo-banner slot.

---

## Page structure

Each reference section, translated. **Kept** sections are the working plan; **OPEN** sections need a decision before they're buildable.

### 1. Header — kept, adjusted

Logo/business name and cart button already exist. Adding: a nav row with **Home** plus the merchant's own top categories (reusing `listStorefrontCategories`), replacing the reference's hardcoded "Headphones / Earphones / Speakers." Search stays as a visible field, not necessarily a header icon.

### 2. Hero — kept, needs new merchant-configurable content

Headline, subheading, one CTA, hero image — no rating badge (excluded). None of this content exists on `MerchantStorefront` today (only `businessName`, `description`, `logoUrl`, `primaryColor`). Needs new optional fields — a headline, a subheading, and a hero image upload — surfaced on the settings page, all optional with a sensible fallback (e.g. business name + description) so a merchant who skips it still gets a hero, just a plainer one.

Section 8's mid-page banner is built the same way but is a second, independent slot — its own headline/subheading/image fields, not a repeat of the hero's content, so the page doesn't show the same banner twice.

### 3. Partner logo strip — excluded entirely.

### 4. Category tiles ("Most Popular Categories" → just "Shop by Category") — kept, data-driven

Reuses `listStorefrontCategories`. **Decided 2026-08-19:** the tile image is auto-picked from the category's first/newest product photo — zero new merchant effort, works immediately for all three shop types, no schema change needed. A merchant-assigned image per category (its own small content-management surface — a list of categories, each with an optional image upload) is real, wanted functionality, but deferred to a later version rather than built now.

### 5. Best Sellers — kept

Reuses the dashboard's `getBestSellers` aggregation directly (paid orders, units sold). Product card: photo, category eyebrow, name, price, add-to-cart icon — no badge pill (excluded). The add-to-cart icon (corrected 2026-08-19 from an earlier "wishlist icon" misreading) adds the card's default sellable variant to the cart directly from the grid — same cart the storefront's guest checkout already uses, no account/wishlist concept needed. This card treatment is shared by every product grid on the page (sections 5, 7, 9).

### 6. Promo banners — deferred to the next version, not built here

Reversed 2026-08-17: no promo-banner slot in this redesign at all. See [`STOREFRONT_REDESIGN_REFERENCE.md`](./STOREFRONT_REDESIGN_REFERENCE.md#promo-banners--deferred-to-the-next-version-not-this-redesign) for the full problem statement, kept there for whenever discounts get planned as their own piece of work:
- a real discount/sale concept — `ProductVariant` has no compare-at/original price field. Needed for a banner (or any other UI) to say anything truthful ("Up to 25% Off!").
- banner image source — reuse a product photo, or a dedicated banner image upload.
- who configures a banner and how — manual (merchant picks photo/headline/discount/link target via settings) vs. automatic (derived from whichever category/products currently have a discount applied).

### 7. Featured Collection — kept, decided 2026-08-19

Same card treatment as Best Sellers. A new `isFeatured` boolean on `Product`, toggled by the merchant (product edit/list screen in the dashboard), drives this section — merchant-curated, not auto-derived from sales or recency the way Best Sellers/New Arrivals are.

### 8. Full-width mid-page lifestyle banner — kept, same treatment as the hero

Decided 2026-08-18: kept, built the same way as section 2's hero — same merchant-configurable fields (headline, subheading, image, one CTA), same fallback behaviour when a merchant hasn't set one. Functionally a second hero, roughly mid-page.

### 9. New Arrivals — kept, cheapest section to build

Already have everything needed: `listStorefrontProducts` sorts newest-first already, and the in-page category tabs are the existing category-chip filter (`listStorefrontCategories` + the `?category=` query param), just presented as tabs instead of pills. No new data, no new schema.

### 10. Trust badge strip — excluded entirely.

### 11. Footer — Categories column only, for now

Decided 2026-08-18: a single Categories column, populated with the merchant's best-selling categories (reusing the same best-seller aggregation as section 5, rolled up by category rather than by product). Shop, Company, and Policy & Info — all cut for now; they assumed pages (About, Contact, FAQs, Shipping, Returns, Terms, Warranty, Support) that don't exist and haven't been decided worth building. The owner has flagged that a footer with only one populated column likely won't look good as-is — layout is explicitly left to be figured out during the build, not solved here.

---

## New schema/data dependencies, gathered in one place

Everything the sections above need that doesn't exist yet, so it's visible as one list rather than scattered:

| Need | Used by | Status |
| --- | --- | --- |
| Hero headline / subheading / image on `MerchantStorefront` | Section 2 | Needed for v1 if hero is kept as scoped |
| Mid-page banner headline / subheading / image on `MerchantStorefront` — a second, independent set of fields from the hero's | Section 8 | Needed for v1, decided 2026-08-18 |
| Compare-at/original price on `ProductVariant` | Deferred (promo banners, next version) | Not needed for this phase — nothing in v1 depends on it |
| Category image | Section 4 | None needed — auto-derived from product photos for v1, decided 2026-08-19 |
| `isFeatured` boolean on `Product` + dashboard toggle UI | Section 7 | Needed for v1, decided 2026-08-19 |
| Banner image / config storage | Deferred (promo banners, next version) | Not needed for this phase |
| Best-selling categories rollup (categories ranked by units sold, not just products) | Section 11 (footer) | New query, but built the same way as the existing `getBestSellers` aggregation |

---

## Explicitly not addressed here

Anything already ruled out in the reference doc (account icon, ratings, partner logos, badge pills, trust badges) — not revisited. Promo banners and discounts (section 6) — deferred to the next version, not addressed in this phase at all. The footer's final visual layout (section 11) — deliberately left for build time, once it's clear how a single-column footer actually looks.
