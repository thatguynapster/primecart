import { NextResponse } from "next/server";

import { listDormantMerchants } from "@/lib/admin/dormancy";
import { checkCronAuth } from "@/lib/cron";
import { notifyDormantMerchants } from "@/lib/notifications/events";

/**
 * D-17 — fires weekly from cron-job.org: emails the owner a list of shops
 * with no paid orders in the last 30 days. Flags only — never pauses or
 * touches a merchant's storefront, see docs/TASKS.md's D-17.
 *
 * Shares checkCronAuth with the order-expiry job (Phase 9), same reasoning:
 * cron-job.org calls this over the public internet, so it needs its own
 * bearer-token check rather than relying on being unguessable.
 */
export async function GET(request: Request) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.error("ADMIN_NOTIFICATION_EMAIL is not set — refusing to run the dormancy digest.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const merchants = await listDormantMerchants();
  if (merchants.length > 0) {
    await notifyDormantMerchants({ adminEmail, merchants });
  }

  return NextResponse.json({ ok: true, dormant: merchants.length });
}
