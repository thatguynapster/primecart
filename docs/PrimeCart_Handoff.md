# PrimeCart — Claude Code Handoff Document

## What This Document Is

This is a complete strategic and technical handoff for building PrimeCart MVP from scratch.
It captures all decisions made during planning so the coding agent does not make assumptions
or revisit settled questions. Read this entire document before writing a single line of code.

---

## What PrimeCart Is

A lightweight commerce operations platform for small Ghanaian retailers. Merchants get:

- An inventory and order management dashboard
- A public-facing storefront at `merchant.primecart.app`
- Automatic order and inventory sync when a customer buys through the storefront
- Basic sales reporting

Target merchants: phone accessory shops, electronics gadget sellers, fashion and jewellery retailers.

---

## MVP Scope — Build Exactly This, Nothing More

### 1. Products & Inventory

- Create, edit, archive products
- Product variants (e.g. size, colour) with individual stock levels per variant
- Low stock alerts (configurable threshold per variant, default 5 units)
- Product images via Cloudflare R2 — project owner completes the R2 account setup and supplies credentials when the product module is reached, not before. Enable public access on the R2 bucket so product image URLs can be served directly to storefront customers without signed requests

### 2. Landing Page

- Lives at `primecart.app` (root domain)
- Content source: `/bak/app/site` within the project folder — read this directory first for copy, sections, and value propositions to carry over into the redesign
- UI must be fully redesigned — do not reuse the previous visual design
- Design reference for inspiration: https://dribbble.com/shots/27117831-Akuma-Landing-Page — screenshot saved at `/docs/landing_sample.webp`
- Design direction: light, minimal, modern SaaS aesthetic. Specifically:
    - **Background:** off-white/light grey (#F5F5F5 range) with a subtle grid or tile pattern behind the hero section
    - **Typography:** large, heavy sans-serif headlines (bold weight, tight tracking) — headline copy dominates the hero. Body text is small and restrained
    - **Colour palette:** near-monochromatic — light greys, white surfaces, dark text. One dark high-contrast CTA button (near-black fill, white text). Secondary CTA is ghost/outline style
    - **Hero layout:** centred — trust badge above headline, large headline, short subheadline, two CTA buttons side by side, product dashboard screenshot below the fold partially visible
    - **Navigation:** clean horizontal nav, logo left, links centre, single CTA button right — pill or rounded rectangle shape
    - **Product preview:** a partial screenshot of the PrimeCart merchant dashboard embedded below the hero CTAs, showing the product feels real and functional
    - **3D accents:** subtle 3D object decorations in the corners/background (the reference uses grey 3D shapes) — optional but adds depth if execution is clean
    - **Cards and surfaces:** white cards with soft shadows, rounded corners, generous padding
    - **Overall feel:** premium but approachable — not dark, not loud. Confidence through restraint
- Design tone: practical and direct, aimed at small Ghanaian retailers (phone accessories, gadgets, fashion) — copy should speak to operational pain points (lost stock, manual tracking, WhatsApp chaos), not abstract SaaS benefits
- Required sections at minimum:
    - Hero — strong headline, subheadline, single CTA (Start free trial)
    - Problem statement — what life looks like without PrimeCart (relatable to the target merchant)
    - Features overview — inventory, orders, storefront, reporting
    - Pricing — GHS 79/month + 3% per transaction (covers all payment processing fees), 30-day free trial, no hidden fees
    - CTA section — bottom of page signup prompt
- The root domain route is already handled correctly by the existing middleware — `primecart.app` with no subdomain resolves to the landing page, not a merchant store
- Full creative latitude on layout, component choices, and visual execution within the design direction above

### 3. Storefront

- Public product pages per merchant
- Subdomain routing: `merchant.primecart.app`
- One default theme — mobile-first, clean, no theme selection at MVP
- Basic merchant branding: logo, business name, primary colour
- Add to cart and checkout flow
- Storefront is mobile-optimised — this applies to ALL UI, dashboard included
- When `storefront.isActive` is `false` (subscription lapsed), the storefront serves a "store temporarily unavailable" page. This is deliberately distinct from the 404 "Store not found" returned for an unknown subdomain — a real store that has lapsed is not the same as a store that does not exist

### 4. Orders

- Orders auto-created when a customer completes storefront checkout
- Manual order creation for walk-in or WhatsApp sales (merchant enters manually)
- Order status tracking: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → CANCELLED
- Mark as paid / fulfilled
- `OrderSource` enum: STOREFRONT | MANUAL | WHATSAPP (WHATSAPP deferred but enum must exist now)

### 5. Customers

- Auto-created from orders (storefront and manual)
- Fields: name, email, phone, purchase history
- No standalone customer creation flow at MVP

### 6. Payments — Paystack Subaccount Model

- See full Paystack integration spec below
- Storefront checkout processes payments through PrimeCart's Paystack account
- Each merchant is a Paystack subaccount
- Revenue model: GHS 79/month flat fee + 3% per transaction (PrimeCart bears Paystack fees)

### 7. Reporting

- Total sales: daily / weekly / monthly view
- Best selling products
- Current stock value
- Use MongoDB aggregation pipelines for these queries — do NOT use Prisma's findMany for reporting queries

---

## Explicitly Deferred — Do Not Build These

- Custom domains (subdomain only at MVP)
- Theme selection
- WhatsApp bot integration
- Supplier management
- Purchase orders
- Inventory forecasting
- Accounting integrations
- Logistics integrations
- Multi-language support
- Marketplace functionality
- Advanced customer analytics
- AI features

---

## Tech Stack

| Layer             | Choice                   | Notes                                                                                                   |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| Framework         | Next.js 16 App Router    | TypeScript throughout. Next.js 14 is EOL as of Oct 2025 — do not use it                                 |
| Data Mutations    | Server Actions           | Primary pattern for all form submissions and merchant dashboard operations                              |
| Public API Routes | Next.js API Routes       | Use only for endpoints that must be publicly accessible (e.g. Paystack webhook, storefront product API) |
| Styling           | Tailwind CSS + Shadcn/ui | Mobile-first, responsive                                                                                |
| Database          | MongoDB + Prisma v6.19   | Prisma v7 does not support MongoDB — pin to v6.19 explicitly                                            |
| Auth              | Clerk.js                 | Merchant authentication only                                                                            |
| Payments          | Paystack                 | Subaccount split model                                                                                  |
| Image Storage     | Cloudflare R2            | Owner supplies credentials when the product module is reached — build the rest of the module first      |
| State Management  | Zustand                  | Client state only                                                                                       |
| Hosting           | Vercel                   | Wildcard subdomain config required from day one                                                         |

---

## Architecture Decisions

### Multi-Tenancy

Single MongoDB instance. Every document is scoped by `merchantId`.

**Critical rule:** Every single database query must include `merchantId` as the first filter condition.
Never trust `merchantId` from the client. Always derive it from the authenticated Clerk session server-side.

Pattern to follow for every service function:

```typescript
async function getProducts(merchantId: string, filters?: ProductFilters) {
	return prisma.product.findMany({
		where: {
			merchantId, // always first
			...filters
		}
	});
}
```

### Subdomain Routing

Wildcard subdomain routing must be configured on Vercel from day one.
The existing middleware handles subdomain resolution — see middleware notes below.

### Middleware

The existing `middleware.ts` subdomain resolution logic is correct and should be kept.
Three fixes must be applied before use:

**Fix 1 — Add in-memory caching to prevent a DB hit on every request:**

```typescript
const businessCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

async function getCachedBusiness(key: string, lookup: Record<string, string>) {
	const cached = businessCache.get(key);
	if (cached && cached.expiresAt > Date.now()) return cached.data;

	const business = await getBusiness(lookup);
	businessCache.set(key, {
		data: business.data,
		expiresAt: Date.now() + CACHE_TTL
	});
	return business.data;
}
```

**Fix 2 — Pass only merchantId in response header, not the full merchant object:**

Header names are `x-merchant-id` / `x-merchant-slug`, not `x-business-id` / `x-business-slug`. The old codebase in `/bak` uses `business` and `business_id` throughout; that naming is dropped. `merchant` is the term used everywhere — schema, service layer, and headers. Rename as you port the middleware.

```typescript
// Wrong — leaks data, hits header size limits
response.headers.append("business", business.data);

// Correct
response.headers.set("x-merchant-id", merchant.id);
response.headers.set("x-merchant-slug", subdomain || domain);
```

**Fix 3 — Wrap getBusiness call in try/catch. Middleware must never crash a request:**

```typescript
try {
  business = await getCachedBusiness(...);
} catch (error) {
  return NextResponse.next(); // fail open
}

if (!business) {
  return new NextResponse("Store not found", { status: 404 });
}
```

---

## Database Schema

### Prisma Version Requirement — Read Before Installing

**Prisma v7 does not support MongoDB.** Installing `prisma` or `@prisma/client` without a version pin will resolve to v7 and fail immediately. Pin explicitly to v6.19:

```bash
npm install prisma@6.19 @prisma/client@6.19
```

To prevent the IDE (VS Code) from flagging false Prisma errors, add a `.vscode/settings.json` to the project root:

```json
{
	"prisma.prismaFmtBinPath": "./node_modules/.bin/prisma",
	"[prisma]": {
		"editor.defaultFormatter": "Prisma.prisma"
	}
}
```

And pin the Prisma VS Code extension to the version matching v6 by adding to `.vscode/extensions.json`:

```json
{
	"recommendations": ["Prisma.prisma"]
}
```

**Important limitation:** Prisma v6's MongoDB support does not handle embedded document types through standard Prisma Client methods. All operations touching embedded fields (`ProductVariant`, `OrderLineItem`, `ShippingAddress`, `MerchantStorefront`) must use `prisma.$runCommandRaw`. This is already accounted for in the stock deduction logic below — apply the same pattern anywhere you update embedded fields.

---

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// ============================================
// MERCHANT
// ============================================
// NOTE: additional Merchant fields are specified later in this document —
// paystackSubaccountCode (§Paystack), and trialExpiresAt / subscriptionStatus /
// paystackSubscriptionCode (§Subscription Billing). Add all of them.
model Merchant {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  clerkUserId String   @unique // links the Clerk session to this Merchant
  email       String   @unique
  name        String
  phone       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  storefront MerchantStorefront?

  products  Product[]
  orders    Order[]
  customers Customer[]

  @@index([email])
  @@index([clerkUserId])
}

type MerchantStorefront {
  subdomain    String
  customDomain String?
  businessName String
  logoUrl      String?
  primaryColor String  @default("#000000")
  description  String?
  isActive     Boolean @default(true)
}

// ============================================
// PRODUCT
// ============================================
model Product {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  merchantId  String   @db.ObjectId
  name        String
  description String?
  category    String?
  images      String[]
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  variants ProductVariant[]
  merchant Merchant @relation(fields: [merchantId], references: [id])

  @@index([merchantId])
  @@index([merchantId, isActive])
  @@index([merchantId, category])
}

type ProductVariant {
  id                String  @default(cuid())
  name              String
  sku               String?
  price             Float
  stock             Int     @default(0)
  lowStockThreshold Int     @default(5)
  attributes        Json
  isActive          Boolean @default(true)
}

// ============================================
// CUSTOMER
// ============================================
model Customer {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  merchantId String   @db.ObjectId
  name       String
  email      String?
  phone      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  merchant Merchant @relation(fields: [merchantId], references: [id])
  orders   Order[]

  @@index([merchantId])
  @@index([merchantId, email])
  @@index([merchantId, phone])
}

// ============================================
// ORDER
// ============================================
model Order {
  id          String        @id @default(auto()) @map("_id") @db.ObjectId
  merchantId  String        @db.ObjectId
  customerId  String?       @db.ObjectId
  orderNumber String
  status      OrderStatus   @default(PENDING)
  source      OrderSource   @default(MANUAL)

  paymentStatus PaymentStatus @default(UNPAID)
  paymentRef    String?

  subtotal Float
  total    Float

  lineItems       OrderLineItem[]
  shippingAddress ShippingAddress?

  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  merchant Merchant  @relation(fields: [merchantId], references: [id])
  customer Customer? @relation(fields: [customerId], references: [id])

  @@index([merchantId])
  @@index([merchantId, status])
  @@index([merchantId, createdAt])
  @@index([merchantId, orderNumber])
  @@index([paymentRef])
}

type OrderLineItem {
  productId   String
  variantId   String
  productName String
  variantName String
  sku         String?
  price       Float
  quantity    Int
  subtotal    Float
}

type ShippingAddress {
  name    String
  phone   String
  address String
  city    String
  region  String?
}

// ============================================
// ENUMS
// ============================================
enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  EXPIRED   // set by the expiry cron only — never selectable by a merchant
}

enum OrderSource {
  STOREFRONT
  MANUAL
  WHATSAPP
}

enum PaymentStatus {
  UNPAID
  PAID
  PARTIALLY_PAID
  REFUNDED
}
```

### Critical Schema Notes

**Variants are embedded in Product.** They have no independent existence. Do not create a separate Variants collection.

**`EXPIRED` and `CANCELLED` are different things.** `EXPIRED` is set by the expiry cron when a customer abandons checkout and the stock reservation lapses. `CANCELLED` is a deliberate cancellation by the merchant. Keeping them separate stops abandoned carts from polluting the merchant's cancellation figures in reporting. `EXPIRED` must never appear in a merchant-facing status dropdown.

**No passwords are stored.** Clerk owns authentication entirely. `Merchant.clerkUserId` is the link between a Clerk session and the merchant record, and it is the only supported way to resolve the current merchant server-side.

**Line items are embedded in Order using a snapshot pattern.** When an order is placed, copy the product name, variant name, SKU, and price into the line item. Never reference live product data from a historical order. This ensures order history remains accurate even if the merchant later changes prices.

**`storefront.subdomain` must be indexed.** Add this index manually via MongoDB Atlas or a migration script since Prisma cannot index embedded type fields directly:

```javascript
db.Merchant.createIndex({ "storefront.subdomain": 1 }, { unique: true });
db.Merchant.createIndex({ "storefront.customDomain": 1 }, { sparse: true });
```

---

## Stock Deduction Logic — Do Not Skip This

**This is critical business logic. Do not defer it.**

When an order is placed, stock must be atomically decremented on the correct ProductVariant.
Because variants are embedded in the Product document, Prisma cannot update them directly.
Use `prisma.$runCommandRaw` for this operation:

```typescript
async function decrementVariantStock(
	productId: string,
	variantId: string,
	quantity: number
) {
	await prisma.$runCommandRaw({
		update: "Product",
		updates: [
			{
				q: { _id: { $oid: productId }, "variants.id": variantId },
				u: { $inc: { "variants.$.stock": -quantity } }
			}
		]
	});
}
```

Use a reservation pattern — do not do a hard permanent deduct at order creation.

**Sequence:**

1. Order created → stock reserved immediately (hard decrement) → `paymentStatus: UNPAID`, `status: PENDING`, `reservedUntil: now + 30 minutes`
2. Payment webhook confirms → order status updated to CONFIRMED, `reservedUntil` cleared — stock deduction becomes permanent
3. Payment fails, is abandoned, or `reservedUntil` expires → order marked `EXPIRED`, `reservedUntil` cleared, stock restored via `$inc` in the opposite direction

**Add `reservedUntil` to the Order model:**

```prisma
reservedUntil DateTime? // null once payment confirmed
```

**Expiry job:** Run a cleanup function every 5 minutes that finds all orders where `status: PENDING` and `reservedUntil < now`, marks them `EXPIRED`, clears `reservedUntil`, and restores stock:

```typescript
async function expireAbandonedOrders() {
	const expiredOrders = await prisma.order.findMany({
		where: {
			status: "PENDING",
			paymentStatus: "UNPAID",
			reservedUntil: { lt: new Date() }
		}
	});

	for (const order of expiredOrders) {
		for (const item of order.lineItems) {
			await restoreVariantStock(
				item.productId,
				item.variantId,
				item.quantity
			);
		}
		await prisma.order.update({
			where: { id: order.id },
			data: { status: "EXPIRED", reservedUntil: null }
		});
	}
}
```

**Verify this before trusting it.** The function reads `order.lineItems` — an embedded array — through standard Prisma Client. Reading embedded arrays is expected to work (the `$runCommandRaw` requirement covers *writes* to embedded fields, not reads), but this has not been proven against Prisma v6.19 on MongoDB. Write a test that creates an order with multiple line items and confirms the expiry job restores stock for every one of them. If the array comes back empty or partially populated, rewrite the query using `$runCommandRaw` before going further — a silent failure here restores no stock and quietly loses inventory.

Run this cleanup function using a cron job configured to fire every 5 minutes. Use **cron-job.org** (free) instead of Vercel Cron — Vercel Cron requires a Pro plan.

**Setup on cron-job.org** — the project owner configures this job; the coding agent builds and secures the endpoint and supplies these settings:

- URL: `https://primecart.app/api/cron/expire-orders`
- Schedule: every 5 minutes (`*/5 * * * *`)
- Method: GET or POST
- Add a custom request header: `Authorization: Bearer <CRON_SECRET>`

**Critical — protect the endpoint from unauthorized calls:**
Since cron-job.org calls the endpoint over the public internet (unlike Vercel Cron which calls internally), the endpoint must validate a secret token on every request. Without this, anyone who knows the URL can trigger mass order expiry:

```typescript
// /api/cron/expire-orders route handler
export async function GET(req: Request) {
	const authHeader = req.headers.get("authorization");
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return new Response("Unauthorized", { status: 401 });
	}

	await expireAbandonedOrders();
	return new Response("OK", { status: 200 });
}
```

Add to environment variables:

```
CRON_SECRET=<generate a long random string>
```

Set the same value in cron-job.org's Authorization header configuration.

**Oversell protection:** Before reserving stock at order creation, verify `variant.stock >= quantity ordered` for every line item. If any item fails this check, reject the entire order with a clear error. Never partially fulfil an order at creation time.

---

## Paystack Integration Spec

### Model: Subaccount Split Payments

PrimeCart operates one master Paystack account. Each merchant is a Paystack subaccount.
No merchant secret keys are stored anywhere in the PrimeCart database or codebase.

### Revenue Split Per Transaction

The 3% transaction fee is separate from and in addition to the GHS 79/month subscription. The subscription covers access to the platform. The transaction fee is only charged on sales processed through the merchant's PrimeCart storefront — it is never charged on manual orders entered by the merchant.

**Fee structure:**

- Merchant is charged: **3% of order value** — this is the only deduction the merchant sees
- PrimeCart bears: Paystack's ~1.95% processing fee internally, keeping ~1.05% as net margin
- Fee bearer: `account` (PrimeCart main account bears Paystack's fee — the merchant never sees Paystack's cut as a separate line item)

**How the merchant experiences this:**
The merchant never receives a separate invoice for the 3%. It is deducted at the point of sale before the money reaches their bank account. The merchant sees one clean deduction — 3% — with no additional Paystack fees on top. PrimeCart absorbs the payment processing cost as part of the service.

**Transparency requirement — must be explicitly stated on the pricing page:**
The pricing page and onboarding flow must state clearly: "We charge 3% on storefront sales only. That 3% covers all payment processing fees — no hidden charges on top. Manual orders are always free. You keep 97% of every sale."

**How it works technically:**

- Set `percentage_charge: 0` when creating the merchant's Paystack subaccount — do NOT set a percentage here. The 3% split is applied per-transaction at initialization via `transaction_charge` instead. Using both fields stacks the fee and results in ~6% being deducted from the merchant, not 3%
- Set `bearer: "account"` so PrimeCart's main account absorbs Paystack's processing fee
- Merchant's net deduction is exactly 3% — Paystack's ~1.95% is covered internally by PrimeCart from within that 3%
- PrimeCart's net margin per transaction: ~1.05% after covering Paystack's fee

**Example breakdown on a GHS 200 storefront order:**

| Party                                     | Amount         |
| ----------------------------------------- | -------------- |
| Customer pays                             | GHS 200.00     |
| Total deducted from merchant (3%)         | − GHS 6.00     |
| Paystack fee (borne by PrimeCart, ~1.95%) | − GHS 3.90     |
| **Merchant receives**                     | **GHS 194.00** |
| **PrimeCart net**                         | **~GHS 2.10**  |

### Merchant Onboarding Flow

During merchant setup, collect:

- Business name
- Bank account number
- Bank code (provide a dropdown of Ghanaian banks with their Paystack bank codes)

Then call Paystack's Create Subaccount API:

```typescript
const response = await fetch("https://api.paystack.co/subaccount", {
	method: "POST",
	headers: {
		Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
		"Content-Type": "application/json"
	},
	body: JSON.stringify({
		business_name: merchant.storefront.businessName,
		settlement_bank: bankCode,
		account_number: accountNumber,
		percentage_charge: 0 // Must be 0 — fee is applied per-transaction via transaction_charge below, not here
	})
});

const data = await response.json();
// Store data.data.subaccount_code on the Merchant record
// e.g. merchant.paystackSubaccountCode = "ACCT_xxxxxxxxxx"
```

Add `paystackSubaccountCode` field to the Merchant model in the schema.

### Checkout Flow

1. Customer completes cart on storefront
2. **Create the Order first** with `paymentStatus: UNPAID`, `status: PENDING`, and `reservedUntil: now + 30 minutes`. Stock is decremented immediately at this point as a reservation. This ensures a persistent order record exists regardless of payment outcome, and prevents overselling. The customer has 30 minutes to complete payment before the reservation expires and stock is restored.
3. Server initializes Paystack transaction, passing the Order ID as reference:

```typescript
const reference = `PCART-${order.id}`; // tie Paystack transaction to the Order

const response = await fetch("https://api.paystack.co/transaction/initialize", {
	method: "POST",
	headers: {
		Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
		"Content-Type": "application/json"
	},
	body: JSON.stringify({
		email: customer.email,
		amount: totalInPesewas, // amount * 100
		subaccount: merchant.paystackSubaccountCode,
		transaction_charge: Math.round(totalInPesewas * 0.03), // PrimeCart's 3% applied here only — percentage_charge on subaccount must be 0 to avoid double deduction
		bearer: "account",
		reference,
		metadata: {
			orderId: order.id,
			merchantId: merchant.id
		}
	})
});

// Append the Paystack reference to the order immediately after initialization
await prisma.order.update({
	where: { id: order.id },
	data: { paymentRef: reference }
});
```

4. Redirect customer to Paystack checkout URL
5. On return from Paystack (success or failure), show the customer their order status page — do not update order status here, wait for the webhook
6. Paystack webhook confirms payment → find Order by `paymentRef`, update `paymentStatus` to PAID, `status` to CONFIRMED, clear `reservedUntil`. Stock deduction is already done — no additional stock operation needed at this point.

**Failed or abandoned payment handling:** If payment fails or times out, the order remains with `paymentStatus: UNPAID` until the cron job expires it. On expiry, `status` is set to `EXPIRED` and stock is restored. The merchant sees the expired order in their dashboard. The customer must place a new order to retry.

### Webhook Handler

Create a POST endpoint at `/api/webhooks/paystack`:

- Verify webhook signature using `PAYSTACK_SECRET_KEY` and the `x-paystack-signature` header
- On `charge.success` event: find Order by `paymentRef`, update `paymentStatus` to PAID, trigger stock deduction
- Never trust the redirect callback alone — always wait for the webhook

### Environment Variables Required

```
PAYSTACK_SECRET_KEY=sk_live_xxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxx
PAYSTACK_PLAN_CODE=PLN_2b0d04ozbt798kj   # test-mode plan; swapped for the live plan at deploy
CRON_SECRET=<long random string — must match value set in cron-job.org Authorization header>
```

The subscription plan code lives in an environment variable, never hardcoded. Development builds against the test-mode plan; moving to live is then a config change rather than a code change.

---

## Authentication — Clerk.js

- Merchant-facing auth only (no separate customer accounts at MVP)
- Customers checkout as guests
- Clerk owns authentication completely — PrimeCart stores no passwords. The `Merchant` model has no `password` field
- `Merchant.clerkUserId` links a Clerk user to a merchant record. On first sign-in, create the `Merchant` record keyed to `clerkUserId`
- After Clerk authentication, resolve `clerkUserId` → `merchantId` server-side on every protected route
- Never pass `merchantId` as a query parameter or request body field from the client

---

## Revenue Model Summary

| Stream               | Amount                 | Notes                                                                       |
| -------------------- | ---------------------- | --------------------------------------------------------------------------- |
| Monthly subscription | GHS 79/month           | Charged per merchant account                                                |
| Transaction fee      | 3% per storefront sale | PrimeCart bears Paystack's ~1.95% fee; merchant sees one clean 3% deduction |
| Free trial           | 30 days                | Before first subscription charge                                            |

### Break-even Reference

- Infrastructure cost estimate: GHS 500–800/month (Vercel, MongoDB Atlas, Cloudflare R2, misc)
- Break-even: ~5–10 active merchants doing consistent storefront volume
- Target merchant GMV profiles: accessories (GHS 2,000–5,000/month), gadgets (GHS 5,000–20,000/month), fashion (GHS 3,000–10,000/month)

---

## Build Sequence Recommendation

Build in this order. Do not skip ahead.

1. **Project setup** — Next.js 16, TypeScript, Tailwind, Shadcn/ui, Clerk, Prisma + MongoDB connection
2. **Schema + indexes** — Deploy schema, create manual indexes for storefront.subdomain
3. **Middleware fixes** — Apply the three fixes documented above to existing middleware.ts
4. **Vercel wildcard subdomain config** — Configure this before building any storefront routes. Project owner applies the Vercel and DNS settings; the coding agent supplies the instructions and verifies a test subdomain resolves
5. **Landing page** — Read /bak/app/site for content, redesign UI, deploy at primecart.app root
6. **Merchant onboarding** — Clerk auth + merchant profile + Paystack subaccount creation
7. **Product & inventory module** — CRUD, variants, stock levels, low stock alerts, R2 image upload
8. **Storefront** — Public product pages, cart, mobile-optimised, single default theme
9. **Checkout & Paystack** — Transaction initialization, redirect, webhook handler, stock reservation + expiry cron
10. **Order management** — Auto-creation from checkout, manual order entry, status management
11. **Customer records** — Auto-created from orders, purchase history view
12. **Reporting dashboard** — Aggregation pipeline queries for sales and inventory reports
13. **Subscription billing** — Paystack subscription plan `PLN_2b0d04ozbt798kj`. Trial enforcement via daily cron, subscription enrollment at trial expiry, dashboard lockout for EXPIRED merchants

---

## Project Owner Decisions — All Resolved

No open questions remain. Every item below is settled; the coding agent implements them as written and does not reopen them.

1. **Cloudflare R2** — Owner completes the account setup and supplies credentials when the product module (step 7) is reached, not before. Build the rest of the product module first and leave image upload as the last piece. When ready, owner provides: R2 bucket name, Account ID, Access Key ID, Secret Access Key, and public bucket URL. Use the `@aws-sdk/client-s3` package as the R2 client library — this is Cloudflare's own official recommendation for JavaScript/TypeScript. No Cloudflare-native Node.js SDK exists for R2; third-party alternatives exist but are not production-ready. Configure with the R2 endpoint (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) and region set to `auto`. Enable public access on the bucket so product images are served via a stable public URL with no signed requests needed. No egress fees on public reads
2. **Paystack account** — **Confirmed live-activated** for transactions in Ghana. Subaccounts will settle to real bank accounts. No blocker on merchant onboarding or checkout.
3. **Subscription billing** — Using Paystack's built-in subscription plans. Details:
    - **Plan code:** `PLN_2b0d04ozbt798kj` — this is a **test-mode** plan. Build and test against it. The live-mode plan is created at deploy time by the owner, and swapped in via the `PAYSTACK_PLAN_CODE` environment variable. Never hardcode the plan code.
    - **Trial model:** Merchants are NOT enrolled in the subscription plan at signup. They get 30 days free with no payment details required. At trial expiry, the subscription is initiated programmatically.

    **Implementation:**
    - At merchant signup, store `trialExpiresAt: now + 30 days` on the Merchant record. Add this field to the schema.
    - A cron job (separate from the order expiry cron on cron-job.org) runs daily and finds all merchants where `trialExpiresAt < now` and `subscriptionStatus: "TRIAL"`. Owner registers this job; the agent builds and secures the endpoint with `CRON_SECRET` exactly as the order-expiry endpoint is secured.
    - For each expired trial merchant, redirect them to a payment page that collects card details and initiates a Paystack subscription against `process.env.PAYSTACK_PLAN_CODE` via the Paystack Subscription API.
    - On successful subscription creation, store the returned `subscription_code` and set `subscriptionStatus: "ACTIVE"` on the Merchant record.
    - If a merchant does not complete payment after trial expiry, set `subscriptionStatus: "EXPIRED"` and restrict dashboard access until payment is made — storefront should also be deactivated (`storefront.isActive: false`).

    **Add to Merchant schema** — `trialExpiresAt` is required, not optional. The database is new and empty, so there are no existing records to backfill:

    ```prisma
    trialExpiresAt     DateTime
    subscriptionStatus SubscriptionStatus @default(TRIAL)
    paystackSubscriptionCode String?
    ```

    **Add enum:**

    ```prisma
    enum SubscriptionStatus {
      TRIAL
      ACTIVE
      EXPIRED
      CANCELLED
    }
    ```

    **Paystack webhook events to handle for subscriptions:**
    - `subscription.create` → confirm subscription active, update merchant record
    - `invoice.payment_failed` → mark merchant `subscriptionStatus: EXPIRED`, deactivate storefront
    - `subscription.disable` → same as above

    **Protect all dashboard routes:** middleware must check `subscriptionStatus` — EXPIRED merchants see only a payment/reactivation page, nothing else.

4. **Merchant validation** — Storefront goes live automatically on signup. No manual review or approval step. `storefront.isActive` is set to `true` immediately on onboarding completion and only set to `false` if the merchant's subscription expires.
5. **Third-party dashboard configuration** — The project owner performs all external dashboard setup: the Vercel wildcard domain and DNS, both cron-job.org jobs, the Cloudflare R2 bucket, and the live Paystack plan at deploy. The coding agent does not have access to these and must not attempt it. For each, the agent's deliverable is the working endpoint or config plus written setup instructions, and verification once the owner has applied it.

---

## Decision Log

Amendments agreed with the project owner on 2026-08-13, after the initial handover was written. Where these differ from the original text, **these win** — the sections above have been updated to match.

| Change                                                                                                   | Rationale                                                                                            |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Merchant.password` removed; `clerkUserId String @unique` added                                          | Auth is Clerk — PrimeCart never handles passwords, and a Clerk session needs a link field to resolve a merchant |
| `EXPIRED` added to `OrderStatus`; the expiry cron sets `EXPIRED`, not `CANCELLED`                        | Abandoned checkouts and merchant cancellations are different events and should not share a status in reporting |
| Middleware headers are `x-merchant-id` / `x-merchant-slug`, not `x-business-id` / `x-business-slug`      | `merchant` is the term used in the schema and service layer; the `/bak` codebase's `business` naming is dropped |
| `storefront.isActive: false` serves a "temporarily unavailable" page, not a 404                          | A lapsed store is not a nonexistent store                                                            |
| `expireAbandonedOrders` clears `reservedUntil`, and its embedded-array read must be proven by a test     | The original sample left `reservedUntil` set, and the embedded-array read was never verified against Prisma v6.19 |
| `PAYSTACK_PLAN_CODE` moved to an environment variable                                                    | Test-mode plan now, live plan at deploy — a config change, not a code change                          |
| Paystack `percentage_charge: 0` at subaccount creation; the 3% applied once via `transaction_charge`     | Setting both stacked the fee to ~6% against the merchant                                             |

---

## What Is Not In This Document

The following were discussed but deliberately excluded from MVP scope:

- WhatsApp bot integration (deferred to Phase 2 — `OrderSource.WHATSAPP` enum placeholder exists)
- Custom domain support (subdomain only for now)
- Offline/USSD fallback (rejected — not relevant to target merchant profile)
- Separate database per merchant (rejected at MVP stage — revisit at 200+ merchants)
- USSD (rejected entirely — wrong solution for smartphone-using merchants)
