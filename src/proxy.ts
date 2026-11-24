import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { BILLING_SEEN_COOKIE, BILLING_SEEN_SECONDS } from "@/lib/billing/seen-cookie";
import { isOffline } from "@/lib/billing/status";
import { getSubdomain } from "@/lib/domain";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";

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
const PUBLIC_EXACT = new Set(["/", "/store-unavailable", "/privacy", "/terms"]);
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

    // Switched off, or lapsed for long enough (D-25). When lapsed, buyers keep
    // their order pages, which is how they reach the shop about an order.
    const isOrderPage = url.pathname.startsWith("/orders/");
    if (!merchant.isActive || (isOffline(merchant, new Date()) && !isOrderPage)) {
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

  // D-24: a lapsed merchant sees billing before the rest of the dashboard.
  // Pages can't set cookies, so it's recorded here.
  const response = NextResponse.next();
  if (url.pathname === "/dashboard/billing") {
    response.cookies.set(BILLING_SEEN_COOKIE, "1", {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      path: "/dashboard",
      maxAge: BILLING_SEEN_SECONDS,
    });
  }
  return response;
}, {
  // Send unauthenticated users to this app's sign-in screens. Without these,
  // auth.protect() redirects to Clerk's hosted accounts.dev pages — the
  // ClerkProvider props in the layout only affect client components.
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
});

export const config = {
  // Skip static assets and Next internals; run on everything else, including
  // API routes. Server Actions POST to the route they are used on, so they are
  // covered by this matcher too — but authorization is still re-checked inside
  // each action rather than relying on the proxy alone.
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
