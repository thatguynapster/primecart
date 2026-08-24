# Vercel & DNS Setup — `primecart.app`

Phase 4 of [`TASKS.md`](./TASKS.md). **This is the project owner's task** — it needs access to the Vercel dashboard and the domain registrar. Once it is done, tell me and I'll run the verification in the last section.

Sources: [Adding a custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Multi-tenant: configuring domains](https://vercel.com/docs/platforms/multi-tenant-platforms/configuring-domains).

---

## Read this before you start

**A wildcard domain forces you to move DNS to Vercel.** Vercel cannot issue wildcard SSL certificates unless it controls the domain's DNS, because it has to answer the ACME DNS challenge. A CNAME or A record at your current registrar **will not work** for `*.primecart.app` — this is the one part of the setup with no alternative.

That has a consequence worth pausing on:

> ⚠️ **Moving nameservers to Vercel drops every DNS record that is not recreated there.** If `primecart.app` currently has MX records for email, SPF/DKIM/DMARC TXT records, or any other subdomain in use, **write them all down first** and re-add them in Vercel's DNS after the switch. Email breaking is the usual way this goes wrong.

Take a full export of the current DNS zone before changing anything.

---

## 1. Project settings

**Root Directory: leave as the repository root.** The Next.js app is top-level (`src/`, `prisma/`, `package.json` are all at the root), so the default is correct. Do not set it to `web/` — that folder no longer exists.

Framework preset should auto-detect as Next.js. Build command, output directory and install command can all stay on their defaults.

## 2. Environment variables

Add these in **Settings → Environment Variables**, for the Production environment.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `primecart.app` |
| `DATABASE_URL` | the MongoDB Atlas connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk **production** key (see §5) |
| `CLERK_SECRET_KEY` | Clerk **production** key (see §5) |
| `PAYSTACK_SECRET_KEY` | live key at launch, test key until then |
| `PAYSTACK_PUBLIC_KEY` | live key at launch, test key until then |
| `PAYSTACK_PLAN_CODE` | live plan code at launch (D-3) |
| `CRON_SECRET` | long random string; the same value goes in cron-job.org (Phase 9) |
| `R2_*` (5 vars) | when R2 is set up (Phase 7) |

> `NEXT_PUBLIC_ROOT_DOMAIN` is the one that breaks subdomain routing if it is wrong. It is `localhost:3000` locally; in production it must be `primecart.app` with **no protocol and no port**. If it is left at the default, every storefront resolves to the marketing site instead.

**MongoDB Atlas:** allow access from Vercel. Atlas blocks by IP by default and Vercel's functions do not have fixed IPs, so either allow `0.0.0.0/0` (relying on credentials for security) or configure Atlas Private Endpoints. Without this the deploy builds fine and then fails at runtime on every database call.

> **Production uses its own database (`primecart`); the dev deployment uses `primecart-dev`.** Each deployment's `DATABASE_URL` points at its own, which is what keeps test merchants and test orders out of the live shop.
>
> A fresh database has no collections and — importantly — **none of the manual embedded indexes**. Run this once against production before anyone signs up:
>
> ```bash
> npm run db:push      # pushes the schema, then restores the embedded indexes
> ```
>
> `prisma db push` deletes the `storefront.subdomain` unique index every time it runs, which is why `db:push` chains `db:indexes`. Skipping this on a new database means two merchants can claim the same subdomain, with nothing to complain until a storefront resolves to the wrong shop.

## 3. Domains

In **Settings → Domains**:

1. Add the apex domain `primecart.app`.
2. Add the wildcard domain `*.primecart.app`.

Adding the wildcard automatically switches the project to Vercel's nameservers and shows you the values to use.

## 4. Nameservers at the registrar

Point `primecart.app` at Vercel:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

Then, in Vercel's DNS panel, **re-add every record you noted in the pre-flight step** — MX, SPF, DKIM, DMARC, and any other subdomains.

If the domain has a **CAA record**, it must permit `letsencrypt.org`, or certificate issuance silently fails.

Propagation takes anywhere from a few minutes to 48 hours. [whatsmydns.net](https://www.whatsmydns.net/) shows progress worldwide.

Once verified, Vercel issues certificates per subdomain automatically as each storefront is first visited. There is nothing to do per merchant.

## 5. Clerk production instance

Clerk's development keys only work on `localhost`. A production instance is a separate step, and it needs its **own DNS records** (`clerk`, `accounts`, `clkmail`, and two DKIM records) — which must be added in Vercel's DNS panel, since Vercel now controls the zone.

Do this at the same time as §4 so the DNS work happens once. Then put the production keys into the environment variables from §2.

## 6. Using a `dev.primecart.app` environment

If you add `*.dev.primecart.app` to test storefronts from a deployed build, that deployment needs its own root domain setting:

```
NEXT_PUBLIC_ROOT_DOMAIN=dev.primecart.app
```

**Not** `primecart.app`. The proxy resolves a subdomain relative to `NEXT_PUBLIC_ROOT_DOMAIN` and deliberately rejects multi-level subdomains. With the root set to `primecart.app`, `acme.dev.primecart.app` yields the subdomain `acme.dev`, which contains a dot, so it is rejected and the request falls through to the marketing site. Every storefront would silently serve the landing page.

With the root set to `dev.primecart.app`, `acme.dev.primecart.app` yields `acme` and routes correctly, while `dev.primecart.app` itself behaves as the root domain.

## 7. Deployment protection

If Vercel's **Deployment Protection** is enabled, it will sit in front of storefronts and require a Vercel login — customers would be unable to reach any shop. Confirm it is off for Production, or that `primecart.app` and `*.primecart.app` are exempt.

---

## 8. cron-job.org — the two scheduled jobs

Vercel Cron needs a Pro plan, so the handover specifies cron-job.org instead. Because it calls over the public internet, both endpoints check a bearer token — without it, anyone who learns the URL can trigger mass order expiry.

> ⚠️ **`CRON_SECRET` must be ASCII.** HTTP header values are not UTF-8. A secret containing a non-ASCII character (`£`, `–`, `é`) survives inside Node but is mangled by any latin1↔utf8 reinterpretation on the wire, so the comparison fails and the endpoint returns 401 **every time, silently**. The visible symptom is not an error — it is abandoned orders never expiring and reserved stock never coming back.
>
> Generate a safe one:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
> ```
>
> `base64url` output is `A–Z a–z 0–9 _ -` only. Put the same value in `.env`, in Vercel's environment variables, and in the cron-job.org header.

### Creating a job

1. Sign in at [cron-job.org](https://cron-job.org) → **Cronjobs** → **Create cronjob**.
2. **Title** — "PrimeCart · expire abandoned orders".
3. **URL** — `https://primecart.app/api/cron/expire-orders`
4. **Execution schedule** — choose *Every 5 minutes*, or the custom option with minutes `0,5,10,…,55` and every hour, day, month and weekday. (The API models this as minute arrays; the dashboard offers the interval directly.)
5. Open **Advanced** → **Headers**. Add one:

   | Key | Value |
   | --- | --- |
   | `Authorization` | `Bearer <your CRON_SECRET>` |

   The word `Bearer`, one space, then the secret — this is compared literally against `Bearer ${process.env.CRON_SECRET}`.
6. **Request method** — `GET`.
7. Save, then use **Test run**. Expect **200**. A **401** means the header does not match; a **404** means the route is not deployed yet.

### The second job (D-17 — dormant-shop digest)

Same procedure, different URL and schedule. Superseded the original "expire trials" job when the subscription model was replaced with D-16/D-17 (2026-08-24) — there is no trial to expire any more, but a weekly check for inactive shops replaced it.

- **Title** — "PrimeCart · dormant shop digest"
- **URL** — `https://primecart.app/api/cron/dormant-digest`
- **Schedule** — once weekly
- **Same** `Authorization` header
- Also needs `ADMIN_NOTIFICATION_EMAIL` set in the Production environment — the endpoint refuses to run without it, the same way it refuses without `CRON_SECRET`.

### Notes

- **A job acts on whichever database its host is wired to.** Each deployment has its own:

  | Host | Database |
  | --- | --- |
  | `primecart.app` | `primecart` — real merchants and real orders |
  | `dev.primecart.app` | `primecart-dev` — test data |

  So the host in the URL decides which orders get expired and whose stock moves. These jobs are not read-only checks: they cancel orders and put stock back.

  **The live jobs point at `primecart.app`.** A second pair aimed at `dev.primecart.app` is optional and safe — useful for exercising the flow against test data before trusting it in production. Just never point two jobs at the same host, or the order-expiry pair will try to expire the same orders twice.
- cron-job.org retries and emails on repeated failure — leave that on. A silently dead expiry job leaks stock; a silently dead digest just means you stop hearing about dormant shops, which is quieter to miss — worth checking its execution history occasionally.
- Create each job only after its endpoint is actually deployed, or the test run will 404.

## 9. Paystack webhook URL — required, not automatic

> ⚠️ **Found missing during the pre-deploy smoke test (2026-08-16).** Nothing in this project's own code registers a webhook URL with Paystack — that is a one-time setting made by hand in the Paystack Dashboard, per Paystack's own account, and it does not exist until someone sets it. Without it, **no payment or subscription event ever reaches `/api/webhooks/paystack`**, no matter how correct that route's own code is. This was confirmed live: a real order paid successfully on `dev.primecart.app` and a real subscription was paid for, and neither one confirmed — Paystack's servers had nowhere configured to tell PrimeCart it happened. Manually replaying the same signed payload against the live endpoint confirmed both instantly, which is what proved the *code* was fine and the *registration* was the gap.

### Setting it

1. Sign in to the Paystack Dashboard for the account this project uses.
2. **Settings → API Keys & Webhooks.**
3. Under **Webhook URL**, set:

   | Environment | URL |
   | --- | --- |
   | Test mode | `https://dev.primecart.app/api/webhooks/paystack` |
   | Live mode | `https://primecart.app/api/webhooks/paystack` |

   Paystack's Test/Live toggle (top-right of the dashboard) switches which webhook URL you are editing — set both, one at a time.
4. Save. No further action needed — `verifySignature()` in the route already validates every delivery against `PAYSTACK_SECRET_KEY`, so this is the only missing piece.

### Verifying it worked

Place one real test-mode order through the actual storefront (`<merchant>.dev.primecart.app`) using Paystack's on-screen "Success" test card, then check the order in `/dashboard/orders` — it should move from **Pending/Unpaid** to **Confirmed/Paid** within a few seconds on its own, with no manual intervention. If it sits at Pending for more than about a minute, the webhook URL is still not registered (or is pointed at the wrong host — the URL's own domain decides which deployment's route receives it, same as the cron jobs above).

**Do this before relying on cron-job.org's registration or any other setup step** — a merchant's storefront and dashboard both look and behave completely normally without it right up until the moment a real customer pays and nothing happens.

## Troubleshooting

**"Failed to check whether a proxy is in front of this domain."**
Vercel probes `/.well-known/vercel/*` on the domain to verify it and detect third-party proxies. The check fails if it cannot get a clean response. In order of likelihood:

1. **No deployment exists yet.** The domain resolves to Vercel, but Vercel has nothing to serve, so the probe gets `DEPLOYMENT_NOT_FOUND`. Confirm with `curl -sI https://primecart.app/` — an `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` header means the domains are fine and the project simply needs its first deploy.
2. **DNS has not propagated.** Check with `nslookup -type=NS primecart.app` — it should return `ns1`/`ns2.vercel-dns.com`.
3. **A third-party proxy (e.g. Cloudflare orange-cloud) is in front**, blocking or caching `/.well-known/*`. If responses carry an `X-Vercel-Id` header, traffic is reaching Vercel directly and this is not the cause.
4. **The app itself is intercepting `/.well-known/*`.** The proxy treats that prefix as public for exactly this reason; if it is ever removed, verification and certificate renewal fail with an error that names neither.

The error is about the *check*, not about your DNS. DNS and TLS can be entirely correct while it shows.

## Verification — tell me when §1–4 are done

I will then confirm:

| Check | Expected |
| --- | --- |
| `primecart.app` | 200, marketing site |
| `www.primecart.app` | 200, marketing site (not treated as a store) |
| `<merchant>.primecart.app` for a real merchant | 200, that merchant's storefront |
| `nosuchstore.primecart.app` | 404 `Store not found` |
| an inactive storefront | "store unavailable" page, not a 404 |
| HTTPS on a subdomain | valid certificate, no warning |
| `x-merchant-id` in response headers | **absent** — it must reach the app only, never the browser |

All of these already pass locally against `*.localhost:3000`; this run confirms the same behaviour through real DNS and TLS.

---

## Known behaviours, so they don't look like bugs later

- **Preview deployments won't route storefronts.** A preview URL is `*.vercel.app`, which doesn't match `NEXT_PUBLIC_ROOT_DOMAIN`, so the proxy treats it as the root domain and serves the marketing site. Storefronts can only be tested on production or locally. To exercise them on a preview, that deployment needs its own subdomain of `primecart.app` and a matching `NEXT_PUBLIC_ROOT_DOMAIN`.
- **Nested subdomains are not stores.** `a.b.primecart.app` resolves at Vercel, but the proxy deliberately rejects multi-level subdomains and serves the marketing site. Only single-level `merchant.primecart.app` is a storefront.
- **Long branch names can break preview URLs.** Each DNS label caps at 63 characters, and a long branch name plus a tenant subdomain can exceed it. Keep branch names short.
- **Storefront changes take up to 5 minutes to appear.** The proxy caches merchant lookups for 5 minutes (handover §Proxy, Fix 1). Task 3.11 wires up explicit invalidation in Phases 6 and 13; until then, a newly created or renamed storefront may lag.
