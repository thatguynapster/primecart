import { NextResponse } from "next/server";

import { checkCronAuth } from "@/lib/cron";
import { expireAbandonedOrders } from "@/lib/orders/expire";
import { sendPaymentReminders } from "@/lib/orders/reminders";

/**
 * Fires every 5 minutes from cron-job.org. First releases stock holds whose
 * payment window has passed (24 hours for checkout-on storefront orders since
 * D-18c), then sends the 30-minute payment reminders (T10). Expiry runs
 * first so an order that just lapsed is never reminded.
 *
 * GET, per the handover's own sample. cron-job.org supports either GET or
 * POST for this.
 */
export async function GET(request: Request) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;

  const expired = await expireAbandonedOrders();
  const reminders = await sendPaymentReminders();
  return NextResponse.json({ ok: true, ...expired, ...reminders });
}
