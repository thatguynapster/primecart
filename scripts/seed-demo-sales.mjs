/**
 * Adds sales history and featured picks to the three demo merchants created
 * by seed-demo-merchants.mjs, so Phase 14's sales-derived sections (Best
 * Sellers, the footer's best-selling-categories column) and the merchant-
 * curated Featured Collection have real data to render during verification
 * (task 14.14) — without this, every demo shop's Best Sellers/Featured
 * sections and footer Categories column stay correctly-but-uselessly empty.
 *
 * Idempotent the same way the merchant seed is: skips a merchant that
 * already has paid orders.
 *
 * Run: node --env-file=.env scripts/seed-demo-sales.mjs
 */
import { randomInt, randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAILS = [
  "andrewosei94+jewellery@gmail.com",
  "andrewosei94+clothing@gmail.com",
  "andrewosei94+electronics@gmail.com",
];

const FEATURED_PER_MERCHANT = 6;
const ORDERS_PER_MERCHANT = 14;

function orderNumber(date) {
  const stamp = date.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = randomInt(0, 36 ** 4).toString(36).toUpperCase().padStart(4, "0");
  return `PC-${stamp}-${suffix}`;
}

function randomInt2(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedForMerchant(email) {
  const merchant = await prisma.merchant.findUnique({ where: { email } });
  if (!merchant) {
    console.log(`  skip — no merchant for ${email} (run seed-demo-merchants.mjs first)`);
    return;
  }

  console.log(`\n=== ${email} ===`);

  const products = await prisma.product.findMany({
    where: { merchantId: merchant.id, isActive: true },
  });

  // Featured picks — a spread across categories, not just the first N.
  const featuredIds = products
    .filter((_, i) => i % Math.ceil(products.length / FEATURED_PER_MERCHANT) === 0)
    .slice(0, FEATURED_PER_MERCHANT)
    .map((p) => p.id);

  await prisma.product.updateMany({
    where: { merchantId: merchant.id, id: { in: featuredIds } },
    data: { isFeatured: true },
  });
  console.log(`Featured ${featuredIds.length} products.`);

  const existingPaidOrders = await prisma.order.count({
    where: { merchantId: merchant.id, paymentStatus: "PAID" },
  });
  if (existingPaidOrders > 0) {
    console.log(`Already has ${existingPaidOrders} paid orders — skipping order seed.`);
    return;
  }

  // A handful of repeat "customers" so best-sellers has realistic weighting
  // (some products sell more than once) rather than one order each.
  const customerNames = [
    "Ama Boateng",
    "Kwesi Owusu",
    "Efua Mensah",
    "Kojo Asante",
    "Abena Darko",
  ];
  const customers = [];
  for (const name of customerNames) {
    customers.push(
      await prisma.customer.create({
        data: {
          merchantId: merchant.id,
          name,
          phone: `02${randomInt2(10000000, 99999999)}`,
        },
      })
    );
  }

  // Weighted toward the first half of the catalogue so a real "best sellers"
  // ranking emerges instead of an even spread across all 60 products.
  const pool = products.filter((p) => p.variants.some((v) => v.isActive));

  for (let i = 0; i < ORDERS_PER_MERCHANT; i++) {
    const customer = customers[i % customers.length];
    const lineCount = randomInt2(1, 2);
    const chosen = new Set();
    while (chosen.size < lineCount && chosen.size < pool.length) {
      // Skew toward earlier products in the pool — a rough Zipf-like curve
      // so a handful of products clearly lead the best-seller ranking.
      const skewed = Math.floor(Math.pow(Math.random(), 2) * pool.length);
      chosen.add(skewed);
    }

    const lineItems = [...chosen].map((index) => {
      const product = pool[index];
      const variant = product.variants.find((v) => v.isActive) ?? product.variants[0];
      const quantity = randomInt2(1, 3);
      return {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        price: variant.price,
        quantity,
        subtotal: Math.round(variant.price * quantity * 100) / 100,
      };
    });

    const subtotal = Math.round(
      lineItems.reduce((sum, item) => sum + item.subtotal, 0) * 100
    ) / 100;

    const createdAt = new Date(Date.now() - randomInt2(0, 25) * 86_400_000);

    await prisma.order.create({
      data: {
        merchantId: merchant.id,
        customerId: customer.id,
        orderNumber: orderNumber(createdAt),
        status: "DELIVERED",
        source: "STOREFRONT",
        paymentStatus: "PAID",
        paymentRef: `demo_${randomUUID()}`,
        subtotal,
        total: subtotal,
        lineItems,
        createdAt,
      },
    });
  }

  console.log(`Created ${ORDERS_PER_MERCHANT} paid demo orders across ${customers.length} customers.`);
}

async function main() {
  for (const email of EMAILS) {
    await seedForMerchant(email);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
