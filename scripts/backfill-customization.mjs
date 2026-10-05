/**
 * DEV-7 / Phase 15, §B.4. `allowCustomization Boolean @default(false)` and
 * `customizationRequired Boolean @default(false)` only apply on create —
 * Prisma Client never backfills existing MongoDB documents for a schema
 * default. Any query filtering `allowCustomization: false` would silently not
 * match a product that predates this field, because the field is missing
 * rather than false.
 *
 * This sets both fields explicitly on every Product document that doesn't
 * have `allowCustomization` yet. Idempotent — only matches documents still
 * missing the field, so it's safe to rerun. No `merchantId` filter: this is a
 * cross-tenant schema migration, not a tenant query.
 *
 * Runs automatically on Vercel as part of `vercel-build`, before `next build`,
 * so the data is migrated before the code that reads these fields goes live.
 * Vercel injects env vars into the process, so no --env-file there.
 *
 * Locally, DATABASE_URL has to be loaded explicitly:
 *   node --env-file=.env scripts/backfill-customization.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// A plain Prisma `where` filter can't express "field doesn't exist" for a
// non-nullable Boolean, so counting uses the same raw `$exists` query as the
// update rather than `prisma.product.count()`.
async function countMissing() {
  const result = await prisma.$runCommandRaw({
    count: "Product",
    query: { allowCustomization: { $exists: false } },
  });
  return result.n;
}

async function main() {
  const before = await countMissing();

  const result = await prisma.$runCommandRaw({
    update: "Product",
    updates: [
      {
        q: { allowCustomization: { $exists: false } },
        u: { $set: { allowCustomization: false, customizationRequired: false } },
        multi: true,
      },
    ],
  });

  console.log(`matched: ${result.n}, modified: ${result.nModified}`);

  const remaining = await countMissing();

  console.log(
    `products missing allowCustomization — before: ${before}, after: ${remaining}`
  );

  if (remaining > 0) {
    throw new Error(
      `${remaining} product(s) still missing allowCustomization after backfill`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
