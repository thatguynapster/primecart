/**
 * Manual MongoDB indexes for embedded document fields.
 *
 * Prisma cannot declare indexes on fields inside embedded types, so the two
 * storefront indexes are created here instead. Run after `prisma db push`, and
 * once per environment:
 *
 *   npm run db:indexes
 *
 * The command is idempotent — re-running it on an existing, identical index is
 * a no-op. Changing an index definition requires dropping it first.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INDEXES = [
  {
    // Subdomain resolution depends on this lookup, and two merchants must never
    // claim the same subdomain.
    //
    // sparse: a Merchant record is created at first Clerk sign-in, before the
    // storefront is set up, so `storefront` is briefly absent. Without sparse,
    // a unique index treats every missing value as null and the second
    // storefront-less merchant would collide with the first.
    key: { "storefront.subdomain": 1 },
    name: "storefront_subdomain_unique",
    unique: true,
    sparse: true,
  },
  {
    // Custom domains are deferred at MVP; the index exists for the field the
    // schema already carries.
    key: { "storefront.customDomain": 1 },
    name: "storefront_customDomain_sparse",
    sparse: true,
  },
];

async function main() {
  const result = await prisma.$runCommandRaw({
    createIndexes: "Merchant",
    indexes: INDEXES,
  });

  if (result.ok !== 1) {
    throw new Error(`createIndexes failed: ${JSON.stringify(result)}`);
  }

  console.log(
    result.note ?? `Indexes present (${result.numIndexesAfter} on Merchant).`
  );

  const listed = await prisma.$runCommandRaw({ listIndexes: "Merchant" });
  for (const index of listed.cursor.firstBatch) {
    console.log(
      `  ${index.name}  ${JSON.stringify(index.key)}` +
        `${index.unique ? " unique" : ""}${index.sparse ? " sparse" : ""}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
