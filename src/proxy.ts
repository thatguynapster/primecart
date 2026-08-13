import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getSubdomain } from "@/lib/domain";
import { getMerchantBySubdomain, getSubscriptionStatus } from "@/lib/merchant/lookup";

/**
 * Proxy — request routing for the multi-tenant app.
 *
 * Next.js 16 renamed Middleware to Proxy; this file replaces `middleware.ts`.
 * Proxy runs on the Node.js runtime by default in 16, which is what lets Prisma
 * be used here at all — it cannot run on the Edge runtime.
 *
 * Two kinds of traffic arrive here:
 *
 *   <merchant>.primecart.app  -> public storefront, rewritten to /store/<sub>
 *   primecart.app             -> marketing site and merchant dashboard
 *
 * Storefront requests never reach Clerk-protected routes; storefront customers
 * check out as guests and have no accounts.
 */

/**
 * Route classification.
 *
 * Deliberately plain path checks rather than Clerk's `createRouteMatcher`,
 * which is deprecated in v7 and slated for removal. Clerk's own guidance is
 * that path matching in middleware can diverge from how Next.js actually routes
 * a request, so these proxy checks are a first line of defence only — every
 * page, route handler and Server Action that touches merchant data must
 * re-derive the merchant from the session and authorize independently.
 */
const PUBLIC_EXACT = new Set(["/", "/store-unavailable"]);
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/api/webhooks",
  "/api/cron",
  // Domain-verification and well-known URIs (RFC 8615). Vercel probes
  // /.well-known/vercel/* to verify the domain and detect proxies in front of
  // it, and Let's Encrypt uses /.well-known/acme-challenge/* for HTTP-01.
  // Redirecting these to sign-in makes domain verification and certificate
  // issuance fail, with an error that names neither.
  "/.well-known",
];

/** Root-domain routes reachable without signing in. */
function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Routes gated behind an active (or trialling) subscription. */
function isDashboardRoute(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

/**
 * Where an EXPIRED merchant is sent to reactivate.
 *
 * Requires sign-in — it is a merchant's own billing page, not a public page —
 * but is deliberately *not* a dashboard route, so the subscription guard below
 * never redirects it back to itself.
 */
const BILLING_PATH = "/billing";

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;
  const subdomain = getSubdomain(req.headers.get("host"));

  // -------------------------------------------------------------------------
  // Storefront traffic
  // -------------------------------------------------------------------------
  if (subdomain) {
    let merchant;
    try {
      merchant = await getMerchantBySubdomain(subdomain);
    } catch {
      // Fail open. A database blip must not take every storefront offline —
      // the request continues and the page itself decides what to render.
      return NextResponse.next();
    }

    if (!merchant) {
      return new NextResponse("Store not found", { status: 404 });
    }

    // Only the id and slug are forwarded, never the merchant record. These are
    // set as *request* headers: response headers would be sent to the browser
    // instead, where the app cannot read them and the id would leak to the
    // client.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-merchant-id", merchant.id);
    requestHeaders.set("x-merchant-slug", merchant.subdomain);

    // Subscription lapsed — the store exists but is switched off.
    if (!merchant.isActive) {
      return NextResponse.rewrite(new URL("/store-unavailable", req.url), {
        request: { headers: requestHeaders },
      });
    }

    return NextResponse.rewrite(
      new URL(`/store/${subdomain}${url.pathname}${url.search}`, req.url),
      { request: { headers: requestHeaders } }
    );
  }

  // -------------------------------------------------------------------------
  // Root domain — marketing site, auth, dashboard
  // -------------------------------------------------------------------------
  if (isPublicRoute(url.pathname)) {
    return NextResponse.next();
  }

  await auth.protect();

  if (isDashboardRoute(url.pathname)) {
    const { userId } = await auth();

    if (userId) {
      try {
        const status = await getSubscriptionStatus(userId);
        if (status === "EXPIRED") {
          return NextResponse.redirect(new URL(BILLING_PATH, req.url));
        }
      } catch {
        // Fail open, consistent with the storefront path: a lookup failure
        // must not lock a paying merchant out of their own dashboard.
        return NextResponse.next();
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  // Skip static assets and Next internals; run on everything else, including
  // API routes. Server Actions POST to the route they are used on, so they are
  // covered by this matcher too — but authorization is still re-checked inside
  // each action rather than relying on the proxy alone.
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
