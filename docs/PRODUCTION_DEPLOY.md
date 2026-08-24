# Going live on `primecart.app` — production deploy runbook

This is the project owner's checklist — everything here needs access to Vercel, GitHub, MongoDB Atlas, Clerk, Paystack, and cron-job.org dashboards that I don't have. Follow it top to bottom; each section says what to do and how to know it worked. Tell me when you hit a step you want me to verify (I can check most things from the command line once a URL is live) or if any step surfaces something unexpected — several of these have "known behaviours" call-outs from when we set up `dev.primecart.app`, worth reading even if they seem to not apply.

**Where things stand right now**, so you know why each section exists:

- `dev.primecart.app` is live and working — wildcard TLS, subdomain routing, Clerk (dev keys), Paystack (test mode) all verified end-to-end.
- `primecart.app` (the apex/production domain) currently returns `DEPLOYMENT_NOT_FOUND` — no deployment has ever been assigned to it.
- All the work since Phase 8 (dashboard, storefront redesign, subscriptions — everything `dev.primecart.app` is running) lives on the `feat/v2` branch. `main` is 40 commits behind and does not have any of it.
- Vercel's Production Branch is (almost certainly) still `main` by default — that's what needs to change first.

---

## 1. Merge `feat/v2` into `main`

This is the actual "go live" trigger — Vercel builds a Production deployment automatically on every push/merge to the Production Branch, and until `main` has this code, `primecart.app` has nothing to serve.

```bash
git push -u origin feat/v2   # if not already pushed
```

Then, on GitHub: open a pull request from `feat/v2` into `main`, review it, and merge (a regular merge is fine — no need to squash 40 commits into one, the history is meaningful).

```bash
gh pr create --base main --head feat/v2 --title "Go live: merge v2 into main" --body "All Phase 8-14 work, ready for production."
gh pr merge --merge
```

**Don't push to `main` yet if you're not ready for Vercel to attempt a Production build** — sections 2-6 below set up the environment variables and external services that build needs to succeed against. If you merge before finishing them, the deployment will build but fail at runtime (missing Clerk keys reproduce the exact `MIDDLEWARE_INVOCATION_FAILED` 500 we saw during the Phase 4 apex-domain check). Safe order: do sections 2-6 first, merge last (section 7 says so again).

---

## 2. MongoDB Atlas — production database

The dev deployment uses `primecart-dev`; production needs its own separate database so real merchants and orders never mix with test data.

1. In Atlas, create a new database named `primecart` on the same cluster (or a separate cluster if you want stronger isolation — either works, this app doesn't care).
2. Confirm network access allows Vercel's traffic. Vercel serverless functions have no fixed IPs, so either:
    - Allow `0.0.0.0/0` in Atlas's IP Access List (relies on the connection string's credentials for security — this is what `dev.primecart.app` already uses), or
    - Set up Atlas Private Endpoints (more work, not necessary at this scale).
3. Build the production connection string — same shape as `.env.example`'s `DATABASE_URL`, pointing at `primecart` instead of `primecart-dev`.
4. **Before anyone can sign up**, push the schema and restore the manual embedded indexes against this new database:

    ```bash
    DATABASE_URL="<production connection string>" npm run db:push
    ```

    This is not optional — `prisma db push` alone drops the `storefront.subdomain` unique index, and without it two merchants could claim the same subdomain with nothing to stop them.

Keep this connection string handy for section 5.

---

## 3. Clerk — production instance

Development keys (`pk_test_...`/`sk_test_...`) only work on `localhost`. Production needs its own instance.

1. [Clerk Dashboard](https://dashboard.clerk.com) → click **Development** at the top → **Create production instance**.
2. When asked, clone your development settings (sign-in/sign-up config, etc.) — note that SSO connections, integrations, and custom paths do **not** copy over and need reconfiguring if you use any.
3. Go to the **Domains** page in the new production instance and add `primecart.app`. Clerk will show you the DNS records to add (typically a handful of CNAMEs: `clerk`, `accounts`, `clkmail`, plus two DKIM records for email).
4. Add those DNS records in **Vercel's DNS panel** (not your old registrar — see section 4, DNS already lives at Vercel because of the wildcard domain). DNS propagation can take up to 48 hours, though it's usually much faster.
5. Once verified, a **Deploy certificates** button appears on the Clerk Dashboard home — click it.
6. Copy the production **Publishable Key** (`pk_live_...`) and **Secret Key** (`sk_live_...`) from the API Keys page. Keep them for section 5.

Do this DNS work in the same sitting as anything else touching Vercel's DNS panel (there isn't anything else pending right now, but if there ever is, batching avoids waiting on propagation twice).

---

## 4. Confirm the apex + wildcard domains

These were already added to the Vercel project during the `dev.primecart.app` setup — this section is a **check**, not new work, unless something's missing.

In Vercel **Project Settings → Domains**, confirm both are present:

- `primecart.app`
- `*.primecart.app`

If either is missing, add it — adding a wildcard domain requires the project's DNS to already be on Vercel's nameservers, which it is (confirmed working, since `*.dev.primecart.app` resolves).

If you see a **"Failed to check whether a proxy is in front of this domain"** warning at this stage, that's expected right now — it just means no Production deployment exists yet (`DEPLOYMENT_NOT_FOUND`), which section 7 fixes. Don't chase it further until after the merge.

> **If the warning is still there after the deployment succeeds** (confirmed via `docs/VERCEL_SETUP.md`'s troubleshooting list — deployment exists, DNS is on Vercel's nameservers, no third-party proxy): check whether `primecart.app` has a **redirect to `www.primecart.app`** configured on its Domains row. A redirect there fires on every path, including Vercel's own `.well-known/vercel/probe` health check, so the apex domain can never answer its own probe and the check never clears. Fix: set that domain's redirect to "No Redirect" so it serves content directly (and, if you want `www` to still work, point *its* redirect at the bare apex instead, not the other way around). This is exactly what happened during this project's own production rollout — worth checking first before assuming DNS or the deployment is at fault.
>
> **If the warning persists specifically on the `*.primecart.app` (wildcard) row, after the apex/www rows both show "Valid Configuration"**: this looks like a separate, narrower issue from the one above. Confirmed live during this project's own rollout — DNS was correct (`ns1`/`ns2.vercel-dns.com`), and an arbitrary test subdomain (`<anything>.primecart.app`) resolved with valid HTTPS and a correct response from the deployed app, meaning the wildcard domain was functionally working end to end despite the dashboard warning. The likely explanation: Vercel's proxy-check needs one concrete hostname to probe, and a wildcard entry has no single literal host to check against. **Pending confirmation from Vercel support** — if you're reading this, check whether that ticket got an answer before assuming it's benign; if support confirmed it's expected/cosmetic for wildcard entries, this note should be updated to say so plainly instead of "pending."

---

## 5. Environment variables — Production scope

In Vercel **Project Settings → Environment Variables**, add each of these scoped to **Production** (not Preview — the Preview scope already has `dev.primecart.app`'s values and should stay untouched).

| Variable                                                                                       | Production value                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ROOT_DOMAIN`                                                                      | `primecart.app` — no protocol, no port. **Get this wrong and every storefront silently serves the marketing site instead of a 500, which makes it easy to miss.**                                                                                                    |
| `DATABASE_URL`                                                                                 | the production connection string from section 2                                                                                                                                                                                                                      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                                                            | the `pk_live_...` key from section 3                                                                                                                                                                                                                                 |
| `CLERK_SECRET_KEY`                                                                             | the `sk_live_...` key from section 3                                                                                                                                                                                                                                 |
| `PAYSTACK_SECRET_KEY`                                                                          | **live** secret key (Paystack Dashboard → Settings → API Keys & Webhooks, Live mode toggle)                                                                                                                                                                          |
| `PAYSTACK_PUBLIC_KEY`                                                                          | **live** public key, same place                                                                                                                                                                                                                                      |
| `PAYSTACK_PLAN_CODE`                                                                           | the live-mode plan code from section 6 below — do section 6 first, then come back and fill this in                                                                                                                                                                   |
| `CRON_SECRET`                                                                                  | a new long random string, **not** the one `dev.primecart.app` uses (keeps the two environments' cron jobs from being interchangeable/replayable against each other) — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | same values as `dev.primecart.app` — this is the same bucket, shared across both environments (confirmed decision: staying on the `pub-*.r2.dev` URL for now rather than a custom domain; see `docs/R2_SETUP.md` if you want to revisit that later)                  |
| `RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`                                                   | same values as `dev.primecart.app` — the sending domain is already verified                                                                                                                                                                                          |

---

## 6. Paystack — live plan + webhook

1. **Create the live-mode subscription plan.** Paystack Dashboard → switch the Test/Live toggle (top-right) to **Live** → **Payments → Plans → Create Plan**. Match the test plan's configuration (GHS 79/month, whatever billing interval it's set to). Copy the resulting `PLN_...` code and go back to fill in `PAYSTACK_PLAN_CODE` in section 5.
2. **Register the live webhook URL.** Still in Live mode: **Settings → API Keys & Webhooks → Webhook URL**, set it to:

    ```
    https://primecart.app/api/webhooks/paystack
    ```

    Nothing in this codebase registers this automatically — it's a one-time dashboard setting, and without it no payment or subscription event ever reaches the app, no matter how correct the webhook route's code is. This exact gap was found and fixed for `dev.primecart.app` during Phase 13 (see `docs/VERCEL_SETUP.md` §9) — same trap applies here in Live mode.

---

## 7. Merge and deploy

With sections 2-6 done, now do section 1's merge (or push to `main` if it's already merged and just waiting). Vercel will automatically start a Production build.

Watch it in the Vercel dashboard's **Deployments** tab. Once it finishes:

```bash
curl -sI https://primecart.app/
```

Expect a `200`, not `DEPLOYMENT_NOT_FOUND` or `MIDDLEWARE_INVOCATION_FAILED`. If you get the latter, it's almost certainly a missing/invalid Clerk production key — that exact symptom (every route, including the marketing site, 500s) is what a bad Clerk key produces, reproduced and confirmed during Phase 4.

---

## 8. cron-job.org — two live jobs

Register both jobs pointed at `primecart.app`, using the **Production** `CRON_SECRET` from section 5 (not the `dev.primecart.app` one). Full instructions with a walkthrough of what each field means: `docs/VERCEL_SETUP.md` §8. Quick reference:

| Job                     | URL                                            | Schedule        |
| ----------------------- | ---------------------------------------------- | --------------- |
| Expire abandoned orders | `https://primecart.app/api/cron/expire-orders` | every 5 minutes |
| Expire lapsed trials    | `https://primecart.app/api/cron/expire-trials` | once daily      |

Both need an `Authorization: Bearer <production CRON_SECRET>` header. Use each job's **Test run** button and expect `200` — a `401` means the header doesn't match what's in Vercel's env vars, a `404` means the deployment from section 7 hasn't finished yet.

**Never point one of these at the wrong host** — the URL's domain decides which database's orders/trials get acted on. Keep the `dev.primecart.app` jobs (if you have any) pointed at `dev.primecart.app`, and these new ones at `primecart.app`, and never cross them.

---

## 9. Deployment Protection

Vercel **Project Settings → Deployment Protection** — confirm it's **off** for the Production environment, or that `primecart.app`/`*.primecart.app` are explicitly exempt. If it's on and not exempted, every shopper hitting a storefront gets a Vercel login wall instead of the shop.

---

## 10. Verification checklist

Work through this in order — each row catches a different category of mistake.

| Check                        | Command / action                                                                                                   | Expected                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing site               | `curl -sI https://primecart.app/`                                                                                  | `200`                                                                                                                                                         |
| `www` variant                | `curl -sI https://www.primecart.app/`                                                                              | `200`, marketing site (not treated as a store)                                                                                                                |
| A real storefront            | visit `<merchant>.primecart.app` for a merchant you create for this test                                           | `200`, that merchant's storefront, correct branding                                                                                                           |
| Unknown store                | `curl -sI https://nosuchstore.primecart.app/`                                                                      | `404` "Store not found"                                                                                                                                       |
| Inactive storefront          | deactivate a test merchant, visit their subdomain                                                                  | "store unavailable" page, not a raw 404                                                                                                                       |
| Wildcard TLS                 | any storefront over `https://`                                                                                     | valid certificate, no browser warning                                                                                                                         |
| Header leak                  | `curl -sI https://<merchant>.primecart.app/`                                                                       | `x-merchant-id` **absent** from the response — it must never reach the browser                                                                                |
| Sign-up → onboarding         | create a real account through `primecart.app/sign-up`                                                              | lands in onboarding, creates a merchant, Paystack subaccount succeeds                                                                                         |
| A real trial subscription    | complete `/billing` with a real card in **live mode** (small real charge — use your own card, refund/cancel after) | subscription activates, `/dashboard/settings` shows the correct billing status                                                                                |
| Real payment confirms itself | place one real order through a live storefront                                                                     | moves from Pending to Confirmed within seconds, with **no manual intervention** — if it sits at Pending, the webhook URL from section 6 is wrong or not saved |
| Cron jobs                    | check cron-job.org's execution history a few minutes after setup                                                   | both jobs showing `200`, not `401`/`404`                                                                                                                      |

This mirrors the same checklist that verified `dev.primecart.app` (`docs/VERCEL_SETUP.md`'s own Verification section), plus the two items that only matter once real money is involved: a live subscription charge and a live storefront order.

---

## 11. After it's confirmed working

Tell me and I'll:

- Update `docs/TASKS.md` — mark 4.2 (apex/production domain), 13.4 (cron registration), and 13.13 (live plan code) as done, with the date.
- Remove or archive this file's "outstanding" framing once it's no longer forward-looking.

---

## Known things that will look like bugs but aren't

Carried over from `docs/VERCEL_SETUP.md`, still true for production:

- **Preview deployments never route storefronts.** A preview URL is `*.vercel.app`, doesn't match `NEXT_PUBLIC_ROOT_DOMAIN`, so the proxy serves the marketing site instead. Storefronts only work on Production or local.
- **Nested subdomains are not stores.** `a.b.primecart.app` is rejected by the proxy on purpose.
- **Storefront changes can lag up to 5 minutes.** The proxy caches merchant lookups; a just-created or just-renamed storefront may take a few minutes to appear correctly.
- **`NEXT_PUBLIC_ROOT_DOMAIN` typos fail silently**, not loudly — worth double-checking directly in the Vercel dashboard after saving, not just trusting what you typed.
