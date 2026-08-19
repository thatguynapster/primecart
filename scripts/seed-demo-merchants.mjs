/**
 * Creates three demo merchants (jewellery, clothing, electronics), each with a
 * complete storefront and 50+ products across 6+ categories — enough real data
 * to build and review the Phase 14 storefront redesign against.
 *
 * Run once per environment (idempotent — re-running skips a shop type that
 * already has products):
 *
 *   node --env-file=.env scripts/seed-demo-merchants.mjs
 *
 * What this does NOT do, deliberately:
 *  - No real Paystack subaccount is created (that needs a real bank account).
 *    paystackSubaccountCode is left unset, so a live checkout payment split
 *    would fail — fine for reviewing storefront UI, not fine for a real
 *    end-to-end payment test.
 *  - subscriptionStatus is set straight to ACTIVE rather than going through a
 *    real trial/Paystack subscription, so the dashboard and storefront are
 *    both usable immediately.
 *  - Product photos are stock photos from picsum.photos, uploaded into the
 *    real R2 bucket the same way a merchant's own upload would be — not
 *    category-accurate photography, just enough visual variety to review
 *    grid/card layouts.
 */
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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

/** Fetches a deterministic placeholder photo and uploads it to R2, mirroring src/lib/r2.ts's key scheme. */
async function uploadPoolImage(merchantId, categorySlug, seed) {
  const res = await fetch(`https://picsum.photos/seed/${seed}/900/900`);
  if (!res.ok) throw new Error(`picsum fetch failed for seed ${seed}: ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());

  const key = `products/${merchantId}/pool/${categorySlug}/${randomUUID()}.jpg`;
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

// ---------------------------------------------------------------------------
// Shop data
// ---------------------------------------------------------------------------

const TRIAL_DAYS = 30;
const IMAGES_PER_CATEGORY_POOL = 6;
const IMAGES_PER_PRODUCT = 2;

const SHOPS = [
  {
    key: "jewellery",
    businessName: "Aura & Stone",
    subdomain: "auraandstone",
    primaryColor: "#8A6D1E",
    description:
      "Handcrafted fine and fashion jewellery — rings, necklaces, earrings and more, made to last.",
    categories: [
      {
        name: "Rings",
        templates: [
          "Solitaire Ring",
          "Eternity Band",
          "Halo Engagement Ring",
          "Stackable Ring Set",
          "Signet Ring",
          "Twist Ring",
          "Pearl Accent Ring",
          "Gemstone Cluster Ring",
          "Adjustable Ring",
          "Vintage Filigree Ring",
        ],
        variantLabel: "Size",
        variantOptions: ["5", "6", "7", "8", "9"],
        price: [180, 2400],
      },
      {
        name: "Necklaces",
        templates: [
          "Pendant Necklace",
          "Layered Chain Necklace",
          "Pearl Strand Necklace",
          "Locket Necklace",
          "Statement Necklace",
          "Beaded Necklace",
          "Herringbone Chain",
          "Cross Pendant Necklace",
          "Personalised Name Necklace",
          "Choker Necklace",
        ],
        variantLabel: "Metal",
        variantOptions: ["Gold", "Silver", "Rose Gold"],
        price: [220, 3200],
      },
      {
        name: "Earrings",
        templates: [
          "Stud Earrings",
          "Hoop Earrings",
          "Drop Earrings",
          "Chandelier Earrings",
          "Ear Cuffs",
          "Pearl Studs",
          "Huggie Earrings",
          "Threader Earrings",
          "Cluster Earrings",
          "Tassel Earrings",
        ],
        variantLabel: "Metal",
        variantOptions: ["Gold", "Silver", "Rose Gold"],
        price: [140, 1800],
      },
      {
        name: "Bracelets",
        templates: [
          "Tennis Bracelet",
          "Charm Bracelet",
          "Bangle",
          "Cuff Bracelet",
          "Chain Bracelet",
          "Beaded Bracelet",
          "Wrap Bracelet",
          "Link Bracelet",
          "Friendship Bracelet",
          "Layered Bracelet Set",
        ],
        variantLabel: "Metal",
        variantOptions: ["Gold", "Silver", "Rose Gold"],
        price: [160, 2100],
      },
      {
        name: "Anklets",
        templates: [
          "Beaded Anklet",
          "Chain Anklet",
          "Charm Anklet",
          "Layered Anklet",
          "Pearl Anklet",
          "Minimalist Anklet",
          "Gold-Tone Anklet",
          "Silver-Tone Anklet",
          "Shell Anklet",
          "Adjustable Anklet",
        ],
        variantLabel: "Length",
        variantOptions: ["22cm", "25cm", "28cm"],
        price: [90, 650],
      },
      {
        name: "Watches",
        templates: [
          "Classic Leather Watch",
          "Minimalist Watch",
          "Chronograph Watch",
          "Gold-Tone Watch",
          "Mesh Strap Watch",
          "Rose Gold Watch",
          "Diamond-Accent Watch",
          "Bangle Watch",
          "Two-Tone Watch",
          "Ceramic Strap Watch",
        ],
        variantLabel: "Strap",
        variantOptions: ["Leather", "Steel Mesh", "Gold-Tone"],
        price: [350, 4500],
      },
    ],
  },
  {
    key: "clothing",
    businessName: "Urban Thread Co.",
    subdomain: "urbanthreadco",
    primaryColor: "#1F2937",
    description:
      "Everyday and statement clothing for men and women — shirts, dresses, outerwear and footwear.",
    categories: [
      {
        name: "Shirts",
        templates: [
          "Oxford Button-Down",
          "Linen Shirt",
          "Graphic Tee",
          "Polo Shirt",
          "Flannel Shirt",
          "Denim Shirt",
          "Henley Top",
          "Striped Shirt",
          "Chambray Shirt",
          "Crewneck Tee",
        ],
        variantLabel: "Size",
        variantOptions: ["S", "M", "L", "XL"],
        price: [60, 350],
      },
      {
        name: "Dresses",
        templates: [
          "Wrap Dress",
          "Maxi Dress",
          "Shift Dress",
          "Bodycon Dress",
          "A-Line Dress",
          "Slip Dress",
          "Shirt Dress",
          "Wax Print Dress",
          "Off-Shoulder Dress",
          "Midi Dress",
        ],
        variantLabel: "Size",
        variantOptions: ["S", "M", "L", "XL"],
        price: [120, 650],
      },
      {
        name: "Trousers",
        templates: [
          "Slim Chinos",
          "Wide-Leg Trousers",
          "Cargo Pants",
          "Denim Jeans",
          "Tailored Trousers",
          "Jogger Pants",
          "Palazzo Pants",
          "Culottes",
          "Straight-Leg Jeans",
          "Pleated Trousers",
        ],
        variantLabel: "Size",
        variantOptions: ["28", "30", "32", "34", "36"],
        price: [90, 480],
      },
      {
        name: "Outerwear",
        templates: [
          "Denim Jacket",
          "Bomber Jacket",
          "Trench Coat",
          "Puffer Jacket",
          "Blazer",
          "Cardigan",
          "Windbreaker",
          "Wool Coat",
          "Utility Jacket",
          "Kimono Jacket",
        ],
        variantLabel: "Size",
        variantOptions: ["S", "M", "L", "XL"],
        price: [180, 900],
      },
      {
        name: "Footwear",
        templates: [
          "Canvas Sneakers",
          "Leather Loafers",
          "Ankle Boots",
          "Sandals",
          "Running Shoes",
          "Espadrilles",
          "Chelsea Boots",
          "Slide Sandals",
          "Platform Heels",
          "Derby Shoes",
        ],
        variantLabel: "Size",
        variantOptions: ["38", "39", "40", "41", "42", "43"],
        price: [110, 700],
      },
      {
        name: "Accessories",
        templates: [
          "Leather Belt",
          "Canvas Tote Bag",
          "Silk Scarf",
          "Wool Beanie",
          "Sunglasses",
          "Crossbody Bag",
          "Baseball Cap",
          "Woven Bracelet",
          "Ankara Headwrap",
          "Leather Wallet",
        ],
        variantLabel: "Colour",
        variantOptions: ["Black", "Brown", "Tan"],
        price: [40, 380],
      },
    ],
  },
  {
    key: "electronics",
    businessName: "Voltage Hub",
    subdomain: "voltagehub",
    primaryColor: "#2563EB",
    description:
      "Phones, laptops, audio and everyday accessories — genuine electronics at fair prices.",
    categories: [
      {
        name: "Headphones",
        templates: [
          "Wireless Over-Ear Headphones",
          "Noise-Cancelling Earbuds",
          "Bluetooth Sports Earphones",
          "Studio Headphones",
          "Gaming Headset",
          "True Wireless Earbuds",
          "Foldable On-Ear Headphones",
          "Kids Headphones",
          "ANC Travel Headphones",
          "Wired Earphones",
        ],
        variantLabel: "Colour",
        variantOptions: ["Black", "White", "Blue"],
        price: [60, 1800],
      },
      {
        name: "Smartphones",
        templates: [
          "5G Smartphone",
          "Budget Smartphone",
          "Flagship Smartphone",
          "Rugged Smartphone",
          "Compact Smartphone",
          "Triple-Camera Smartphone",
          "Large-Battery Smartphone",
          "Foldable Smartphone",
          "Gaming Smartphone",
          "Smartphone Pro",
        ],
        variantLabel: "Storage",
        variantOptions: ["64GB", "128GB", "256GB"],
        price: [900, 12000],
      },
      {
        name: "Laptops",
        templates: [
          "14-inch Ultrabook",
          "Gaming Laptop",
          "Budget Laptop",
          "2-in-1 Convertible Laptop",
          "Business Laptop",
          "15.6-inch Laptop",
          "Chromebook",
          "Creator Laptop",
          "Lightweight 13-inch Laptop",
          "Student Laptop",
        ],
        variantLabel: "RAM / Storage",
        variantOptions: ["8GB / 256GB", "16GB / 512GB", "16GB / 1TB"],
        price: [2200, 18000],
      },
      {
        name: "Smartwatches",
        templates: [
          "Fitness Smartwatch",
          "GPS Sports Watch",
          "AMOLED Smartwatch",
          "Kids Smartwatch",
          "Rugged Outdoor Smartwatch",
          "Heart-Rate Smartwatch",
          "Round Dial Smartwatch",
          "Budget Smartwatch",
          "Calling Smartwatch",
          "Premium Smartwatch",
        ],
        variantLabel: "Band Colour",
        variantOptions: ["Black", "Silver", "Rose Gold"],
        price: [180, 2800],
      },
      {
        name: "Speakers",
        templates: [
          "Portable Bluetooth Speaker",
          "Waterproof Speaker",
          "Smart Home Speaker",
          "Party Speaker with Lights",
          "Mini Bluetooth Speaker",
          "Soundbar",
          "Bookshelf Speakers (Pair)",
          "Outdoor Speaker",
          "Speaker with Power Bank",
          "Subwoofer Speaker",
        ],
        variantLabel: "Colour",
        variantOptions: ["Black", "Red", "Grey"],
        price: [90, 2200],
      },
      {
        name: "Accessories",
        templates: [
          "65W Fast Charger",
          "10000mAh Power Bank",
          "USB-C Hub",
          "Wireless Charging Pad",
          "Phone Case",
          "Laptop Sleeve",
          "Bluetooth Adapter",
          "HDMI Cable",
          "Screen Protector Pack",
          "Car Phone Mount",
        ],
        variantLabel: "Colour",
        variantOptions: ["Black", "White"],
        price: [25, 450],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Deterministic-ish pseudo-random int in [min, max], stable per call site via a seeded index. */
function randomInt(min, max, seedIndex) {
  const x = Math.sin(seedIndex * 9973 + 1) * 10000;
  const frac = x - Math.floor(x);
  return Math.floor(frac * (max - min + 1)) + min;
}

function trialExpiry() {
  return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/** Builds every variant for a product from the category's variant option list. */
function buildVariants(basePrice, variantLabel, variantOptions, seedIndex) {
  return variantOptions.map((option, i) => {
    const priceJitter = 1 + (i - (variantOptions.length - 1) / 2) * 0.06;
    const stock = randomInt(0, 45, seedIndex * 7 + i);
    return {
      id: randomUUID(),
      name: option,
      sku: null,
      price: Math.round(basePrice * priceJitter * 100) / 100,
      stock,
      lowStockThreshold: 5,
      attributes: { [variantLabel]: option },
      isActive: true,
      // Every option shares the product's photos — none of these shops sell
      // option-specific photography, so imageUrls stays empty (falls back to
      // product.images, same rule the dashboard preview and storefront use).
      imageUrls: [],
    };
  });
}

// ---------------------------------------------------------------------------
// Clerk + Merchant
// ---------------------------------------------------------------------------

async function findOrCreateClerkUser(email, password, name) {
  const existing = await clerk.users.getUserList({ emailAddress: [email] });
  if (existing.data.length > 0) return existing.data[0];

  return clerk.users.createUser({
    emailAddress: [email],
    password,
    firstName: name,
  });
}

async function findOrCreateMerchant(clerkUserId, email, name) {
  const existing = await prisma.merchant.findUnique({ where: { clerkUserId } });
  if (existing) return existing;

  return prisma.merchant.create({
    data: {
      clerkUserId,
      email,
      name,
      trialExpiresAt: trialExpiry(),
      subscriptionStatus: "ACTIVE",
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedShop(shop) {
  const email = `andrewosei94+${shop.key}@gmail.com`;
  const password = `Merchant${capitalize(shop.key)}`;

  console.log(`\n=== ${shop.businessName} (${email}) ===`);

  const clerkUser = await findOrCreateClerkUser(email, password, shop.businessName);
  const merchant = await findOrCreateMerchant(clerkUser.id, email, shop.businessName);
  console.log(`Merchant ${merchant.id} (Clerk user ${clerkUser.id})`);

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      subscriptionStatus: "ACTIVE",
      storefront: {
        set: {
          subdomain: shop.subdomain,
          businessName: shop.businessName,
          description: shop.description,
          primaryColor: shop.primaryColor,
          isActive: true,
        },
      },
    },
  });
  console.log(`Storefront live at subdomain "${shop.subdomain}"`);

  const existingProductCount = await prisma.product.count({
    where: { merchantId: merchant.id },
  });
  if (existingProductCount > 0) {
    console.log(
      `Already has ${existingProductCount} products — skipping product generation.`
    );
    return;
  }

  let productSeedIndex = 0;
  let totalProducts = 0;

  for (const category of shop.categories) {
    const categorySlug = slugify(category.name);

    // A small shared photo pool per category, uploaded once, so 10 products
    // don't need 10 unique fetches — just enough variety to review a grid.
    const pool = [];
    for (let i = 0; i < IMAGES_PER_CATEGORY_POOL; i++) {
      const url = await uploadPoolImage(
        merchant.id,
        categorySlug,
        `${shop.key}-${categorySlug}-${i}`
      );
      pool.push(url);
    }
    console.log(`  ${category.name}: uploaded ${pool.length} pool photos`);

    for (let t = 0; t < category.templates.length; t++) {
      const name = category.templates[t];
      const basePrice = randomInt(
        category.price[0],
        category.price[1],
        productSeedIndex * 3 + 1
      );

      const images = [
        pool[productSeedIndex % pool.length],
        pool[(productSeedIndex + 1) % pool.length],
      ].slice(0, IMAGES_PER_PRODUCT);

      const variants = buildVariants(
        basePrice,
        category.variantLabel,
        category.variantOptions,
        productSeedIndex
      );

      await prisma.product.create({
        data: {
          merchantId: merchant.id,
          name,
          description: `${name} from the ${category.name} collection at ${shop.businessName}.`,
          category: category.name,
          images,
          variants,
        },
      });

      totalProducts += 1;
      productSeedIndex += 1;
    }
  }

  console.log(`Created ${totalProducts} products across ${shop.categories.length} categories.`);
}

async function main() {
  const required = [
    "DATABASE_URL",
    "CLERK_SECRET_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing env vars: ${missing.join(", ")}. Run with: node --env-file=.env scripts/seed-demo-merchants.mjs`
    );
  }

  for (const shop of SHOPS) {
    await seedShop(shop);
  }

  console.log("\nDone. Sign-in credentials:");
  for (const shop of SHOPS) {
    console.log(
      `  ${shop.businessName}: andrewosei94+${shop.key}@gmail.com / Merchant${capitalize(shop.key)}  → /store/${shop.subdomain}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
