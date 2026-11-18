import { NextResponse } from "next/server";

import { sendBillingReminders } from "@/lib/billing/reminders";
import { checkCronAuth } from "@/lib/cron";

/**
 * Daily, from cron-job.org (same `CRON_SECRET` bearer as the other jobs).
 * Trial-ending, renewal-due and expired emails (D-18 §6). Safe to run more
 * often: each reminder is claimed once per date.
 */
export async function GET(request: Request) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await sendBillingReminders();
  return NextResponse.json({ ok: true, ...result });
}
