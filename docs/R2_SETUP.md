# Cloudflare R2 — getting the credentials

Task 7.7 of [`TASKS.md`](./TASKS.md). You have already created the bucket; this covers the settings to apply and where each of the five environment variables comes from.

Sources: [R2 API tokens](https://developers.cloudflare.com/r2/api/tokens/), [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/).

---

## What we need, and where each value comes from

| Variable | Where |
| --- | --- |
| `R2_BUCKET_NAME` | the name you gave the bucket |
| `R2_ACCOUNT_ID` | R2 overview → **Account details** |
| `R2_ACCESS_KEY_ID` | created in step 2 |
| `R2_SECRET_ACCESS_KEY` | created in step 2 — **shown once** |
| `R2_PUBLIC_URL` | enabled in step 3 |

---

## 1. Account ID

Cloudflare dashboard → **R2 Object Storage**. On the overview page, the **Account details** panel on the right shows **Account ID**. Copy it.

Cross-check: the same value appears in your bucket's S3 API endpoint, which reads `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

> If you created the bucket with a **jurisdiction** (EU or FedRAMP), the endpoint is different — `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com` for EU. Check the endpoint shown on your bucket's settings page and tell me if it is not the plain form, because the client has to be configured to match.

## 2. API token → Access Key ID and Secret Access Key

1. **R2 Object Storage** → **Account details** panel → next to **API Tokens**, select **Manage**.
2. **Create API token**. A *User API token* is fine; an Account API token requires Super Administrator.
3. Permission: **Object Read & Write**.
   Not "Admin Read & Write" — the app only needs to put and read objects, and a leaked key should not be able to delete buckets.
4. Scope it: choose **Apply to specific buckets** and select your bucket, rather than all buckets.
5. TTL: leave as-is unless you have a rotation policy.
6. **Create User API token**.

The result page shows **Access Key ID** and **Secret Access Key**.

> **Copy the Secret Access Key now.** Cloudflare does not show it again. If you lose it, delete the token and create another — there is no way to reveal it later.

Ignore the "Token value" and the pre-filled `aws` CLI snippet on that page; we only need those two values.

## 3. Public access → `R2_PUBLIC_URL`

Product images are served straight to shoppers' phones, so the bucket must be publicly readable with no signed URLs.

1. Select your bucket → **Settings**.
2. Under **Public Development URL**, select **Enable**.
3. Type `allow` to confirm, then **Allow**.

Copy the URL it gives you — it looks like `https://pub-<hash>.r2.dev`. **No trailing slash.**

## 4. Settings you can leave alone

- **CORS** — not needed. Uploads go through our server (a Server Action holds the credentials and puts the object), so the browser never talks to R2 directly. If we later move to presigned direct-from-browser uploads, CORS becomes necessary.
- **Lifecycle rules** — not needed; product images are kept as long as the product exists.
- **Object lock, event notifications, Sippy** — not needed.

---

## Read this before launch: `r2.dev` is not a production URL

Cloudflare is explicit that the Public Development URL is **rate-limited and intended for development only**. It has no caching, no WAF, and no Bot Management. For a live storefront serving product images to customers, that is a real risk — images could be throttled exactly when a shop gets busy.

The production answer is a **custom domain** on the bucket, e.g. `images.primecart.app`. That gives normal Cloudflare caching and no rate limit.

**The complication:** connecting a custom domain requires that domain to exist as a **zone in the same Cloudflare account**. `primecart.app` currently uses **Vercel's nameservers** — which is not optional, because wildcard subdomains (`*.primecart.app`) require Vercel to control DNS for the certificate challenge.

Cloudflare documents a **partial (CNAME) setup** for domains whose DNS is hosted elsewhere, which is the path that would apply here. Worth confirming it is available on your Cloudflare plan before relying on it.

**This does not block anything now.** Use the Public Development URL to build and test image upload. The decision to make before launch is one of:

1. Partial (CNAME) setup for `images.primecart.app` in Cloudflare, keeping Vercel nameservers on the apex.
2. A separate domain for images, hosted fully on Cloudflare.
3. Accept `r2.dev` at launch and revisit when traffic justifies it — the weakest option, but survivable at low volume.

`R2_PUBLIC_URL` is a single environment variable, so switching later is a config change, not a code change.

---

## When you have the five values

Paste them into `.env` and tell me — 7.8 (the client) and 7.9 (upload) are a contained piece of work from there.

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
```

They also need adding to Vercel's environment variables for the deployed app.
