/**
 * Gives each demo merchant (seed-demo-merchants.mjs) a real hero photo, so
 * the homepage hero looks like the reference's photographic banner instead
 * of the plain solid-colour text fallback. Idempotent — skips a merchant
 * that already has a heroImageUrl.
 *
 * Run: node --env-file=.env scripts/seed-demo-hero.mjs
 */
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function publicUrlFor(key) {
  return `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

async function uploadHeroImage(merchantId, seed) {
  // Wide enough to stay sharp on a retina/high-DPI display, where the browser
  // requests roughly 2x the CSS pixel width — a 1600px source visibly
  // upscales (blurs) once stretched across a full-bleed ~1500px-wide banner
  // on a 2x screen.
  const res = await fetch(`https://picsum.photos/seed/${seed}/2400/1000`);
  if (!res.ok) throw new Error(`picsum fetch failed for seed ${seed}: ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());

  const key = `hero/${merchantId}/${randomUUID()}.jpg`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return publicUrlFor(key);
}

const SHOPS = [
  {
    email: "andrewosei94+jewellery@gmail.com",
    seed: "aura-stone-hero",
    // heroHeadline/subheading already set by the owner while testing — left alone.
  },
  {
    email: "andrewosei94+clothing@gmail.com",
    seed: "urban-thread-hero",
    heroHeadline: "Dress For Every Moment",
    heroSubheading: "Everyday and statement pieces for men and women.",
  },
  {
    email: "andrewosei94+electronics@gmail.com",
    seed: "voltage-hub-hero",
    heroHeadline: "Genuine Tech, Fair Prices",
    heroSubheading: "Phones, laptops and audio built to last.",
  },
];

async function main() {
  for (const shop of SHOPS) {
    const merchant = await prisma.merchant.findUnique({ where: { email: shop.email } });
    if (!merchant) {
      console.log(`skip — no merchant for ${shop.email}`);
      continue;
    }

    if (merchant.storefront?.heroImageUrl) {
      console.log(`${shop.email}: already has a hero image — skipping.`);
      continue;
    }

    const heroImageUrl = await uploadHeroImage(merchant.id, shop.seed);

    await prisma.$runCommandRaw({
      update: "Merchant",
      updates: [
        {
          q: { _id: { $oid: merchant.id } },
          u: {
            $set: {
              "storefront.heroImageUrl": heroImageUrl,
              ...(shop.heroHeadline && !merchant.storefront?.heroHeadline
                ? { "storefront.heroHeadline": shop.heroHeadline }
                : {}),
              ...(shop.heroSubheading && !merchant.storefront?.heroSubheading
                ? { "storefront.heroSubheading": shop.heroSubheading }
                : {}),
            },
          },
          multi: false,
        },
      ],
    });

    console.log(`${shop.email}: hero image set (${heroImageUrl})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
