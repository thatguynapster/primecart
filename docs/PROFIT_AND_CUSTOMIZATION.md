# Profit Tracking & Product Customization — Implementation Spec

**Status:** approved. Owner signed off on DEV-6 and DEV-7, and locked in the open decisions below, on 2026-10-03. Tracked as Phase 15 in `TASKS.md`.
**Date:** 2026-09-27 (approved 2026-10-03)
**Constraint:** no existing product, order, cart, checkout, webhook, or report may break. Every schema change is additive and optional.

---

## 0. Corrections to the original brief (read first)

| Brief said | Problem | This spec does instead |
| --- | --- | --- |
| Add cost price **to the product** | Price and stock live on the embedded `ProductVariant`, not `Product`. A 14k ring and an 18k ring have different costs. A product-level cost can't describe that. | `costPrice Float?` on **`ProductVariant`** |
| Profit = sale price − current cost | Merchants change costs. Reading today's cost for last month's sales rewrites history. It also breaks the existing snapshot rule on `OrderLineItem` ("never read live product data from a historical order"). | Snapshot `costPrice` onto `OrderLineItem` at order time |
| Cost defaults to 0 | A 0 default makes every existing product show a 100% margin. That number looks plausible and is wrong. | `null` = "cost unknown". These items are left out of profit, and the report shows **coverage** (what share of revenue has a known cost) |
| Profit is revenue − cost | Storefront orders lose PrimeCart's 3% fee (capped at GHS 100, D-16). Leaving it out overstates profit on every storefront sale. | Snapshot `platformFee` on `Order` and subtract it |
| `allowCustomization Boolean @default(false)` is enough to avoid breaking existing products | On MongoDB, `@default` is applied by Prisma Client **on create only**. Existing documents don't get the field. Any query filtering `allowCustomization: false` will **not match** them, because the field is missing rather than false. The read behavior of a missing required Boolean is also not verified in this codebase. | Add the field **and** run a one-off backfill before deploy (§3.4) |
| A boolean flag covers customization | A flag alone can't say what to ask ("Name to engrave"?), how long the text can be, whether it's required, or whether it costs extra. Fulfilment also needs the text on the order. | Flag plus four flat config fields on `Product`, and snapshot fields on `OrderLineItem` |

**Security issue found while scoping, in the current code:** `src/app/store/[subdomain]/products/[productId]/page.tsx` passes whole Prisma `Product` / `ProductVariant` objects to the client component `ProductBuy`. Everything on those objects is serialized into the page's RSC payload, where any shopper can see it in page source. Today that exposes `lowStockThreshold` and `lowStockAlertedAt`, which is minor. **With `costPrice` added it would expose every merchant's margins to their customers and competitors.** §2.5 is a hard prerequisite of Part A, not a nice-to-have.

---

## Part A — Cost price & profit tracking

### A.1 Schema (`prisma/schema.prisma`)

```prisma
type ProductVariant {
  // ...existing fields unchanged...

  // DEV-6. What the merchant paid for one unit. Optional: null means
  // "unknown", which is NOT the same as 0. Unknown-cost sales are left out of
  // profit and counted in the coverage figure. Never sent to the storefront (see §2.5).
  costPrice Float?
}

type OrderLineItem {
  // ...existing fields unchanged...

  // DEV-6 snapshot, copied from the variant at order time. Null on every order
  // placed before this shipped, and on any line whose variant had no cost.
  costPrice Float?
}

model Order {
  // ...existing fields unchanged...

  // DEV-6. PrimeCart's cut on this order, in GHS, at the rate/cap in force
  // when it was placed. 0 for MANUAL/WHATSAPP orders. Null only on storefront
  // orders created before this field existed (see A.5 for the fallback).
  platformFee Float?
}
```

Why every field is optional:
- `ProductVariant` and `OrderLineItem` are embedded. A missing optional field reads back as `null`. The codebase already relies on this and verified it for `imageUrls` (see `variantImages()`).
- A default of 0 would be an actual lie in the data (see §0).
- No backfill is needed for Part A.

Run `npm run db:push`, **not** a raw `npx prisma db push`. The raw command drops the manual `storefront.subdomain` / `customDomain` indexes (changelog 2026-08-14 and 2026-08-19). Restart the dev server after `prisma generate` (TASKS.md line ~328).

### A.2 Variant writes (`src/lib/products/variants.ts`)

- `VariantInput` gets `costPrice?: number | null`.
- `buildVariant()` always writes `costPrice: input.costPrice ?? null`, the same "always write it" rule `imageUrls` follows.
- `updateVariant()` gets one more branch:
  ```ts
  if (fields.costPrice !== undefined) set["variants.$[v].costPrice"] = fields.costPrice;
  ```
  It goes through `runEmbeddedUpdate` like every other embedded write. No new raw calls.

### A.3 Dashboard product form (`dashboard/products/actions.ts`, `components/dashboard/variant-fields.tsx`)

`parseVariantFields()`:
```ts
const costRaw = String(formData.get("costPrice") ?? "").trim();
const costPrice = costRaw === "" ? null : Number(costRaw);
if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
  fieldErrors.costPrice = "Enter a cost of 0 or more, or leave it blank.";
}
```
- Empty field means `null`. Leaving the field blank must never be stored as 0.
- **Don't block `costPrice > price`.** Selling below cost is sometimes deliberate (clearance, loss leader). Show a non-blocking warning in the form instead.
- UI: an optional "Cost price (what you paid)" field under Price, with a live margin hint (`GHS 40 profit · 33%`) once both are filled.
- `createProduct`, `createVariant`, and `editVariant` pass it through. `editVariant` already calls `updateVariant` with the parsed fields, so it only needs `costPrice: variant.costPrice` added.

### A.4 Snapshot at order time (three call sites)

Each place that builds `lineItems` also copies the cost:

| File | Change |
| --- | --- |
| `src/app/store/[subdomain]/cart/actions.ts` (`checkout`) | add `costPrice: variant.costPrice ?? null` to `matched` and `lineItems`. Set `platformFee` on `order.create` (below) |
| `src/app/(app)/dashboard/orders/actions.ts` (`createManualOrder`) | add `costPrice: variant.costPrice ?? null` to `lineItems`. Set `platformFee: 0` |
| `src/app/api/webhooks/paystack/route.ts` | **no change.** It reads existing `lineItems` for stock only |

Platform fee at checkout. Move the computation out of `initializeTransaction` into an exported helper in `src/lib/paystack.ts`, so the order and Paystack can never disagree:
```ts
export function storefrontFeePesewas(amountInPesewas: number): number {
  return Math.min(Math.round(amountInPesewas * STOREFRONT_FEE_RATE), STOREFRONT_FEE_CAP_PESEWAS);
}
```
`initializeTransaction` uses it for `transaction_charge`. `checkout` stores `platformFee: storefrontFeePesewas(Math.round(subtotal * 100)) / 100`.

### A.5 Reporting (`src/lib/dashboard/queries.ts`)

New `getProfitSummary(merchantId, sinceDate)`. It uses the same `aggregate()` helper and the same **`paymentStatus: "PAID"`** filter the revenue KPIs use. REFUNDED and unpaid orders are excluded automatically, so profit and revenue always describe the same set of orders.

```js
[
  { $match: { merchantId: oid(merchantId), paymentStatus: "PAID", createdAt: { $gte: since } } },
  // Order-level fee first, before $unwind multiplies orders into lines.
  { $set: { fee: { $ifNull: ["$platformFee",
      { $cond: [{ $eq: ["$source", "STOREFRONT"] },
                { $min: [{ $multiply: ["$total", 0.03] }, 100] }, 0] }] } } },
  { $facet: {
      fees: [{ $group: { _id: null, fees: { $sum: "$fee" } } }],
      lines: [
        { $unwind: "$lineItems" },
        { $group: {
            _id: null,
            revenue:        { $sum: "$lineItems.subtotal" },
            costedRevenue:  { $sum: { $cond: [{ $ne: [{ $ifNull: ["$lineItems.costPrice", null] }, null] }, "$lineItems.subtotal", 0] } },
            cost:           { $sum: { $multiply: [{ $ifNull: ["$lineItems.costPrice", 0] }, "$lineItems.quantity"] } },
        } },
      ],
  } },
]
```
Output:
```ts
type ProfitSummary = {
  revenue: number;          // all paid line revenue
  costedRevenue: number;    // revenue from lines with a known cost
  cost: number;             // cost of those lines only
  grossProfit: number;      // costedRevenue − cost
  platformFees: number;     // PrimeCart's cut across all paid orders
  netProfit: number;        // grossProfit − platformFees  (see note)
  coverage: number;         // costedRevenue / revenue, 0..1
};
```
Notes:
- **Fee fallback:** the `$ifNull` recomputes the fee for storefront orders placed before `platformFee` existed. It uses the current rule, which is correct for every order since D-16. Pre-D-16 orders had no cap, so they may be off by the capped amount. That's acceptable; say so in the code comment.
- **Fees vs coverage:** fees are subtracted in full even when coverage is below 100%. This slightly understates net profit, which is the safer direction. When coverage < 100%, the UI must say so (below).
- A per-product breakdown is the same pipeline with `_id: "$lineItems.productId"`. Group by `productId`, not `productName`, for the reason `bestsellers.ts` gives.
- Bundle profit into the existing `getAnalyticsKpis` `Promise.all` so the analytics page stays one round-trip.

### A.6 UI (`dashboard/analytics/page.tsx`, order detail page)

- Analytics: add a **"Profit 12 months"** KPI next to "Revenue 12 months". When `coverage < 1`, show a sub-line: *"Based on 64% of sales — add cost prices to see the rest"*, linking to products missing a cost. Coverage matters more than the profit number here. Without it a merchant can't tell whether a low profit means low margins or missing data.
- Products list: a small "No cost" badge on variants where `costPrice` is null, so the gap is fixable.
- Order detail (dashboard only): per-line cost and margin when known, plus an order-level profit line. **Never on the storefront order page.**

### A.7 Keep cost off the storefront (hard prerequisite)

Add a public shape in `src/lib/storefront/catalogue.ts` and pass only that to client components:
```ts
export type PublicVariant = Pick<ProductVariant,
  "id" | "name" | "price" | "stock" | "attributes" | "imageUrls">;

export function toPublicVariant(v: ProductVariant): PublicVariant {
  return { id: v.id, name: v.name, price: v.price, stock: v.stock,
           attributes: v.attributes, imageUrls: variantImages(v) };
}
```
- `products/[productId]/page.tsx`: `variants={sellableVariants(product).map(toPublicVariant)}`. Also pass a trimmed product (`id, name, description, images`, plus the customization fields from Part B) instead of the raw Prisma `Product`, because `product.variants` rides along with it.
- `ProductBuy` prop types change to `PublicVariant[]` / the trimmed product type.
- `api/products/route.ts` already maps variants explicitly. Check that the map stays an allowlist.
- `ProductCard` is a server component and `AddToCartIconButton` receives explicit primitives, so neither leaks. Check both again after the change.
- **Verification:** load a product page, view source / RSC payload, and search for `costPrice`. It must not appear.

---

## Part B — Product customization (engraving, names, insignia)

### B.1 Schema

Use flat scalar fields on `Product`, **not** an embedded type. Flat scalars can be written with the typed Prisma client (`updateProductDetails` already uses `updateMany`), so no new `$runCommandRaw` paths are needed.

```prisma
model Product {
  // ...existing fields unchanged...

  // DEV-7. Shopper-supplied personalisation (engraving, a name, an insignia).
  // Off by default. Existing products are backfilled to false (§B.4).
  allowCustomization    Boolean @default(false)
  // Prompt shown to the shopper, e.g. "Name to engrave". Falls back to
  // "Personalisation" when null.
  customizationLabel    String?
  // Hard cap enforced server-side. Null → 30. Max accepted 200.
  customizationMaxLength Int?
  // When true, the product can't be added to the cart without text.
  customizationRequired Boolean @default(false)
  // Flat surcharge per unit when the shopper enters text, in GHS. Null/0 = free.
  customizationFee      Float?
}

type OrderLineItem {
  // ...existing + costPrice from Part A...

  // DEV-7 snapshots. Null on every non-customized line and all historical
  // orders. The label is snapshotted too, so renaming the prompt later
  // doesn't change what an old order says was asked.
  customization      String?
  customizationLabel String?
  customizationFee   Float?
}
```

Pricing rule: `lineItem.price` stays the variant's unit price. `subtotal = (price + (customizationFee ?? 0)) * quantity`. Order totals, the Paystack amount, and the 3% fee all derive from `subtotal`, so they include the surcharge with no other changes.

The fee is **per unit** because each engraved item is separate work. See the cart rule below: in practice a customized line almost always has quantity 1.

### B.2 Cart (`src/lib/storefront/cart.ts`): the change most likely to break things

The cart currently identifies a line **by `variantId`**. `add`, `setQuantity`, `remove`, and the React `key` in `cart-view.tsx` all use it. Two rings of the same variant engraved "Ama" and "Kofi" would **merge into one line with quantity 2, and one name would be lost.**

Change:
```ts
export type CartLine = {
  lineKey: string;            // NEW — variantId + "::" + normalized customization
  productId: string;
  variantId: string;
  customization?: string | null;   // NEW
  customizationFee?: number | null; // NEW, display only
  // ...rest unchanged
};

export function lineKeyOf(variantId: string, customization?: string | null) {
  const text = customization?.trim() ?? "";
  return text ? `${variantId}::${text}` : variantId;   // uncustomized key === old key
}
```
- `add` merges on `lineKey`. The same variant with the same text merges; different text makes a new line.
- `setQuantity(lineKey, …)` and `remove(lineKey)` switch to `lineKey`. So do the call sites in `cart-view.tsx` (the `key`, `setQuantity`, `remove`) and `product-buy.tsx`'s in-cart lookup.
- **Persisted carts:** shoppers have carts in `localStorage` with no `lineKey`. Bump the zustand persist `version` to 1 and add a `migrate` that sets `lineKey = variantId` on every existing line. Because an uncustomized key equals the bare `variantId`, migrated lines behave exactly as before.
- `cartTotal` becomes `sum((price + (customizationFee ?? 0)) * quantity)`. It's still display-only; the server recomputes.

### B.3 Checkout & manual orders (server is the source of truth)

`CheckoutLine` gains `customization?: string`. In `checkout()` (and the same logic in `createManualOrder`), for each line:

```ts
const raw = (line.customization ?? "").normalize("NFC").replace(/[\u0000-\u001F\u007F]/g, "").trim();
if (!product.allowCustomization) {
  if (raw) return { ok: false, error: `${product.name} can't be personalised.` };
} else {
  const max = Math.min(product.customizationMaxLength ?? 30, 200);
  if (product.customizationRequired && !raw) return { ok: false, error: `Add the ${label} for ${product.name}.` };
  if (raw.length > max) return { ok: false, error: `Keep the ${label} under ${max} characters.` };
}
const fee = raw && product.allowCustomization ? (product.customizationFee ?? 0) : 0;
// lineItem: { ...existing, customization: raw || null, customizationLabel: raw ? label : null,
//             customizationFee: raw ? fee : null, subtotal: (variant.price + fee) * qty }
```
- The fee comes from the live product, never from the cart, which matches the existing "nothing from the client is trusted" rule.
- Rejecting (rather than silently dropping) text sent for a non-customizable product surfaces a stale cart instead of losing what the shopper typed.
- The text is stored raw and **must be rendered escaped**. React pages escape it by default, so never use `dangerouslySetInnerHTML` for it. **The Resend emails are not React:** `notifications/events.ts` builds HTML with template strings, so any customization text there needs an explicit `escapeHtml()`. (`customerName` is already interpolated unescaped there today, which is the same bug. Fix both together.)

**Stock, one existing gap this exposes:** `reserveStock` phase 1 checks each line against `variant.stock` separately. Two customized lines of the same variant (qty 1 each, stock 1) both pass phase 1. Phase 2's conditional `$inc` then correctly rejects the second and rolls back, but the shopper sees "That item just sold out", which is confusing. Fix: in phase 1, sum `quantity` by `variantId` before comparing. The phase 2 per-line `$inc` stays as is, and the rollback is unaffected. `restoreStock`, the expiry cron, cancellation, and `settleFromExpired` all work per line already, so they need no change.

### B.4 Backfill for `allowCustomization` and `customizationRequired`

`@default(false)` doesn't touch existing MongoDB documents. Before deploying code that reads or filters these fields, run a one-off script (`scripts/backfill-customization.mjs`, same style as the seed scripts, `node --env-file=.env …`):

```js
await prisma.$runCommandRaw({
  update: "Product",
  updates: [{
    q: { allowCustomization: { $exists: false } },
    u: { $set: { allowCustomization: false, customizationRequired: false } },
    multi: true,
  }],
});
```
It's idempotent (only matches missing fields) and safe to rerun. Run it against `primecart-dev`, verify, then production, **before** the code deploy. No `merchantId` filter is needed: this is a cross-tenant schema migration, not a tenant query.

### B.5 Dashboard UI

- Product detail (`product-editor.tsx` + `updateProductDetails`): a "Let customers personalise this" toggle. When it's on, show: label (placeholder "e.g. Name to engrave"), max characters (default 30), required toggle, and optional extra charge.
- Validation in `updateProductDetails`: label ≤ 40 chars, max length integer between 1 and 200, fee ≥ 0.
- Turning the toggle **off** keeps the config fields (so turning it back on restores them) and doesn't affect existing orders, because the text is snapshotted.
- Manual order form (`new-order-form.tsx`): for lines whose product allows customization, show a text input under the line. `parseLines` gains a parallel `customization` array.

### B.6 Storefront UI (`product-buy.tsx`, `cart-view.tsx`)

- When `allowCustomization` is set, show a text input under the option picker, with the label, a live `n/max` counter, and "+ GHS X" if there's a fee. Mark it required when `customizationRequired` is set, and disable Add to Cart until it's filled.
- The displayed price updates to include the fee once text is entered.
- The cart line shows the text in quotes under the variant name ("Engraving: "Ama""), and the line price includes the fee.
- Add a small note that personalised items can't be edited after ordering. What that means for returns is the merchant's policy, and PrimeCart doesn't enforce it.

### B.7 Fulfilment surfaces (the reason the feature exists)

The text must appear, verbatim and prominent, everywhere someone fulfils or confirms the order:
- Dashboard order detail (`orders/[orderId]/page.tsx`), under each line, with the label.
- Storefront order confirmation (`store/[subdomain]/orders/[orderId]/page.tsx`).
- New-order notification email (`lib/notifications/events.ts` → `notifyNewOrder`). **Verified: it currently sends only order number, customer name and total.** Add a `lines` param and list at least the customized lines (label + escaped text), so the merchant sees what to engrave without opening the dashboard. All three call sites (webhook normal path, `settleFromExpired`, manual mark-paid if applicable) pass `order.lineItems`.

---

## Rollout order

The order matters. Each step is safe to deploy on its own.

1. **A.7: storefront DTO.** Ship alone first. It changes no behavior, removes the existing leak, and makes adding `costPrice` safe.
2. **Schema push** (all new fields, all optional) via `npm run db:push`, then **B.4 backfill** on dev → prod.
3. **Part A** writes + snapshot + `platformFee` + `storefrontFeePesewas` refactor.
4. **Part A** reporting and UI.
5. **Part B** cart (`lineKey` + persist migration) + `reserveStock` aggregation fix. Ship this before the customization input exists, so the migration can be verified with ordinary carts first.
6. **Part B** checkout/manual-order validation, dashboard config, storefront input, fulfilment surfaces.

## Won't-break checklist (verify each before marking done)

- [x] Existing product with no `costPrice` edits and saves; `costPrice` stays null (not 0).
- [x] Existing product without customization fields loads in dashboard and storefront, and `where: { allowCustomization: false }` returns it (post-backfill).
- [x] Storefront product page payload contains no `costPrice`, `lowStockThreshold`, or `lowStockAlertedAt`.
- [x] A cart saved in `localStorage` before the change loads, updates quantity, removes, and checks out.
- [x] Same variant + two different engravings → two cart lines → two order lines, each text preserved. Verified live 2026-10-07: "Alice" qty 2 + "Bob" qty 1 → order PC-261007-ODNL with two distinct `lineItems`, each customization intact.
- [x] Same variant + identical engraving → one line, quantity merged. Verified live 2026-10-07: adding "Alice" twice produced one cart line at qty 2, not two.
- [x] Two customized lines of a variant with stock 1 → clear "only 1 available" message, no stock change. Verified live 2026-10-07: "One" + "Two" engravings on a stock-1 variant → checkout blocked with "Sorry, only 1 of Phase15 Custom Race (Standard) available.", stock and order both untouched.
- [x] Customization text sent for a non-customizable product → rejected, stock untouched. Verified live 2026-10-07 by forging `customization` into a persisted cart line via localStorage (bypassing the UI, which never shows the field for this product) — `checkout()` rejected with "Solitaire Ring can't be personalised.", no order created, stock unchanged.
- [x] Paystack amount == order total including surcharges; `transaction_charge` == stored `platformFee` × 100. Covered by the shared `storefrontFeePesewas` helper (task 15.4) and the live Paystack test-mode checkouts run this session, all of which settled without an amount-mismatch rejection.
- [x] Late-payment path (`settleFromExpired`), expiry cron, and cancel all restore stock correctly for customized lines. Verified live 2026-10-07: cancelling a two-line customized order (qty 2 + qty 1) restored stock 7 → 10 exactly. `expireOrder` and `settleFromExpired` call the identical `restoreStock`/`reserveStock` functions per line (see `src/lib/orders/expire.ts` and `src/app/api/webhooks/paystack/route.ts`), so the cron and late-payment paths share the same proven code path rather than a separate implementation.
- [x] Historical orders (no new fields) render in dashboard and storefront order pages without errors. Verified live 2026-10-07 against a synthetic pre-Phase-15 order (missing `platformFee` and all new `OrderLineItem` fields) — both pages render cleanly with "Cost unknown" and no customization/profit UI, as expected. (Fixing this surfaced a real bug in the synthetic fixture, not the app: an invalid `productId` broke `getBestSellingCategories`'s storefront-layout query — not reproducible with any real order, which always has valid ObjectIds.)
- [x] Revenue KPI unchanged. Profit KPI coverage is 0% on a fresh deploy and rises as costs are entered. Verified during the 15.10–15.14 visual testing round.
- [x] Refunded order drops out of both revenue and profit. Verified during the 15.10–15.14 visual testing round.
- [x] Customization text with `<script>` renders as literal text in dashboard, storefront, and email. Verified live 2026-10-07 on dashboard and storefront order pages — no script executed, text shown literally. Email path uses the same `escapeHtml()` helper (code-reviewed, not independently verifiable — no test inbox access).
- [x] `tsc --noEmit`, `eslint`, `next build` clean. All three run 2026-10-07: zero type errors, zero lint errors (one pre-existing unrelated warning in `top-bar.tsx`), production build succeeds.

## Decisions, locked in by the owner 2026-10-03

| ID | Question | Decision |
| --- | --- | --- |
| DEV-6a | Offer a one-time "apply current cost prices to past orders" button? | **No, not in v1.** It fabricates history if costs changed. Coverage rising naturally is the honest path. Reconsider if merchants push back on an empty profit number at launch. |
| DEV-7a | Should customization have its own cost (e.g. engraver's fee) separate from `costPrice`? | **Defer.** For now merchants can fold it into the surcharge pricing. Add `customizationCost Float?` later if jewellery merchants ask. |
| DEV-7b | Customization per variant instead of per product? | **No.** Per product covers the stated jewellery case, and per-variant config would need embedded writes for no clear gain. |
| DEV-7c | Structured options (font choice, insignia picker) instead of free text? | **Out of scope.** Free text + label covers "name on a ring"; an insignia can be described in text until a real demand appears. |
