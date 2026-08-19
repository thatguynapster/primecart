# Storefront redesign — UI reference notes

**Status: reference notes only, no code written, nothing built.** Catalogs the features present in the reference image (`86131e5d962e44aced887509c9c45055.webp`, a template called "Lumixio" — electronics-only) so the actual redesign work can be scoped against it deliberately, rather than copied wholesale. Raised 2026-08-17: the owner wants the storefront reworked now that the dashboard is deployed, and flagged upfront that it must work for **jewellery, electronics, and clothing** sellers, not just electronics — the reference is single-category and needs to be read with that translation in mind throughout.

---

## Section-by-section inventory

### 1. Header / nav
- Text logo, left
- Nav links are literal category names: Home, Headphones, Earphones, Speakers
- Search icon
- Account icon
- **No cart icon in the header** — worth confirming that's intentional in the source template before assuming it belongs in ours; PrimeCart's storefront currently always shows a cart link

### 2. Hero
- Full-width banner, lifestyle photograph (model wearing the product) over a solid brand-colour background
- Star rating + review count + "Trustpilot"-style badge (social proof)
- Large headline, short subheading paragraph
- One primary CTA button ("Explore Products →")

### 3. Partner/brand logo strip
- Row of grayscale logos (Walmart, Electronic Arts, Sony, LG, IBM, General Electric, Samsung) directly under the hero
- Reads as "as seen with" / distributor credibility — the kind of thing a multi-brand retailer shows, not obviously something an individual small merchant has

### 4. "Most Popular Categories"
- Centered section heading
- Horizontal row of category tiles: full-bleed photo, label overlaid at the bottom edge
- Categories shown: Speakers, Earbuds, Projector, Air Purifier, (one more cut off) — clearly scrolls further

### 5. "Best Seller Products"
- Section heading + "View all Product →" link, same row
- 4-column product grid. Card anatomy (this repeats in every product grid on the page):
  - Corner badge pill: **NEW** / **BEST** / **TRENDING** / **SALE 29%** — one badge type per card, not combined
  - Product photo
  - Add-to-cart icon, bottom-right of the image (corrected 2026-08-19 — first catalogued as a bookmark/wishlist icon; re-read confirms it's add-to-cart)
  - Small category eyebrow text above the name (e.g. "Headphones")
  - Product name
  - Price, with a struck-through original price shown next to it when the card is on sale

### 6. Promo banner pair
- Two side-by-side lifestyle-photo banners
- Each: "Today's Best Deal" eyebrow tag, bold headline naming a category ("All Smart Watches", "Premium Earbuds"), a discount callout ("Up to 25% Off!"), "Shop now →" button

### 7. "Our Featured Collection"
- Same heading + "View all" pattern as Best Sellers
- 4×2 product grid, identical card anatomy to section 5

### 8. Full-width lifestyle banner
- Dark, moody full-bleed photo (different product context — VR headset)
- Small eyebrow line, large headline, one CTA button
- Functions as a second hero, roughly mid-page

### 9. "New Arrival Products"
- Centered heading
- **In-page category filter tabs**: All Product / HeadPhones / Projector / Accessories — client-side filtering of the grid below, not a navigation
- 4-column product grid, same card anatomy again

### 10. Trust badge strip
- Three items, icon + short text: free shipping, money-back guarantee, 30-day return policy

### 11. Footer
- Brand name + one-line tagline
- Social icons (Facebook, Instagram, LinkedIn)
- Four link columns: Categories, Shop, Company, Policy & Info — each assumes several static pages (About, Contact, FAQs, Shipping Policy, Returns, Terms, Warranty, Support…)
- Oversized faded wordmark as a background decoration
- Copyright line + payment-method icons (Visa, Mastercard, etc.)

---

## Recurring pattern across the page

The product card is the one component that repeats everywhere (sections 5, 7, 9) — badge, photo, add-to-cart icon, category eyebrow, name, price with optional strike-through. Whatever the redesign lands on for this one component determines most of the page's visual identity.

---

## Where "electronics-only" shows through — needs a translation decision per point, not a copy-paste

These are the specific spots where the reference assumes a single category (or a bigger business than PrimeCart's target merchant) and would need a deliberate call before building:

| Reference feature | Why it doesn't translate as-is | What it depends on |
| --- | --- | --- |
| Nav links as literal category names (Headphones, Earphones, Speakers) | A jewellery seller's categories are Rings/Necklaces/Earrings; a clothing seller's are completely different again | Must be driven by each merchant's actual `Product.category` values, never hardcoded |
| "Most Popular Categories" tiles | Same — the five categories shown are electronics-specific | Same, data-driven per merchant |
| Badge system: NEW / BEST / TRENDING / SALE % | No existing PrimeCart concept decides any of these today | "NEW" needs a recency rule; "BEST"/"TRENDING" could reuse the dashboard's existing best-seller aggregation; "SALE %" needs a compare-at/original price, which `ProductVariant` doesn't have a field for yet |
| Add-to-cart icon on the card (corrected 2026-08-19 — not a wishlist/bookmark icon as first catalogued) | Doesn't need a scope decision — no accounts required, since it's an add-to-cart action against the same cart PrimeCart's guest checkout already uses | Kept — needs the card to add a sellable variant to the cart directly from the grid, without a page navigation |
| Hero social proof (star rating, review count, Trustpilot badge) | No reviews/ratings feature exists anywhere in the schema | New scope if wanted, or omit for v1 |
| Partner/brand logo strip | Doesn't map to an individual small merchant at all — this is a big-retailer pattern | Likely skip entirely, or repurpose the space for something merchant-relevant (e.g. payment method badges, a WhatsApp contact link) |
| Promo banners naming specific categories/deals | Needs a "featured" or "on sale" flag on products/collections to point at | No such flag exists on `Product` today |
| Footer link columns (Company, Policy & Info) | Assumes About/Contact/FAQ/Shipping/Returns/Terms/Warranty pages | None of these pages exist; would be new scope, and largely the same content for every merchant rather than per-merchant |
| Trust badges (free shipping, money-back, 30-day returns) | These are specific promises — not necessarily true for every Ghanaian merchant on the platform | Would need to be merchant-configurable copy, not fixed marketing claims baked into the template |

---

## What already exists in PrimeCart that this reference doesn't show

Worth keeping in view so the redesign doesn't accidentally regress something already working:
- Guest checkout flow (no accounts) — the reference's account icon implies accounts exist and is excluded for that reason; its add-to-cart icon doesn't have this problem
- Variant selection with an option-aware photo gallery (Phase 8/DEV-5) — the reference's product cards don't show variants at the grid level, only on a presumed detail page we haven't seen in this image
- Live stock-aware cart reconciliation (flags sold-out/short-stock/re-priced lines before checkout)
- Merchant branding via logo, business name, and a single primary colour applied through CSS variables — the reference's whole palette is fixed to one brand (Lumixio's blue/black), which won't work once every merchant needs their own colour to still look coherent against this layout

---

## Decided 2026-08-17 by the owner — excluded from the storefront, for sure

| Feature | Section it came from |
| --- | --- |
| Account icon | Header |
| Star rating + review count / Trustpilot-style badge | Hero |
| Partner/brand logo strip | Section 3 |
| Product card badge pill (NEW / BEST / TRENDING / SALE %) | Every product grid — not relevant now |
| Trust badge strip (free shipping / money-back / 30-day returns) | Section 10 |

Each of these was already flagged above as not translating cleanly to an individual small merchant — this makes it final rather than an open question.

**Correction 2026-08-19:** "Wishlist/bookmark icon" was on this list originally, but a re-read of the product card icon shows it's actually an **add-to-cart** icon, not a wishlist/bookmark one — it never belonged on an exclusion list built around "no shopper accounts." It's kept; see the product-card icon row above and `STOREFRONT_REDESIGN_SPEC.md`'s product card treatment.

---

## Promo banners — deferred to the next version, not this redesign

Reversed 2026-08-17: initially kept, now taken out of this pass. Discounts are a confirmed real requirement, but they'll be planned properly as their own piece of work rather than half-solved as a side effect of the storefront redesign. Keeping the problem statement here so it isn't lost before that planning happens:

- **Content coupling.** The reference's banners each name one specific category/deal ("All Smart Watches", "Up to 25% Off!") over a matching lifestyle photo. That pairing is easy when the template is built for one category; a cross-category version needs the banner's photo, headline, and discount to come from *whatever this merchant actually sells*, not a fixed electronics example.
- **Photography.** The reference uses styled lifestyle photography (a model wearing/using the product). These are small Ghanaian merchants uploading their own product photos — there's no existing concept of a separate "banner image," only per-product photos. Whether a banner reuses an existing product photo, or gets its own dedicated upload, is unresolved.
- **The discount mechanic itself.** "Up to 25% Off!" only means something if there's a real sale/discount concept behind it — `ProductVariant` has no compare-at/original price field today. This is the core of what the next version needs to plan: how discounts actually work in the schema, before any UI (banner or otherwise) can announce one truthfully.
- **Who configures a banner, and how.** Manual (merchant picks photo/headline/discount/link target via settings) vs. automatic (derived from whichever category/products currently have a discount applied) — undecided, and depends on how discounts themselves end up modelled.

---

## Footer link columns — decided 2026-08-18: Categories only, for now

Of the reference's four columns (Categories, Shop, Company, Policy & Info), only **Categories** survives, populated with the merchant's best-selling categories rather than a static list. Shop, Company, and Policy & Info are cut — they assumed either a full product-list page or static pages (About, Contact, FAQs, Shipping Policy, Returns, Terms, Warranty, Support) that don't exist today and aren't being built for this. The owner has already flagged that a footer with just one populated column probably won't look good as drafted — the actual visual layout is deliberately left open until build time rather than guessed at now.

---

## Category tiles and Featured Collection — decided 2026-08-19

- **Category tile images**: auto-derived from the category's first/newest product photo for v1. A merchant-assigned image per category is real functionality, but deferred to a later version rather than built now.
- **Featured Collection**: a new `isFeatured` boolean flag on `Product`, toggled by the merchant, drives the section — not auto-derived from sales or category.

Nothing left open in this doc; remaining open items are tracked in `STOREFRONT_REDESIGN_SPEC.md` and `TASKS.md` Phase 14.
