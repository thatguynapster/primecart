# Production deploy: everything left to do

**For:** the owner. **Rewritten:** 2026-11-23. Replaces the earlier version (which described a removed Paystack plan and a removed trial cron job).

**Assumes none of this version has been deployed to production yet.** An older version answers at `primecart.app` (checked 2026-11-23): it advertises the old pricing and its sign-up page is open, so do part 0 today. If an item already exists, check it against what's written here and tick it. Work top to bottom: later parts depend on earlier ones. Parts 1 to 10 come **before** the merge to `main`, because that merge starts the production build.

**This repository is public.** Never put a key, password, connection string, backup or customer detail in it, in a commit message, or in a screenshot.

- **[Stop]** = don't deploy until this is done.
- **[Keep]** = write the value down in your password manager; you need it later.

---

## 0. Today: close sign-ups on the old site

- [ ] **[Stop]** Clerk → the **production** instance → the sign-up restrictions settings → allow no new public sign-ups (Clerk calls this restricted mode). Existing merchants can still sign in. Then try signing up in a private window: it must be refused.
- [ ] Atlas → production `Merchant`: check for accounts you don't recognise. Any with a shop get a 14-day trial on the deploy. Contact them, don't just delete them.
- [ ] Don't delete the old deployment or the Clerk instance: existing merchants use both.

## 1. Decisions and accounts

- [ ] **[Stop] Vercel plan.** Vercel's Hobby plan is for personal, non-commercial use. PrimeCart charges merchants, so check that the account is on a plan that allows it (Pro).
- [ ] **[Stop] Paystack business account approved for live payments.** The Live toggle must work. Ask whether a published refund policy is required. Decided: refunds to shoppers are each merchant's own (`/terms` parts 9 and 13), so point them there.
- [ ] **[Stop] Paystack split payments / subaccounts allowed** on the live account, for both bank and mobile money payouts.
- [ ] **[Stop] Chargebacks.** The payment is made through PrimeCart's Paystack account, with the merchant as a subaccount. Ask Paystack: when a bank reverses a payment, whose balance is debited, who must answer it and by when, and can the merchant be the one to answer?
- [ ] **Paystack's fee rate** confirmed for your account. PrimeCart pays it out of its 3%, on the whole payment including delivery.
- [ ] **Resend plan** sends enough: each order can send 2 or 3 emails. Check the daily limit on your plan.
- [ ] **MongoDB Atlas** tier chosen. A free M0 cluster has no managed backups and small limits. Part 2's backups exist because of that.
- [ ] **Clerk plan** covers a production instance and the number of merchants you expect.
- [ ] **Who can log in** to Vercel, GitHub, Atlas, Cloudflare, Clerk, Paystack, Resend, cron-job.org and the domain registrar: two-factor authentication on for each, recovery codes saved.
- [ ] **Domain `primecart.app`**: auto-renew on.

## 2. Backups (the production build fails without them)

- [ ] **[Stop]** Cloudflare → R2 → create bucket `primecart-backups`. **Private**: no public URL, no custom domain.
- [ ] Bucket → Settings → Object lifecycle rules → delete objects after **60 days** (`/privacy` promises 60).
- [ ] **[Stop] [Keep]** R2 → Manage API tokens → token with *Object Read & Write*, **scoped to `primecart-backups` only**. Gives `BACKUP_R2_ACCESS_KEY_ID` and `BACKUP_R2_SECRET_ACCESS_KEY`. Don't reuse the image token.
- [ ] A machine that can reach Atlas (your IP on the allowlist, plus a database user), for restores and for part 11.

## 3. MongoDB Atlas

- [ ] **[Stop]** Production database `primecart`, separate from dev's `primecart-dev`.
- [ ] **[Stop] [Keep]** A database user for the app: read and write on `primecart` only. Its connection string must name the database: `mongodb+srv://…/primecart?retryWrites=true&w=majority`.
- [ ] **[Keep]** A second user, **read-only** on `primecart`, for the GitHub backup (part 8).
- [ ] **[Stop]** Network access: allow `0.0.0.0/0`. Vercel and GitHub have no fixed addresses. The password is the protection, so make it long and random.
- [ ] If the database **already holds merchants** (the founding merchants): note how many. The numbers must match after the deploy.
- [ ] No manual migration needed: the build pushes the schema, creates the indexes and runs the backfills.

## 4. Clerk production instance

> **If production merchants already exist, use the Clerk instance they signed up with.** A new instance gives everyone a new user id, and they'd lose access to their shops.

- [ ] **[Stop]** Dashboard → Development → **Create production instance**, cloning the development settings.
- [ ] Domains → add `primecart.app`. Add the DNS records Clerk lists (usually `clerk`, `accounts`, `clkmail` and two DKIM records) in **Vercel's DNS panel**.
- [ ] Wait until verified, then **Deploy certificates**.
- [ ] Sign-in with Google or other providers isn't copied. If used, create your own credentials for it and add them.
- [ ] Email sign-up requires an email address (PrimeCart can't create a merchant without one).
- [ ] **[Stop] [Keep]** Copy `pk_live_…` and `sk_live_…`.

## 5. Email (Resend)

- [ ] **[Stop]** Sending domain `primecart.app` shows **Verified**, with its SPF and DKIM records in Vercel's DNS.
- [ ] A DMARC record for `primecart.app` (start with `p=none`), so order emails don't land in spam.
- [ ] **[Keep]** A production API key with sending access only.
- [ ] **[Stop]** The `SUPPORT_EMAIL` mailbox exists and someone reads it. It is printed on `/privacy` and `/terms`. If it's on `primecart.app`, the domain needs MX records in Vercel's DNS.
- [ ] Your own inbox for `ADMIN_NOTIFICATION_EMAIL` (server errors and the weekly digest).

## 6. Images (Cloudflare R2)

- [ ] **[Stop]** Image bucket exists, is publicly readable, and has an *Object Read & Write* token scoped to it.
- [ ] **Decide: same bucket as dev, or a new one.** Earlier decision: shared. A separate bucket means nothing done on dev can touch live photos. Choose before the first merchant uploads, because moving later means rewriting image links.
- [ ] **Decide: `r2.dev` or a custom domain.** Cloudflare says `r2.dev` is rate-limited and not for production. It works for a few shops. A custom domain also needs **a code change** (`images.remotePatterns` in `next.config.ts` only allows `*.r2.dev`) and new links for photos already uploaded: tell me first.

## 7. Vercel project

### 7a. Settings
- [ ] **[Stop]** Settings → Build and Deployment → **Build Command** is `npm run vercel-build` (or the override is off). Anything else skips the backup, schema and backfills. `npm run build` fails on purpose.
- [ ] Framework Next.js, root directory = repository root, Node.js 24 (the version the backup workflow uses).
- [ ] **[Stop]** Settings → Git → **Production Branch** is `main`.
- [ ] **[Stop]** Deployment Protection is off for Production. Otherwise shoppers get a Vercel login page.
- [ ] Function region: the one nearest your Atlas cluster.
- [ ] Deploy failure notifications go to an inbox you read.

### 7b. Domains
- [ ] **[Stop]** Nameservers at the registrar are `ns1.vercel-dns.com` and `ns2.vercel-dns.com` (wildcard certificates need this). Before any change, copy every existing DNS record, because they must be added again in Vercel.
- [ ] **[Stop]** `primecart.app` and `*.primecart.app` are both added, assigned to **Production**, and not redirected.
- [ ] If `www.primecart.app` is added, it redirects **to** `primecart.app`, never the other way round.
- [ ] `dev.primecart.app` and `*.dev.primecart.app` still point at `feat/v2`.
- [ ] Any CAA record allows `letsencrypt.org`.

### 7c. Environment variables, **Production scope only**

Never give Preview a production value or the other way round: Preview builds run schema changes and backfills on whatever `DATABASE_URL` they have.

| Variable | Value | Without it |
| --- | --- | --- |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `primecart.app` (no `https://`, no port) | Shops silently show the marketing site |
| `DATABASE_URL` | Part 3, app user | Build fails |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | Every page fails |
| `CLERK_SECRET_KEY` | `sk_live_…` | Every page fails |
| `PAYSTACK_SECRET_KEY` | `sk_live_…` (Paystack, Live mode) | No payments, no webhooks |
| `CRON_SECRET` | New random string, different from dev's. ASCII only: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` | Scheduled jobs refused; also protects the hashed phone numbers and IPs used for order limits |
| `R2_ACCOUNT_ID` | Cloudflare account id | No uploads, no backups |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Part 6 image token | No uploads |
| `R2_BUCKET_NAME` | Image bucket | No uploads |
| `R2_PUBLIC_URL` | `https://pub-….r2.dev`, no trailing slash | Broken images |
| `BACKUP_R2_ACCESS_KEY_ID`, `BACKUP_R2_SECRET_ACCESS_KEY` | Part 2 | **Build fails** |
| `BACKUP_R2_BUCKET` | `primecart-backups` | Defaults to this name |
| `RESEND_API_KEY` | Part 5 | **Build fails** |
| `NOTIFICATIONS_FROM_EMAIL` | e.g. `PrimeCart <noreply@primecart.app>` | **Build fails** (also if it's `@resend.dev`) |
| `ADMIN_NOTIFICATION_EMAIL` | Your inbox | **Build fails** |
| `SUPPORT_EMAIL` | Part 5 mailbox | Shows `support@primecart.app` |
| `FOUNDING_MERCHANT_IDS` | Part 9. Comma-separated ids | Founding merchants pay list price |

- [ ] **[Stop]** All of the above set and checked for stray spaces and quotes.
- [ ] **[Stop]** Preview's `DATABASE_URL` is `primecart-dev`, with Clerk and Paystack **test** keys.
- [ ] **Not set** in Production: `RESEND_BASE_URL`, `BACKUP_ON_BUILD`, `BACKUP_PREFIX`, `BACKUP_SOURCE` (tests and backups only).
- [ ] Remove if present (no longer used): `PAYSTACK_PLAN_CODE`, `PAYSTACK_PUBLIC_KEY`.

## 8. Other services to prepare

**Paystack, Live mode**
- [ ] **[Stop]** Settings → API Keys & Webhooks → Webhook URL: `https://primecart.app/api/webhooks/paystack`. One URL covers orders and subscriptions. Without it no payment is ever confirmed.
- [ ] Test mode webhook is still `https://dev.primecart.app/api/webhooks/paystack`.
- [ ] Your own settlement account is correct: subscriptions and the 3% go there.
- [ ] Business name and support details are what buyers should see on the payment page and receipts.
- [ ] If merchants already exist: each one's `paystackSubaccountCode` is a **live** subaccount. Test-mode codes fail with live keys; fix with Settings → Payout details.

**GitHub**
- [ ] Settings → Secrets and variables → Actions: `DATABASE_URL` (the **read-only** user), `R2_ACCOUNT_ID`, `BACKUP_R2_ACCESS_KEY_ID`, `BACKUP_R2_SECRET_ACCESS_KEY`, and optionally `BACKUP_R2_BUCKET`.
- [ ] `.github/workflows/db-backup.yml` must be on the **default branch** for the daily schedule to run. Check the default branch is `main`.
- [ ] `main` is protected: changes by pull request only.
- [ ] No `.env*` file except `.env.example` has ever been committed. If one has, replace every key in it.

## 9. Founding merchants

Trials start on the production deploy, and the 12 founding months start on the deploy that applies the ids. The ids belong to the **production** database.

**If they already exist in production:**
- [ ] Find the ids. In PowerShell, pointing at production:
  ```powershell
  $env:DATABASE_URL = Read-Host "Production connection string"
  npm run db:list-merchants
  Remove-Item Env:DATABASE_URL
  ```
  Or Atlas → `Merchant`, filter `{ "storefront.subdomain": { "$exists": true } }`.
- [ ] Check each id against the shop name. A valid id for the wrong shop gives **that** shop the discount.
- [ ] Set `FOUNDING_MERCHANT_IDS` (Production) **before** the deploy.

**If they sign up after launch:** do the same after they finish setting up, then redeploy production. A payment they start at list price before that isn't adjusted automatically.

- [ ] Send each one their private terms: 50% off any interval for 12 months, in return for a monthly 20-minute call, a testimonial and one referral; then list price, with 30 days' notice.

## 10. Legal, and telling people

- [ ] **[Stop]** `/privacy` and `/terms` reviewed by someone qualified, including the 3% on delivery fees, the hashed IP and phone numbers, and the 60-day backups.
- [ ] **[Stop]** The reviewer confirms these choices in the drafts: merchants handle refunds and disputes alone and PrimeCart takes no part; the 3% isn't returned on a refund; reversed payments are the merchant's cost; subscription payments are never refunded (access continues to the end of the paid period), with no exception written for shops we close or suspend; 30 days' notice of a fee change and 14 of new terms; the liability limit; what must be kept after an account closes; who is responsible for order data.
- [ ] You can do what the pages promise: answer data requests, delete an account by hand, email all merchants.
- [ ] `src/app/(app)/dashboard/error-test` has been removed (it only works on dev, but shouldn't ship).
- [ ] Data Protection Commission registration (Act 843) done or under way.
- [ ] Registered business name and number, if you have one: tell me and I'll add it to the footer.
- [ ] **[Stop] Existing merchants told before the deploy.** Text to send: *"PrimeCart is now GHS 89/month with everything included, after a 14-day free trial (no payment details needed). Your shop works the same, but online checkout is now optional and starts off: shoppers place orders without paying, you get an email with their WhatsApp number, and you confirm the order and arrange payment yourself. Stock comes off when you confirm or mark it paid. If you'd rather take payment online, switch on 'Take payments on your storefront' in Settings. PrimeCart keeps 3% of each payment, delivery included, with payment fees covered."* Ask them to keep checkout **off** until you've done part 13.

---

## 11. Last checks on dev

- [ ] Every item in `D18_LAUNCH_RUNBOOK.md` §6 is ticked or knowingly skipped. Known open ones:
  - [ ] A **brand-new sign-up**: WhatsApp number required, trial banner shows, first-day checklist shows, shop opens
  - [ ] First-day checklist: each step ticks itself; "Hide this list" works; both work on a phone
  - [ ] Shop link pasted into WhatsApp shows the card; a product link shows its photo
  - [ ] Hero and banner upload
  - [ ] Payout form with no existing payout account
  - [ ] Payment reminder email about 30 minutes after an unpaid checkout-on order, once only
  - [ ] New-order email has the delivery line
  - [ ] Error-alert email arrives (needs a real server error; tell me and I'll set up a safe one on dev)
  - [ ] iPhone Safari: add a product with photos, and place an order
- [ ] `npm test`, `npm run test:db`, `npx tsc --noEmit` and `npx eslint src` pass on the commit being deployed.
- [ ] **Restore drill:** take a backup of dev and restore it into a new, empty database:
  ```
  node --env-file=.env scripts/backup-db.mjs --out ./backup.ejson.gz
  node scripts/restore-db.mjs ./backup.ejson.gz "<connection string of an EMPTY database>"
  ```
  Compare the counts, delete the file and the test database, and record the date in TASKS.md "Restore drills".

## 12. Deploy

- [ ] Pick a quiet hour, with an hour free afterwards.
- [ ] Open the pull request `feat/v2` → `main`: https://github.com/thatguynapster/primecart/compare/main...feat/v2?expand=1
- [ ] Merge with a **merge commit** (not squash). Vercel starts the production build.
- [ ] Read the build log. It must show, in order:
  - `Backup uploaded: r2://primecart-backups/production/…`
  - the schema push and index creation
  - `D-18 backfill summary: {… "onboardedStillMissing":0}`
  - `"foundingIdsConfigured":N,"foundingIdsFound":N` with the same N
- [ ] If it fails, the old site stays up. Fix and redeploy: every step is safe to run again.
- [ ] **Remove `FOUNDING_MERCHANT_IDS`** once the numbers match. The deal stays on the merchant's record. If you later reset a merchant to standard with the id still set, the next deploy makes them founding again.

- [ ] **Re-open sign-ups** in Clerk (undo part 0), once 12a passes.

### 12a. Straight after

| Check | Expected |
| --- | --- |
| `curl -sI https://primecart.app/` | 200. `MIDDLEWARE_INVOCATION_FAILED` means a wrong Clerk key |
| `curl -sI https://www.primecart.app/` | The marketing site, directly or by redirect |
| `curl -sI https://nosuchstore.primecart.app/` | 404 |
| An existing shop, or one you create | Opens, valid certificate, right branding |
| `curl -sI https://<shop>.primecart.app/` | No `x-merchant-id` header |
| `https://<shop>.primecart.app/api/checkout-settings` | 200, with `paymentsEnabled` false |
| `https://<shop>.primecart.app/og` | The preview card |
| `/privacy` and `/terms` | Open, with the right support address |
| Sign in as an existing merchant | Their own shop, products and orders |
| Merchant and order counts in Atlas | Same as before |
| Billing page | 14-day trial; founding shops show "Founding price until …" |

### 12b. Scheduled jobs (cron-job.org)

All `GET`, with header `Authorization: Bearer <production CRON_SECRET>`, failure emails on. **Test run** each: 200 is right, 401 means the header is wrong, 500 "Not configured" means a missing variable.

| Job | URL | Schedule |
| --- | --- | --- |
| Expire orders, payment reminders, email retries | `https://primecart.app/api/cron/expire-orders` | Every 5 minutes |
| Billing reminders | `https://primecart.app/api/cron/billing-reminders` | Daily, 08:00 GMT |
| Dormant shops digest | `https://primecart.app/api/cron/dormant-digest` | Weekly |

- [ ] All three created and test-run. **Delete any old `expire-trials` job.**
- [ ] Dev jobs still point at `dev.primecart.app` with dev's secret. Never mix them.

### 12c. Daily backup
- [ ] GitHub → Actions → **Database backup** → Run workflow. The log ends with `Backup uploaded: …/scheduled/…`.
- [ ] Failure emails from GitHub reach you.
- [ ] Restore this backup into a new, empty database once, and compare counts. Record it in TASKS.md, and repeat monthly.

## 13. Live proof, before any merchant switches checkout on

Use your own test shop with a real payout account.

- [ ] **Sign-up:** new account, onboarding with a WhatsApp number, product with photos from a phone, delivery area set, link shared.
- [ ] **Checkout off:** place an order. Merchant and buyer emails arrive (not in spam), WhatsApp buttons open the right number, confirming takes the stock.
- [ ] **Switch checkout on** with the real payout account. Paystack accepts it.
- [ ] **Split payment:** pay a small real order **with a delivery fee**, for example GH₵10 + GH₵5. The order turns Paid and Confirmed by itself. In Paystack, of GH₵15.00: **GH₵14.55 to the merchant's subaccount, GH₵0.45 to PrimeCart**, and Paystack's fee comes out of PrimeCart's part.
- [ ] **Payout** reaches the merchant's bank or MoMo, normally next working day, for GH₵14.55.
- [ ] Repeat once with **mobile money**, if the first was a card.
- [ ] **Unpaid order:** the reminder arrives after about 30 minutes; "Pay now" works.
- [ ] **Subscription:** one real monthly payment, GH₵89.00 to PrimeCart's own account with no split, and Billing shows the new date. Founding shop shows GH₵44.50.
- [ ] **Refund** both test payments from the Paystack dashboard, and mark or cancel the test orders.
- [ ] Remove or hide the test shop.

Only after the split and payout are proven: tell merchants they can switch checkout on.

## 14. First two weeks

- [ ] Days 1 to 3: check Vercel errors, cron history, Resend failures and Paystack webhook failures daily.
- [ ] First trial reminder goes out 3 days before the trials end (day 11 after the deploy): check it arrived.
- [ ] Trials end on day 14: check what an unpaid shop sees (dashboard read-only, shop still taking orders).
- [ ] Newest file in `primecart-backups` is less than a day old. GitHub stops scheduled jobs after 60 days with no commits.
- [ ] Orders under **Needs review** handled.
- [ ] After the first successful deploy, tell me to remove the two one-off backfills from `vercel-build`.

## 15. If something goes wrong

- **Bad code:** Vercel → Deployments → previous production deployment → **Instant Rollback**. Database changes so far only add fields, so older code keeps working. For this first deploy, prefer fixing forward: the older version knows nothing about checkout-off orders, subscriptions or delivery fees, and shows the old pricing.
- **Money problem:** switch checkout off in the affected shop's settings. To stop all online payment, disable the live key in Paystack.
- **Bad data:** don't restore over the live database. Restore the newest backup into a **new, empty** database, check it, then change `DATABASE_URL` and redeploy. Orders since that backup must be added by hand.
- **Leaked key:** replace it at the provider first, then in Vercel and GitHub, then redeploy.
- **Emails stopped:** check Resend. Failed ones retry 5 times over about 17 hours, through the 5-minute job.

## 16. Looks wrong, but isn't

- Shop name, logo and colours can take up to 5 minutes to change everywhere. Payment and delivery settings reach the cart at once.
- `*.vercel.app` preview links never show shops.
- `a.b.primecart.app` is never a shop.
- Vercel may keep a "proxy" warning on the `*.primecart.app` row although shops work. Check a real shop over HTTPS instead.
- WhatsApp remembers a link's preview. After changing the shop's look, an already shared link may show the old card for a while.
- `npm audit` shows findings in Prisma's command-line tool. Fixing them needs Prisma 7, which doesn't support MongoDB.

## 17. Known gaps you are launching with

- One order can hold a shop's whole stock for up to 24 hours when checkout is on; the merchant can cancel it.
- No refunds, deposits or order editing in the dashboard: merchants refund shoppers themselves, outside PrimeCart.
- WhatsApp-agreed delivery fees on paid-online orders aren't recorded.
- Buyers get no updates after ordering (shipped, delivered).
- Shops have no returns policy page of their own (TASKS 17.8).
