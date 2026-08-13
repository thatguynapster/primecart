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
