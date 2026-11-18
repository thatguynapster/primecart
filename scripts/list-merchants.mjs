/**
 * Read-only: lists merchants who have a shop, with the `_id` that
 * FOUNDING_MERCHANT_IDS needs. No emails or other personal data are printed.
 *
 *   node --env-file=.env scripts/list-merchants.mjs        (npm run db:list-merchants)
 *
 * Point DATABASE_URL at the database you want (production for founding IDs).
 * Needs network access to Atlas, so run it from your own machine.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const merchants = await prisma.merchant.findMany({
    where: { storefront: { isNot: null } },
    select: {
      id: true,
      createdAt: true,
      plan: true,
      priceOverrideEndsAt: true,
      storefront: { select: { subdomain: true, businessName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = merchants.map((m) => ({
    id: m.id,
    subdomain: m.storefront?.subdomain ?? "",
    shop: m.storefront?.businessName ?? "",
    joined: m.createdAt.toISOString().slice(0, 10),
    plan:
      m.plan === "FOUNDING" && m.priceOverrideEndsAt
        ? `FOUNDING until ${m.priceOverrideEndsAt.toISOString().slice(0, 10)}`
        : (m.plan ?? "—"),
  }));

  console.table(rows);
  console.log(`${rows.length} merchant(s) with a shop.`);
  console.log("Set in Vercel (Production only): FOUNDING_MERCHANT_IDS=<id>,<id>");
} finally {
  await prisma.$disconnect();
}
