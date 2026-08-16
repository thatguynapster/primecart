import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";
import { expireAbandonedOrders } from "@/lib/orders/expire";

/**
 * Fires every 5 minutes from cron-job.org: releases reservations whose
 * 30-minute payment window has passed. GET, per the handover's own sample —
 * cron-job.org supports either GET or POST for this.
 */
export async function GET(request: Request) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await expireAbandonedOrders();
  return NextResponse.json({ ok: true, ...result });
}
