import { Resend } from "resend";

/**
 * Thin wrapper around Resend, matching how src/lib/paystack.ts wraps that API.
 *
 * A missing or unverified sender must never break the operation it's attached
 * to (a payment confirming, stock reserving) — every caller in events.ts
 * already wraps `sendEmail` in its own try/catch. This module only logs.
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
 * during development.
 */
function fromAddress(): string {
  return process.env.NOTIFICATIONS_FROM_EMAIL || "PrimeCart <onboarding@resend.dev>";
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const { error } = await resend().emails.send({
    from: fromAddress(),
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`Resend rejected the email: ${error.message}`);
  }
}
