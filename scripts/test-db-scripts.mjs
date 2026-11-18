/**
 * Integration test for scripts/backfill-d18.mjs, backup-db.mjs and
 * restore-db.mjs, against a throwaway in-memory MongoDB replica set started
 * here (the first run downloads a mongod binary). Never touches DATABASE_URL
 * or any real database.
 *
 *   npm run test:db
 *
 * Covers brief T13's "db:backfill-d18 run twice" and T0's restore test:
 * idempotent backfill, founding end date never moves, checkout-on stays on,
 * BSON types (double vs int, ObjectId, Date) survive backup -> restore, the
 * unique subdomain index is recreated, and restore refuses a non-empty target.
 */
import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import { BSON, Double, Int32, MongoClient, ObjectId } from "mongodb";

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP = join(tmpdir(), `primecart-test-backup-${process.pid}.ejson.gz`);
const { EJSON } = BSON;

let failures = 0;
const check = (cond, label) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures += 1;
};

function run(script, args, env) {
  const r = spawnSync(process.execPath, [join(PROJECT, script), ...args], {
    cwd: PROJECT,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
const base = replSet.getUri(); // mongodb://127.0.0.1:port/?replicaSet=...
const withDb = (name) => base.replace("/?", `/${name}?`);
const SRC = withDb("primecart-test");
const DST = withDb("primecart-restore");

const client = new MongoClient(base);
await client.connect();
const src = client.db("primecart-test");

// ---------------------------------------------------------------- seed
const ids = { legacy: new ObjectId(), founding: new ObjectId(), notOnboarded: new ObjectId(), switchedOn: new ObjectId(), phase13: new ObjectId() };
const store = (sub) => ({ subdomain: sub, businessName: sub, primaryColor: "#000000", isActive: true, createdAt: new Date("2026-08-01T00:00:00Z") });
await src.collection("Merchant").insertMany([
  { _id: ids.legacy, clerkUserId: "u1", email: "a@x.test", name: "A", createdAt: new Date(), updatedAt: new Date(), storefront: store("legacy"), paystackSubaccountCode: "ACCT_legacy" },
  { _id: ids.founding, clerkUserId: "u2", email: "b@x.test", name: "B", createdAt: new Date(), updatedAt: new Date(), storefront: store("founding") },
  { _id: ids.notOnboarded, clerkUserId: "u3", email: "c@x.test", name: "C", createdAt: new Date(), updatedAt: new Date() },
  { _id: ids.switchedOn, clerkUserId: "u4", email: "d@x.test", name: "D", createdAt: new Date(), updatedAt: new Date(), storefront: store("switchedon"),
    subscriptionStatus: "TRIAL", plan: "STANDARD", trialEndsAt: new Date("2026-12-01T00:00:00Z"), storefrontPaymentsEnabled: true, paystackSubaccountCode: "ACCT_d" },
  // Signed up 13-24 Aug 2026 under the removed Phase 13 subscription: stale status, old trialExpiresAt, no D-18 dates.
  { _id: ids.phase13, clerkUserId: "u5", email: "e@x.test", name: "E", createdAt: new Date(), updatedAt: new Date(), storefront: store("phase13"),
    subscriptionStatus: "EXPIRED", trialExpiresAt: new Date("2026-09-15T00:00:00Z") },
]);
await src.collection("Merchant").createIndexes([
  { key: { "storefront.subdomain": 1 }, name: "storefront_subdomain_unique", unique: true, sparse: true },
]);
const productId = new ObjectId();
await src.collection("Product").insertOne({
  _id: productId, merchantId: ids.legacy, name: "Ring", images: [], isActive: true, isFeatured: false,
  allowCustomization: true, customizationFee: 5.5, createdAt: new Date(), updatedAt: new Date(),
  variants: [{ id: "v1", name: "Gold", price: new Double(50), stock: new Int32(3), lowStockThreshold: 5, attributes: { size: 7 }, isActive: true, imageUrls: [], costPrice: null }],
});
await src.collection("Order").insertOne({
  _id: new ObjectId(), merchantId: ids.legacy, orderNumber: "PC-1", status: "PENDING", source: "STOREFRONT", paymentStatus: "UNPAID",
  paymentRef: "PCART-x", subtotal: 100, total: 100, platformFee: null, reservedUntil: new Date(Date.now() + 1e6),
  lineItems: [{ productId: productId.toHexString(), variantId: "v1", productName: "Ring", variantName: "Gold", price: 50, quantity: 2, subtotal: 100 }],
  createdAt: new Date(), updatedAt: new Date(),
});
const openOrderBefore = EJSON.stringify(await src.collection("Order").findOne({}), { relaxed: false });

// ---------------------------------------------------------------- backfill twice
const env = { DATABASE_URL: SRC, FOUNDING_MERCHANT_IDS: ids.founding.toHexString() };
const r1 = run("scripts/backfill-d18.mjs", [], env);
console.log(r1.out.trim());
check(r1.code === 0, "backfill run 1 exits 0");
const after1 = Object.fromEntries((await src.collection("Merchant").find().toArray()).map((m) => [m._id.toHexString(), m]));

const L = after1[ids.legacy.toHexString()];
check(L.subscriptionStatus === "TRIAL" && L.plan === "STANDARD", "legacy merchant -> TRIAL / STANDARD");
const trialDays = (L.trialEndsAt - Date.now()) / 864e5;
check(trialDays > 13.9 && trialDays <= 14, `legacy trial ~14 days (${trialDays.toFixed(3)})`);
check(L.storefrontPaymentsEnabled === false, "legacy merchant checkout off");
check(L.paystackSubaccountCode === "ACCT_legacy", "legacy subaccount kept");

const F = after1[ids.founding.toHexString()];
check(F.plan === "FOUNDING" && F.priceOverridePercent === 50, "founding plan 50%");
const months = (F.priceOverrideEndsAt.getUTCFullYear() - new Date().getUTCFullYear()) * 12 + F.priceOverrideEndsAt.getUTCMonth() - new Date().getUTCMonth();
check(months === 12, "founding ends in 12 months");

const C = after1[ids.notOnboarded.toHexString()];
check(C.subscriptionStatus === undefined && C.trialEndsAt === undefined, "not-onboarded merchant gets no trial clock");
check(C.storefrontPaymentsEnabled === false, "not-onboarded merchant checkout off");

const P = after1[ids.phase13.toHexString()];
const pDays = (P.trialEndsAt - Date.now()) / 864e5;
check(P.subscriptionStatus === "TRIAL" && pDays > 13.9 && pDays <= 14, "stale Phase 13 status (EXPIRED, no D-18 dates) -> fresh 14-day TRIAL");
check(P.storefrontPaymentsEnabled === false && P.plan === "STANDARD", "stale Phase 13 merchant checkout off, STANDARD");

const D = after1[ids.switchedOn.toHexString()];
check(D.storefrontPaymentsEnabled === true, "merchant who switched checkout on stays on");
check(D.trialEndsAt.toISOString() === "2026-12-01T00:00:00.000Z", "existing trial date untouched");

await new Promise((r) => setTimeout(r, 1100)); // so a re-run would produce different dates
const r2 = run("scripts/backfill-d18.mjs", [], env);
console.log(r2.out.trim());
check(r2.code === 0, "backfill run 2 exits 0");
const after2 = Object.fromEntries((await src.collection("Merchant").find().toArray()).map((m) => [m._id.toHexString(), m]));
check(EJSON.stringify(after1, { relaxed: false }) === EJSON.stringify(after2, { relaxed: false }), "second run changes nothing (byte-identical merchants)");
check(/"modified":0[,}].*"modified":0[,}].*"modified":0[,}]/.test(r2.out.replace(/\s/g, "")), "second run reports 0 modified");
const openOrderAfter = EJSON.stringify(await src.collection("Order").findOne({}), { relaxed: false });
check(openOrderBefore === openOrderAfter, "open Paystack order untouched");

const bad = run("scripts/backfill-d18.mjs", [], { ...env, FOUNDING_MERCHANT_IDS: "not-an-id" });
check(bad.code !== 0, "invalid FOUNDING_MERCHANT_IDS fails the build");

const listed = run("scripts/list-merchants.mjs", [], { DATABASE_URL: SRC });
check(listed.code === 0 && listed.out.includes(ids.founding.toHexString()) && /FOUNDING until \d{4}-\d{2}-\d{2}/.test(listed.out), "db:list-merchants shows ids and the founding plan");
check(!listed.out.includes(ids.notOnboarded.toHexString()), "db:list-merchants lists only merchants with a shop");
check(!/@x\.test/.test(listed.out), "db:list-merchants prints no emails");

// Founding added after launch: a second id on a later deploy gets the deal,
// the first one's end date doesn't move.
const lateId = ids.legacy.toHexString();
const foundingEndBefore = (await src.collection("Merchant").findOne({ _id: ids.founding })).priceOverrideEndsAt.toISOString();
const late = run("scripts/backfill-d18.mjs", [], { ...env, FOUNDING_MERCHANT_IDS: `${ids.founding.toHexString()},${lateId}` });
const lateM = await src.collection("Merchant").findOne({ _id: ids.legacy });
const foundingAfter = await src.collection("Merchant").findOne({ _id: ids.founding });
check(late.code === 0 && lateM.plan === "FOUNDING" && lateM.priceOverridePercent === 50 && lateM.priceOverrideEndsAt > new Date(), "founding id added later gets 50% for 12 months on the next deploy");
check(lateM.trialEndsAt.toISOString() === L.trialEndsAt.toISOString(), "late founding merchant keeps their trial date");
check(foundingAfter.priceOverrideEndsAt.toISOString() === foundingEndBefore, "existing founding end date unchanged when another id is added");

// ---------------------------------------------------------------- backup -> restore
if (existsSync(BACKUP)) unlinkSync(BACKUP);
const skip = run("scripts/backup-db.mjs", [], { DATABASE_URL: SRC, VERCEL_ENV: "preview" });
check(skip.code === 0 && /skipped/.test(skip.out), "backup skipped on preview builds");
const failNoCreds = run("scripts/backup-db.mjs", [], { DATABASE_URL: SRC, VERCEL_ENV: "production", R2_ACCOUNT_ID: "", BACKUP_R2_ACCESS_KEY_ID: "" });
check(failNoCreds.code !== 0, "production backup without R2 creds exits non-zero (blocks the deploy)");
check(!failNoCreds.out.includes(SRC), "failure output doesn't print the connection string");

const b = run("scripts/backup-db.mjs", ["--out", BACKUP], { DATABASE_URL: SRC });
console.log(b.out.trim());
check(b.code === 0 && existsSync(BACKUP), "backup --out writes a file");

const rs = run("scripts/restore-db.mjs", [BACKUP, DST], {});
console.log(rs.out.trim());
check(rs.code === 0, "restore into empty db succeeds");

const dst = client.db("primecart-restore");
for (const name of ["Merchant", "Product", "Order"]) {
  const raw = { promoteValues: false };
  const a = await src.collection(name).find({}, raw).sort({ _id: 1 }).toArray();
  const z = await dst.collection(name).find({}, raw).sort({ _id: 1 }).toArray();
  check(EJSON.stringify(a, { relaxed: false }) === EJSON.stringify(z, { relaxed: false }), `${name}: restored documents identical (types included)`);
}
const types = await dst.collection("Product").aggregate([{ $project: { p: { $type: { $arrayElemAt: ["$variants.price", 0] } }, s: { $type: { $arrayElemAt: ["$variants.stock", 0] } } } }]).toArray();
check(types[0].p === "double" && types[0].s === "int", `50.0 stays a double, stock stays int (${types[0].p}/${types[0].s})`);
const idx = await dst.collection("Merchant").indexes();
check(idx.some((i) => i.name === "storefront_subdomain_unique" && i.unique && i.sparse), "unique sparse subdomain index recreated");

const again = run("scripts/restore-db.mjs", [BACKUP, DST], {});
check(again.code !== 0 && /already has/.test(again.out), "restore refuses a non-empty target");
const forced = run("scripts/restore-db.mjs", [BACKUP, DST, "--force"], {});
check(forced.code === 0, "restore --force upserts over it");
check((await dst.collection("Merchant").countDocuments()) === (await src.collection("Merchant").countDocuments()), "no duplicates after --force");

// ---------------------------------------------------------------- expiry sweep filter
// Prisma on MongoDB: `reservedUntil: { lt: now }` alone matches null too, which
// expired every checkout-off and manual order (found on dev 2026-11-18). Runs the
// real filter from src/lib/orders/expiry-filter.ts through Prisma.
{
  const EXP = withDb("primecart-expiry");
  const orders = client.db("primecart-expiry").collection("Order");
  const base = { merchantId: new ObjectId(), status: "PENDING", paymentStatus: "UNPAID", source: "STOREFRONT", lineItems: [], subtotal: 1, total: 1, createdAt: new Date(), updatedAt: new Date() };
  const past = new Date(Date.now() - 60_000);
  await orders.insertMany([
    { ...base, orderNumber: "OFF-NULL", reservedUntil: null, stockReserved: false },
    { ...base, orderNumber: "MANUAL-NULL", source: "MANUAL", reservedUntil: null, stockReserved: true },
    { ...base, orderNumber: "LEGACY-MISSING" },
    { ...base, orderNumber: "HOLD-PAST", reservedUntil: past, stockReserved: true },
    { ...base, orderNumber: "HOLD-FUTURE", reservedUntil: new Date(Date.now() + 3_600_000), stockReserved: true },
    { ...base, orderNumber: "PAID-PAST", paymentStatus: "PAID", reservedUntil: past },
  ]);
  process.env.DATABASE_URL = EXP;
  const { PrismaClient } = await import("@prisma/client");
  const { abandonedOrderWhere } = await import("../src/lib/orders/expiry-filter.ts");
  const prisma = new PrismaClient();
  const hits = (await prisma.order.findMany({ where: abandonedOrderWhere(new Date()), select: { orderNumber: true } })).map((o) => o.orderNumber);
  check(JSON.stringify(hits) === JSON.stringify(["HOLD-PAST"]), `expiry sweep matches only a lapsed hold (got ${JSON.stringify(hits)})`);
  const naive = (await prisma.order.findMany({ where: { status: "PENDING", paymentStatus: "UNPAID", reservedUntil: { lt: new Date() } }, select: { orderNumber: true } })).map((o) => o.orderNumber);
  check(naive.includes("OFF-NULL"), "guard still needed: bare `lt` matches null on this Prisma version");
  await prisma.$disconnect();
}

await client.close();
await replSet.stop();
if (existsSync(BACKUP)) unlinkSync(BACKUP);
console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
