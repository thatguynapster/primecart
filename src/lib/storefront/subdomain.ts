import { prisma } from "@/lib/prisma";

/**
 * Subdomain rules and availability.
 *
 * A subdomain becomes a permanent public address (`kofi.primecart.app`), so it
 * is validated strictly rather than sanitised quietly — a merchant should find
 * out at the form, not after their shop is live under a name they did not
 * choose.
 */

export const SUBDOMAIN_MIN = 3;
export const SUBDOMAIN_MAX = 40;

/**
 * Names that must never become a merchant storefront: they either collide with
 * infrastructure we route on, or would let a shop impersonate PrimeCart itself.
 */
const RESERVED = new Set([
  "www",
  "api",
  "app",
  "admin",
  "dashboard",
  "billing",
  "account",
  "accounts",
  "auth",
  "login",
  "signin",
  "sign-in",
  "signup",
  "sign-up",
  "onboarding",
  "store",
  "shop",
  "status",
  "support",
  "help",
  "docs",
  "blog",
  "mail",
  "email",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
  "img",
  "images",
  "media",
  "dev",
  "staging",
  "test",
  "demo",
  "preview",
  "clerk",
  "clkmail",
  "paystack",
  "webhook",
  "webhooks",
  "cron",
  "primecart",
  "internal",
  "system",
  "root",
]);

export type SubdomainCheck =
  | { ok: true; value: string }
  | { ok: false; reason: string };

/**
 * Validates the format only. Does not touch the database.
 *
 * Rules follow DNS label constraints: lowercase letters, digits and hyphens,
 * never starting or ending with a hyphen, and no consecutive hyphens (which
 * would collide with punycode's `xx--` prefix convention).
 */
export function validateSubdomain(raw: string): SubdomainCheck {
  const value = raw.trim().toLowerCase();

  if (!value) {
    return { ok: false, reason: "Choose a shop address." };
  }
  if (value.length < SUBDOMAIN_MIN) {
    return {
      ok: false,
      reason: `Use at least ${SUBDOMAIN_MIN} characters.`,
    };
  }
  if (value.length > SUBDOMAIN_MAX) {
    return { ok: false, reason: `Use at most ${SUBDOMAIN_MAX} characters.` };
  }
  if (!/^[a-z0-9-]+$/.test(value)) {
    return {
      ok: false,
      reason: "Use lowercase letters, numbers and hyphens only.",
    };
  }
  if (value.startsWith("-") || value.endsWith("-")) {
    return { ok: false, reason: "Cannot start or end with a hyphen." };
  }
  if (value.includes("--")) {
    return { ok: false, reason: "Cannot contain two hyphens in a row." };
  }
  if (RESERVED.has(value)) {
    return { ok: false, reason: "That address is reserved." };
  }

  return { ok: true, value };
}

/**
 * Format check plus a uniqueness lookup.
 *
 * This is advisory. The unique index on `storefront.subdomain` is what
 * actually prevents two merchants claiming the same address — between this
 * check and the write, someone else can take it.
 */
export async function checkSubdomainAvailable(
  raw: string
): Promise<SubdomainCheck> {
  const format = validateSubdomain(raw);
  if (!format.ok) return format;

  const taken = await prisma.merchant.findFirst({
    where: { storefront: { is: { subdomain: format.value } } },
    select: { id: true },
  });

  if (taken) {
    return { ok: false, reason: "That address is already taken." };
  }

  return format;
}
