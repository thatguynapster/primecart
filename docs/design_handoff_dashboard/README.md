# Handoff: PrimeCart merchant dashboard redesign

## Overview

A visual redesign of the PrimeCart merchant dashboard (Next.js 16 App Router, Tailwind + shadcn/ui, Clerk, Prisma/MongoDB). It covers the authenticated merchant shell — collapsible side rail, sticky top bar — and five sections: Overview, Orders (list + detail drawer), Products, Customers, Analytics.

Nothing about the data model, server actions, or routing changes. This is a presentation-layer redesign: keep the existing `merchantId`-scoped queries, server actions, and Paystack/Clerk wiring, and re-skin the UI.

## About the design files

`PrimeCart Dashboard.dc.html` is a **design reference created in HTML** — a prototype showing intended look and behaviour, not production code to copy. Recreate it in the existing Next.js codebase using Tailwind + shadcn/ui and the project's established patterns (server components for data, client components for the interactive shell). Do not port the prototype's runtime (`support.js`) into the app; it exists only so the HTML file opens in a browser.

Open the file directly in a browser to interact with it: collapse the rail, switch sections (watch the skeletons), scroll the orders table to the bottom (infinite load), click any order row (detail drawer).

## Fidelity

**High fidelity.** Colours, type sizes, spacing, radii and states are final and should be matched closely. All values come from the Nocturne design system tokens in `_ds/nocturne-.../styles.css` — port those tokens into `globals.css` / the Tailwind theme rather than hard-coding hexes.

---

## Design tokens

Source of truth: `_ds/nocturne-9085b916-1818-4662-afe0-d0f74d8dde74/styles.css`. The dashboard uses this subset.

**Colour**

| Token | Value | Used for |
| --- | --- | --- |
| `--color-bg` | `#161826` | Page ground, drawer ground |
| `--color-surface` | `#232532` | Cards, table body, inputs |
| `--color-neutral-900` | `#292b31` | Side rail, table header row |
| `--color-neutral-800` | `#3f424d` | All 1px borders and row rules, bar-track fills |
| `--color-neutral-700` | `#595d6c` | Avatar rings, muted bars |
| `--color-neutral-600` | `#75798c` | Tertiary text (timestamps, units) |
| `--color-neutral-500` | `#9397ab` | Label text, uppercase kickers |
| `--color-neutral-400` | `#b2b6ca` | Inactive nav labels, secondary body |
| `--color-neutral-300` | `#cfd3e5` | Primary-ish body text in dense lists |
| `--color-neutral-200` | `#e4e7f5` | Table cell emphasis |
| `--color-text` | `#e9e9ed` | Headings, values |
| `--color-accent` | `#9184d9` | Active nav mark, live-feed dot, timeline dots, focus ring |
| `--color-accent-500` | `#968ae0` | Chart bars (latest / primary series) |
| `--color-accent-600` | `#796cbf` | Active saved-view border |
| `--color-accent-700` | `#5d5294` | Badge and avatar borders on tints |
| `--color-accent-800` | `#423a6a` | Secondary chart bars |
| `--color-accent-900` | `#2b2741` | Active nav background, active saved-view background |
| `--color-accent-300` | `#d2cefd` | Accent text at body size (never `--color-accent` for small text) |

Never flood an area with the accent — it appears as a 1px border, a 2px inset mark, a small dot, or a chart bar.

**Type** — Inter, 400/500/600. Headings are weight 500, letter-spacing `-0.015em` to `-0.03em` (tighter as size grows). Never bolder than 500 for headings.

| Role | Size / weight |
| --- | --- |
| Page title (top bar) | 18px / 500 / `-0.015em` |
| Page subtitle | 12px / 400 / `--color-neutral-500` |
| KPI value | 26px / 500 / `-0.02em` (analytics KPIs 24px) |
| Card heading (`h4`) | 16px / 500 |
| Drawer order number | 20px / 500 |
| Body / table cell | 13px |
| Nav item | 13.5px |
| Uppercase label / column head | 10.5px, letter-spacing `0.08em`, uppercase, weight 500 |
| Micro text (timestamps) | 11–12px |

**Spacing** — density 0.7×. Card padding 14–20px; card grid gap 14px; section stack gap 16px; page padding `20px 24px 40px`; top bar padding `12px 24px`; table cell padding `11px 16px` (header `9px 16px`).

**Radius** — `--radius-sm` 4px (status pills, chart bars, small squares), `--radius-md` 8px (cards, buttons, inputs, nav items), `--radius-lg` 14px (unused in the dashboard), 999px only for progress-bar tracks and circular avatars.

**Elevation** — `--shadow-lg` (`0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,0.65)`) on the drawer only. Everywhere else elevation is a 1px `--color-neutral-800` border. Do not stack shadows.

**Icons** — Phosphor icons. The prototype inlines 16px stroked SVGs as a stand-in; use `@phosphor-icons/react` in the app.

---

## Layout shell

CSS grid, two columns: `[rail] 1fr`. Full viewport height.

### Side rail (collapsible)

- Expanded **216px**, collapsed **64px**. Width transition is instant in the prototype; a 150ms ease is fine.
- Background `--color-neutral-900`, `border-right: 1px solid --color-neutral-800`, padding `16px 10px`, `position: sticky; top: 0; height: 100vh; overflow: hidden`.
- **Brand**: 26px square, `--radius-sm`, 1px `--color-accent` border, accent-300 "P" glyph; wordmark "PrimeCart" 15px/500 — hidden when collapsed.
- **Nav items** (Overview, Orders, Products, Customers, Analytics): full-width button, `8px 10px`, `--radius-md`, gap 11px, 17px icon slot, 13.5px label.
  - Inactive: transparent background, `--color-neutral-400` text.
  - Active: background `--color-accent-900`, text `--color-accent-200`, plus `box-shadow: inset 2px 0 0 0 var(--color-accent)` as the left mark.
  - Hover: `--color-accent-900` at ~50% (use a `color-mix` or `bg-accent-900/50`).
  - Orders carries a count badge: 10.5px, 1px `--color-accent-700` border, accent-300 text, `--radius-sm`, `0 6px`. Wire it to the count of orders needing action.
- **Trial card** (expanded only): 1px `--color-neutral-800` border, `--radius-md`, 11px padding; uppercase "Trial" label, 12.5px copy ("17 days left on your free trial." — compute from `merchant.trialExpiresAt`), `.btn-primary` block button "Subscribe" → `/billing`.
- **Collapse toggle** at the bottom: chevron + "Collapse panel", 12.5px, `--color-neutral-500`. Collapsed state shows only the chevron (pointing right) and every label is hidden; keep `title` attributes for tooltips.

### Top bar

Sticky, `z-30`, `12px 24px`, `background: color-mix(in srgb, var(--color-bg) 90%, transparent)`, `backdrop-filter: blur(10px)`, bottom border `--color-neutral-800`.

Left: section title + subtitle (per-section copy below). Right, in order: search input (300px, surface fill, 1px border, `--radius-md`, magnifier icon, placeholder "Search orders, products, customers"), `.btn-secondary` "Last 30 days" date-range control, `.btn-primary` "New order" (opens the manual-order flow), 30px circular avatar with 1px `--color-neutral-700` ring and initials.

Section titles / subtitles:

| Section | Title | Subtitle |
| --- | --- | --- |
| Overview | `Good morning, {firstName}` | `{storeName} · {subdomain}.primecart.app` |
| Orders | Orders | `{n} orders in this view` |
| Products | Products | `{active} active · {low} low on stock` |
| Customers | Customers | `{n} people have bought from you` |
| Analytics | Analytics | Last 12 months |

---

## Screens

### 1. Overview

Vertical stack, gap 16px.

1. **KPI row** — 4 equal columns, gap 14px. Each card: surface fill, 1px border, `--radius-md`, `14px 16px`, column flex gap 6px. Uppercase label (10.5px, neutral-500) → value (26px/500) → delta (12px). Deltas that are neutral use `--color-neutral-400`; deltas that want attention (a fall, low stock) use `--color-accent-300`. Cards: Revenue 30 days, Orders, Average order, Stock value.
2. **Chart + live feed** — grid `1.6fr 1fr`, gap 14px, `align-items: start`.
   - *Sales, last 14 days*: card heading + right-aligned total (12px, neutral-500). Bars: flex row, `align-items: flex-end`, gap 8px, container height 200px; each bar full column width, `--radius-sm`, height = `value/max × 180px`; latest bar `--color-accent-500`, the rest `--color-accent-800`; day label 10px neutral-600 beneath.
   - *Live orders*: heading row with a 7px accent dot pulsing (`box-shadow` ring 0 → 8px, 2s infinite) and a right-aligned "Storefront" label. Rows separated by 1px top borders, each `9px 0`: 28px circular avatar (1px accent-700 border, accent-300 initials), item name (13px, truncated), `{customer} · {relative time}` (11px neutral-600), amount right (13px/500). New rows animate in: `opacity 0→1, translateY(-5px)→0, 0.35s ease`. In production, poll or subscribe and prepend; cap at 5 rows.
3. **Best sellers + Low stock** — two equal cards, gap 14px.
   - *Best sellers*: rows of `name (150px, truncated) | 6px progress track (--color-neutral-800, 999px) with --color-accent-500 fill | "{n} sold" right (78px, neutral-500)`.
   - *Low stock*: heading with "Restock list →" link; rows separated by 1px borders: name, variant (11.5px neutral-600), `.tag.tag-accent` reading "{n} left".

### 2. Orders (list + detail)

1. **Saved views row** — pill buttons: All orders, Unpaid, To fulfil, Storefront only, WhatsApp. Inactive: transparent, 1px `--color-neutral-800`, neutral-400 text. Active: `--color-accent-900` fill, 1px `--color-accent-600`, accent-200 text. `--radius-md`, `5px 12px`, 12.5px. Right side: `.btn-secondary` "Filters · 2" and "Export CSV".
   - Filter semantics: Unpaid → `paymentStatus = UNPAID`; To fulfil → `status IN (CONFIRMED, PROCESSING)`; Storefront only / WhatsApp → `source`.
2. **Table card** — surface fill, 1px border, `--radius-md`, `overflow: hidden`. Inner scroll container `max-height: 560px; overflow: auto`.
   - Header row sticky at `top: 0`, background `--color-neutral-900`, cells 10.5px uppercase neutral-400, weight 500, padding `9px 16px`. Columns: Order, Customer, Channel, Status, Payment, Total (right), Placed (right).
   - Body rows: 1px `--color-neutral-800` top border, cells `11px 16px`, cursor pointer, hover background `--color-neutral-800` at ~35%. Order number weight 500; customer neutral-200; channel neutral-500; total weight 500 right; placed neutral-600 right.
   - Status pill: 11px, `--radius-sm`, `2px 9px`, 1px border, no fill. Delivered → neutral-700 border / neutral-300 text. Pending → neutral-800 / neutral-500. Confirmed, Processing, Shipped → accent-700 / accent-300.
   - Payment: "Paid" neutral-300, "Unpaid" accent-300.
   - **Infinite scroll**: 14 rows initially; when the container is within 90px of the bottom, show three 42px shimmer rows for ~700ms, then append 12 more. In production use an IntersectionObserver sentinel + a cursor-paginated server action (`createdAt` desc, `merchantId` first).
   - Footer strip inside the card: 1px top border, `9px 16px`, 12px neutral-600, "Showing {n} of {total} orders — scroll for more".
3. **Order detail drawer** — opens on row click. Backdrop `rgba(0,0,0,0.55)`, `z-60`, click to dismiss. Panel: fixed right, **440px**, full height, `--color-bg` ground, `border-left: 1px solid --color-neutral-700`, `--shadow-lg`, `z-61`, column flex.
   - Header: order number (20px/500), `{customer} · {relative time}` (12px neutral-500), `.btn-secondary.btn-icon` close.
   - Body (scrolls): status + channel tags; **Items** list (30px `--radius-sm` quantity square with 1px neutral-800 border, name 13px, variant 11px neutral-600, line total 13px/500) with a Total row (17px/500); **Timeline** (6px accent dot, event 13px, timestamp 11px neutral-600) — placed, payment (or "Awaiting payment — reserved 30 min" while `reservedUntil` is set), stock reserved; **Delivery** paragraph from `shippingAddress`.
   - Footer: 1px top border, two equal buttons — `.btn-secondary` "Print receipt", `.btn-primary` "Mark fulfilled".
   - The drawer must close when the section changes (a stale drawer over a different section is a bug we already hit).

### 3. Products

Filter row: `.tag.tag-accent` "All {n}", `.tag.tag-outline` "Low stock {n}", `.tag.tag-outline` "Archived {n}"; right: `.btn-secondary` "Import CSV", `.btn-primary` "Add product".

Card grid, 3 columns, gap 14px. Each card: surface, 1px border, `--radius-md`, 13px padding, row flex gap 13px.
- 66px square thumbnail slot, `--radius-md`, 1px border, centred 17px/500 initials — replace with the product's first R2 image when present; keep the initials tile as the empty state (border `--color-accent-700` + accent-300 text when the product is low on stock, otherwise neutral-800 + neutral-500).
- Right column: name (14px, truncated) + price (13.5px/500) on one baseline; meta line "{n} variants · {category}" (11.5px neutral-600); 5px stock bar (track neutral-800, fill `--color-accent-500` when low, `--color-neutral-600` otherwise, 999px); status line 11.5px — "{n} units left — restock" in accent-300 when at or below `lowStockThreshold`, otherwise "{n} units in stock" in neutral-600.
- Card click → product edit page.

### 4. Customers

Single table card (same header/row treatment as Orders, non-sticky header). Columns: Customer (28px circular initials avatar with 1px neutral-700 ring + name), Contact (neutral-500), Orders (right), Spent (right, weight 500), Last order (right, neutral-600). Rows are not clickable in the prototype; linking to a customer's order history is the obvious next step.

### 5. Analytics

1. KPI row of 4 (same card as Overview, value 24px, delta always neutral-500): Revenue 12 months, Orders, Repeat rate, Refunds.
2. *Revenue by month* card: 12 bars, container height 230px, bar height = `value/max × 210px`, gap 12px, `--radius-sm`; the peak month is `--color-accent-500`, the rest `--color-neutral-700`; month initial label 10.5px neutral-600.
3. Two cards side by side: *Where orders come from* (name 110px, 6px progress track, percentage right 42px — Storefront accent-500, Manual neutral-600, WhatsApp neutral-700) and *Stock value by category* (rows with 1px top borders: category, "{n} units" neutral-600, value 13.5px/500).

All reporting figures come from MongoDB aggregation pipelines per the handoff doc, not `findMany`.

---

## Interactions & behaviour

| Behaviour | Detail |
| --- | --- |
| Section switch | Sets the section, shows a skeleton for ~650ms, then content. In Next.js this becomes real `loading.tsx` / Suspense boundaries per route segment — keep the shimmer treatment. |
| Skeletons | `linear-gradient(90deg, surface 0%, neutral-800 45%, surface 85%)`, `background-size: 320px 100%`, `pc-shimmer 1.15s linear infinite` sliding `-320px → 320px`. Overview skeleton: 4 × 96px cards, one 300px block, one 200px block. Table skeleton: three 42px rows. |
| Infinite scroll | See Orders above. |
| Live feed | New row animation `pc-in 0.35s ease`; the pulse ring on the dot is `pc-pulse 2s infinite`. |
| Rail collapse | Persist the collapsed flag (localStorage or a user preference) so it survives navigation. |
| Focus | `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }` — never the browser default. |
| Hover | Every interactive element gets a tint one step into the accent ramp (`--color-accent-400`-ish on this dark ground) or a `color-mix` tint for outlined and ghost variants. |
| Mobile | Not designed yet. The intended pattern: rail becomes an off-canvas drawer behind a hamburger, KPI grid → 2 columns then 1, tables → stacked cards, the order drawer → a full-screen sheet. |

## State

Client state in the shell only: `section` (routing owns this in the app — use the URL, not local state), `railCollapsed`, `loading`/`loadingMore`, `visibleCount` (or a pagination cursor), `savedView` (put it in the query string so views are linkable), `selectedOrder` (the drawer; also a good candidate for a route — `/dashboard/orders/[id]` with an intercepting route renders the drawer over the list).

Server data per section: KPI aggregates, 14-day sales series, live order feed, best sellers, low-stock list, paginated orders, product list with variant stock, customer list with order counts and lifetime spend, 12-month revenue series, channel split, stock value by category. All scoped by `merchantId` from the Clerk session, first in every filter.

## Assets

None. The prototype uses no images — icons are inline SVG stand-ins for Phosphor, and product thumbnails are initials tiles until R2 images exist. Fonts: Inter (400/500/600) via Google Fonts, already imported at the top of `styles.css`.

## Files in this bundle

- `PrimeCart Dashboard.dc.html` — the design reference. Open in a browser to interact.
- `support.js` — runtime needed only to render that HTML file. Do not port it.
- `_ds/nocturne-9085b916-1818-4662-afe0-d0f74d8dde74/styles.css` — the Nocturne token sheet and component classes (`.btn`, `.tag`, `.input`, `.card`, `.table`). **Port these tokens into the app.**
- `_ds/nocturne-9085b916-1818-4662-afe0-d0f74d8dde74/readme.md` — the design system's own guide: colour ramps, type, interaction states, dos and don'ts.
- `_ds/nocturne-9085b916-1818-4662-afe0-d0f74d8dde74/_ds_bundle.js` — component bundle used by the prototype runtime.

## Not covered by this design

These dashboard surfaces exist in the app but have no redesigned screen yet: product create/edit form, manual order creation, settings (storefront branding, subdomain, Paystack), billing and subscription, onboarding, sign-in/sign-up, the store-unavailable page, and all mobile breakpoints. Follow the same shell, tokens and density when building them, or ask for designs first.
