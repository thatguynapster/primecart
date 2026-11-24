import { getBillingState } from "@/lib/billing/state";
import { GRACE_DAYS, daysLeft, lastAccessEnd } from "@/lib/billing/status";
import { oid } from "@/lib/db/embedded";
import { notifyBillingReminder, type BillingReminderKind } from "@/lib/notifications/events";
import { prisma } from "@/lib/prisma";

/**
 * D-18 §6 — billing reminder emails, from a daily cron:
 *   trial ending in 3 days and 1 day; renewal due in 7 days and 1 day;
 *   expired (only within the grace period, D-24, so the first run
 *   doesn't email long-gone accounts).
 *
 * Claim-then-send per reminder: the key names the reminder AND the date it's
 * about (`trial-3:<trialEndsAt>`), pushed onto Merchant.billingReminderKeys
 * by an update that only matches while the key is absent. Overlapping runs
 * can't double-send, and paying (which moves the date) re-arms them.
 *
 * A system job across all merchants, so not merchantId-first by design.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function reminderFor(
  status: "TRIAL" | "ACTIVE" | "LAPSED",
  endsAt: Date | null,
  lapsedAt: Date | null,
  now: Date
): { kind: BillingReminderKind; date: Date } | null {
  if (status === "TRIAL" && endsAt) {
    const d = daysLeft(endsAt, now);
    if (d <= 1) return { kind: "trial-1", date: endsAt };
    if (d <= 3) return { kind: "trial-3", date: endsAt };
  }
  if (status === "ACTIVE" && endsAt) {
    const d = daysLeft(endsAt, now);
    if (d <= 1) return { kind: "renew-1", date: endsAt };
    if (d <= 7) return { kind: "renew-7", date: endsAt };
  }
  if (status === "LAPSED" && lapsedAt && now.getTime() - lapsedAt.getTime() < GRACE_DAYS * DAY_MS) {
    return { kind: "expired", date: lapsedAt };
  }
  return null;
}

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
