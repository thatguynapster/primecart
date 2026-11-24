import { getBillingState } from "@/lib/billing/state";
import { reminderFor } from "@/lib/billing/reminder-due";
import { daysLeft, lastAccessEnd } from "@/lib/billing/status";
import { oid } from "@/lib/db/embedded";
import { notifyBillingReminder } from "@/lib/notifications/events";
import { prisma } from "@/lib/prisma";

/**
 * D-18 §6 — billing reminder emails, from a daily cron:
 *   trial ending in 3 days and 1 day; renewal due in 7 days and 1 day;
 *   expired, then the day before the shop stops taking orders (both only
 *   within the grace period, D-24, so the first run
 *   doesn't email long-gone accounts).
 *
 * Claim-then-send per reminder: the key names the reminder AND the date it's
 * about (`trial-3:<trialEndsAt>`), pushed onto Merchant.billingReminderKeys
 * by an update that only matches while the key is absent. Overlapping runs
 * can't double-send, and paying (which moves the date) re-arms them.
 *
 * A system job across all merchants, so not merchantId-first by design.
 */
export async function sendBillingReminders(): Promise<{ sent: number }> {
  const now = new Date();
  const merchants = await prisma.merchant.findMany({
    where: { storefront: { isNot: null }, subscriptionStatus: { not: null } },
  });

  let sent = 0;
  for (const merchant of merchants) {
    const billing = getBillingState(merchant);
    const lapsedAt = billing.status === "LAPSED" ? lastAccessEnd(merchant) : null;

    const due = reminderFor(billing.status, billing.endsAt, lapsedAt, now);
    if (!due) continue;

    const key = `${due.kind}:${due.date.toISOString()}`;
    const claimed = (await prisma.$runCommandRaw({
      update: "Merchant",
      updates: [
        {
          q: { _id: oid(merchant.id), billingReminderKeys: { $ne: key } },
          u: { $push: { billingReminderKeys: key } },
        },
      ],
    })) as { nModified?: number };
    if (!claimed.nModified) continue;

    await notifyBillingReminder({
      merchantEmail: merchant.email,
      kind: due.kind,
      date: due.date,
      daysLeft: daysLeft(due.date, now),
    });
    sent += 1;
  }

  return { sent };
}
