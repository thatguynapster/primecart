import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { checkProductionEnv, REQUIRED_NAMES } from "./production-env.mjs";

const good = {
  NEXT_PUBLIC_ROOT_DOMAIN: "primecart.app",
  DATABASE_URL: "mongodb+srv://u:p@host.example.net/primecart?retryWrites=true&w=majority",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_x",
  CLERK_SECRET_KEY: "sk_live_x",
  PAYSTACK_SECRET_KEY: "sk_live_y",
  CRON_SECRET: "a".repeat(43),
  R2_ACCOUNT_ID: "acc",
  R2_ACCESS_KEY_ID: "img",
  R2_SECRET_ACCESS_KEY: "imgsecret",
  R2_BUCKET_NAME: "images",
  R2_PUBLIC_URL: "https://pub-x.r2.dev",
  BACKUP_R2_ACCESS_KEY_ID: "bak",
  BACKUP_R2_SECRET_ACCESS_KEY: "baksecret",
  BACKUP_R2_BUCKET: "primecart-backups",
  RESEND_API_KEY: "re_x",
  NOTIFICATIONS_FROM_EMAIL: "PrimeCart <noreply@primecart.app>",
  ADMIN_NOTIFICATION_EMAIL: "owner@example.com",
  SUPPORT_EMAIL: "support@primecart.app",
};

const errorsFor = (changes) => checkProductionEnv({ ...good, ...changes }).errors;

describe("checkProductionEnv", () => {
  it("accepts a complete environment", () => {
    assert.deepEqual(errorsFor({}), []);
    assert.deepEqual(errorsFor({ NOTIFICATIONS_FROM_EMAIL: "noreply@primecart.app" }), []);
  });

  it("reports every missing variable at once", () => {
    assert.equal(checkProductionEnv({}).errors.length, REQUIRED_NAMES.length);
    for (const name of REQUIRED_NAMES) {
      assert.deepEqual(errorsFor({ [name]: " " }), [`${name} is missing`]);
    }
  });

  it("rejects dev and test values", () => {
    for (const changes of [
      { NEXT_PUBLIC_ROOT_DOMAIN: "dev.primecart.app" },
      { NEXT_PUBLIC_ROOT_DOMAIN: "https://primecart.app" },
      { NEXT_PUBLIC_ROOT_DOMAIN: "localhost:3000" },
      { DATABASE_URL: "mongodb+srv://u:p@host.example.net/primecart-dev?w=majority" },
      { DATABASE_URL: "mongodb+srv://u:p@host.example.net/?w=majority" },
      { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_x" },
      { CLERK_SECRET_KEY: "sk_test_x" },
      { PAYSTACK_SECRET_KEY: "sk_test_x" },
      { CRON_SECRET: "short" },
      { R2_PUBLIC_URL: "https://pub-x.r2.dev/" },
      { R2_PUBLIC_URL: "https://images.example.com" },
      { BACKUP_R2_ACCESS_KEY_ID: "img" },
      { BACKUP_R2_SECRET_ACCESS_KEY: "imgsecret" },
      { BACKUP_R2_BUCKET: "images" },
      { NOTIFICATIONS_FROM_EMAIL: "PrimeCart <onboarding@resend.dev>" },
      { SUPPORT_EMAIL: "support" },
      { FOUNDING_MERCHANT_IDS: "nope" },
      { RESEND_BASE_URL: "http://localhost" },
      { BACKUP_PREFIX: "x" },
      { CRON_SECRET: ` ${"a".repeat(43)}` },
      { RESEND_API_KEY: '"re_x"' },
    ]) {
      const [name] = Object.keys(changes);
      const errors = errorsFor(changes);
      assert.equal(errors.length, 1, JSON.stringify(changes));
      assert.ok(errors[0].startsWith(name));
    }
  });

  it("never repeats a value", () => {
    const secret = "S3CRET-value";
    const everything = Object.fromEntries(REQUIRED_NAMES.map((name) => [name, ` ${secret}`]));
    const bare = Object.fromEntries(REQUIRED_NAMES.map((name) => [name, secret]));
    for (const env of [everything, bare]) {
      assert.ok(!JSON.stringify(checkProductionEnv(env)).includes(secret));
    }
  });

  it("covers every variable the app and its build scripts read", () => {
    // Set by Vercel, Node or GitHub, or only meaningful outside production.
    const notOurs = new Set([
      "NEXT_RUNTIME", "NODE_ENV", "VERCEL", "VERCEL_ENV", "VERCEL_GIT_COMMIT_SHA",
      "GITHUB_SHA", "FOUNDING_MERCHANT_IDS", "RESEND_BASE_URL",
      "BACKUP_ON_BUILD", "BACKUP_PREFIX", "BACKUP_SOURCE",
    ]);
    const files = execFileSync("git", ["ls-files", "src", "scripts", "prisma/schema.prisma", "next.config.ts"])
      .toString()
      .split("\n")
      .filter((file) => /\.(ts|tsx|mjs|prisma)$/.test(file) && !/test/.test(file));
    const used = new Set();
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/(?:process\.env\.|env\("|required\(")([A-Z][A-Z0-9_]+)/g)) {
        used.add(match[1]);
      }
    }
    assert.ok(used.size > 15);
    const uncovered = [...used].filter((name) => !notOurs.has(name) && !REQUIRED_NAMES.includes(name));
    assert.deepEqual(uncovered, []);
  });
});
