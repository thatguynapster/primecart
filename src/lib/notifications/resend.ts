import { randomUUID } from "node:crypto";
import { Resend } from "resend";

import { nextAttemptAt } from "@/lib/notifications/backoff";
import { prisma } from "@/lib/prisma";

/**
 * Thin wrapper around Resend, matching how src/lib/paystack.ts wraps that API.
 *
 * A missing or unverified sender must never break the operation it's attached
 * to (a payment confirming, stock reserving) — every caller in events.ts
 * already wraps `sendEmail` in its own try/catch.
 *
 * An email that fails is stored in QueuedEmail and retried by the 5-minute
 * cron, because a lost new-order email is a lost sale.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Notifications are not configured yet.`);
  return value;
}

let client: Resend | null = null;

function resend(): Resend {
  client ??= new Resend(required("RESEND_API_KEY"));
  return client;
}

/**
 * Falls back to Resend's own unverified-domain sender so this works out of
 * the box before `NOTIFICATIONS_FROM_EMAIL`'s domain is verified — see
 * docs/NOTIFICATIONS.md's owner setup task. Resend restricts that sender to
 * the account's own signup email, which is exactly the right constraint
 * during development. A production build refuses to start without the real
 * one (scripts/check-production-env.mjs).
 */
function fromAddress(): string {
  return process.env.NOTIFICATIONS_FROM_EMAIL || "PrimeCart <onboarding@resend.dev>";
}

type Email = { to: string; subject: string; html: string };

/** Sends once, or throws. The key stops a retry being delivered twice. */
async function deliver(email: Email, idempotencyKey: string): Promise<void> {
  const { error } = await resend().emails.send(
    { from: fromAddress(), to: email.to, subject: email.subject, html: email.html },
    { idempotencyKey }
  );

  if (error) {
    throw new Error(`Resend rejected the email: ${error.message}`);
  }
}

/** Sends now, and queues a retry if that fails. */
export async function sendEmail(email: Email): Promise<void> {
  const key = randomUUID();
  try {
    await deliver(email, key);
  } catch (error) {
    console.error(`Email "${email.subject}" failed, queued for retry:`, error);
    await prisma.queuedEmail.create({
      data: {
        to: email.to,
        subject: email.subject,
        html: email.html,
        idempotencyKey: key,
        failures: 1,
        nextAttemptAt: nextAttemptAt(1, new Date())!,
      },
    });
  }
}

/** Sends once and never queues. For alerts about the system itself. */
export async function sendEmailOnce(email: Email): Promise<void> {
  await deliver(email, randomUUID());
}

const RETRY_BATCH = 20;

/** Run by the 5-minute cron. A system job, so not merchantId-scoped. */
export async function retryQueuedEmails(): Promise<{ emailsRetried: number }> {
  const due = await prisma.queuedEmail.findMany({
    where: { nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: RETRY_BATCH,
  });

  let emailsRetried = 0;
  for (const email of due) {
    const failures = email.failures + 1;
    const next = nextAttemptAt(failures, new Date());

    // Claimed by moving it to its next slot before sending, so overlapping
    // cron runs can't both send it. On the last try that slot is a day away:
    // the row is deleted below either way, and if this run dies first the
    // email gets one more try then.
    const claimed = await prisma.queuedEmail.updateMany({
      where: { id: email.id, failures: email.failures },
      data: {
        failures,
        nextAttemptAt: next ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    if (claimed.count === 0) continue;

    try {
      await deliver(email, email.idempotencyKey);
      emailsRetried += 1;
      await prisma.queuedEmail.deleteMany({ where: { id: email.id } });
    } catch (error) {
      if (next) continue;
      console.error(`Email "${email.subject}" given up after ${failures} attempts:`, error);
      await prisma.queuedEmail.deleteMany({ where: { id: email.id } });
    }
  }

  return { emailsRetried };
}
