/**
 * Every environment variable production needs, and what each must look like.
 * `docs/PRODUCTION_DEPLOY.md` part 7c says where each value comes from.
 *
 * Nothing here may return or print a value: the repository is public.
 */

const ROOT_DOMAIN = /^(?!dev\.)[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
/** `name@domain` or `Name <name@domain>`. */
const SENDER = /^(?:[^<>]+<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/;

/** The database named in a connection string, or null. */
function databaseName(uri) {
  return /^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)(?:\?|$)/.exec(uri)?.[1] ?? null;
}

function isR2DevUrl(value) {
  try {
    const url = new URL(value);
    // next.config.ts only allows images from r2.dev.
    return url.protocol === "https:" && url.hostname.endsWith(".r2.dev") && !value.endsWith("/");
  } catch {
    return false;
  }
}

/** name -> (value, env) => a problem, or null. All are required. */
const REQUIRED = {
  NEXT_PUBLIC_ROOT_DOMAIN: (v) =>
    ROOT_DOMAIN.test(v) ? null : "must be the production domain alone: no https://, port or slash, and not the dev one",
  DATABASE_URL: (v) => {
    if (!/^mongodb(\+srv)?:\/\//.test(v)) return "must be a MongoDB connection string";
    const name = databaseName(v);
    if (!name) return "must name the database before the ?";
    return /dev|test/i.test(name) ? "points at a dev or test database" : null;
  },
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: (v) =>
    v.startsWith("pk_live_") ? null : "must be the production Clerk key (pk_live_)",
  CLERK_SECRET_KEY: (v) =>
    v.startsWith("sk_live_") ? null : "must be the production Clerk key (sk_live_)",
  PAYSTACK_SECRET_KEY: (v) =>
    v.startsWith("sk_live_") ? null : "must be the live Paystack secret key (sk_live_)",
  CRON_SECRET: (v) =>
    /^[\x21-\x7e]{32,}$/.test(v) ? null : "must be at least 32 plain characters, no spaces",
  R2_ACCOUNT_ID: () => null,
  R2_ACCESS_KEY_ID: () => null,
  R2_SECRET_ACCESS_KEY: () => null,
  R2_BUCKET_NAME: () => null,
  R2_PUBLIC_URL: (v) =>
    isR2DevUrl(v) ? null : "must be an https://….r2.dev address with no slash at the end",
  BACKUP_R2_ACCESS_KEY_ID: (v, env) =>
    v === env.R2_ACCESS_KEY_ID ? "must not be the image token: use one for the backup bucket only" : null,
  BACKUP_R2_SECRET_ACCESS_KEY: (v, env) =>
    v === env.R2_SECRET_ACCESS_KEY ? "must not be the image token: use one for the backup bucket only" : null,
  BACKUP_R2_BUCKET: (v, env) =>
    v === env.R2_BUCKET_NAME ? "must not be the public image bucket" : null,
  RESEND_API_KEY: (v) => (v.startsWith("re_") ? null : "must be a Resend key (re_)"),
  // Without a verified sender Resend delivers to nobody but the account owner.
  NOTIFICATIONS_FROM_EMAIL: (v) => {
    if (/@resend\.dev/i.test(v)) return "is Resend's test sender, which can't email merchants";
    return SENDER.test(v) ? null : "must look like PrimeCart <noreply@primecart.app>";
  },
  ADMIN_NOTIFICATION_EMAIL: (v) => (EMAIL.test(v) ? null : "must be one email address"),
  SUPPORT_EMAIL: (v) => (EMAIL.test(v) ? null : "must be one email address"),
};

/** Tests and backups only: in production they send email or backups astray. */
const FORBIDDEN = ["RESEND_BASE_URL", "BACKUP_ON_BUILD", "BACKUP_PREFIX", "BACKUP_SOURCE"];

/** Left over from removed features. Harmless. */
const UNUSED = ["PAYSTACK_PUBLIC_KEY", "PAYSTACK_PLAN_CODE"];

export const REQUIRED_NAMES = Object.keys(REQUIRED);

/**
 * @returns {{ errors: string[], warnings: string[] }} names and reasons only.
 */
export function checkProductionEnv(env) {
  const errors = [];
  const warnings = [];

  for (const [name, check] of Object.entries(REQUIRED)) {
    const value = env[name];
    if (!value || !value.trim()) {
      errors.push(`${name} is missing`);
    } else if (value !== value.trim() || /^["'].*["']$/.test(value)) {
      errors.push(`${name} has stray spaces or quotes around it`);
    } else {
      const problem = check(value, env);
      if (problem) errors.push(`${name} ${problem}`);
    }
  }

  for (const name of FORBIDDEN) {
    if (env[name]) errors.push(`${name} must not be set in production`);
  }

  // Set for the first deploy only, then removed.
  const founding = env.FOUNDING_MERCHANT_IDS;
  if (!founding) {
    warnings.push("FOUNDING_MERCHANT_IDS is not set (fine unless founding merchants are still to be applied)");
  } else if (!founding.split(",").every((id) => /^[0-9a-f]{24}$/i.test(id.trim()))) {
    errors.push("FOUNDING_MERCHANT_IDS must be 24-character ids separated by commas");
  }

  for (const name of UNUSED) {
    if (env[name]) warnings.push(`${name} is no longer used: remove it`);
  }

  return { errors, warnings };
}
