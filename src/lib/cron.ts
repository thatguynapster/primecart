import { NextResponse } from "next/server";

/**
 * Bearer-token check for cron endpoints.
 *
 * Shared by the order-expiry job (Phase 9) and, in Phase 13, the trial-expiry
 * job. cron-job.org calls these over the public internet — unlike Vercel Cron,
 * which calls internally — so without this, anyone who learns the URL could
 * trigger mass order expiry or trial lockouts.
 *
 * @returns a response to send immediately if unauthorized, or null to continue.
 */
export function checkCronAuth(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Refuse rather than silently run unprotected. A misconfigured deploy
    // should fail loudly here, not accept requests from anyone.
    console.error("CRON_SECRET is not set — refusing all cron requests.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
