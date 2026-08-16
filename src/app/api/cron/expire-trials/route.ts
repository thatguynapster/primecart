import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";
import { expireLapsedTrials } from "@/lib/subscription";

/**
 * Fires once a day from cron-job.org: trial merchants who never subscribed
 * lose dashboard access and their storefront goes offline (13.2 + 13.7).
 *
 * Separate endpoint from the order-expiry cron (9.13) — different schedule,
 * different failure blast radius — but shares its auth check (checkCronAuth)
 * and its claim-then-act race-safety pattern.
 */
export async function GET(request: Request) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await expireLapsedTrials();
  return NextResponse.json({ ok: true, ...result });
}
