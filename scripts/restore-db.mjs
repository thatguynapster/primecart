/**
 * Restore a backup made by scripts/backup-db.mjs (Phase 18, task 18.0).
 *
 *   node scripts/restore-db.mjs <backup> <target DATABASE_URL> [--force]
 *
 * <backup> is a local .ejson.gz file, or an R2 key in the backup bucket
 * (e.g. production/2026-11-18T02-30-00-000Z-abc1234.ejson.gz), downloaded with
 * the BACKUP_R2_* credentials (see backup-db.mjs).
 *
 * The intended target is a NEW, EMPTY database or cluster: restore there,
 * check it, then point DATABASE_URL at it. Restoring over live production is
 * a last resort. So this refuses to write into a database that already has
 * documents, unless --force is given. With --force it upserts each backed-up
 * document by _id (replacing what's there) and leaves any other documents
 * alone. It never drops anything.
 *
 * Indexes are recreated first (including the manual storefront.subdomain
 * unique index), then documents are inserted in batches.
 *
 * Needs a machine that can reach the target cluster (an Atlas user plus your
 * IP on the allowlist). Prints counts only, never documents.
 */
import { createReadStream, createWriteStream, existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BSON, MongoClient } from "mongodb";

const { EJSON } = BSON;
const BATCH = 500;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

async function localCopy(source) {
  if (existsSync(source)) return { path: source, temporary: false };

  const bucket = process.env.BACKUP_R2_BUCKET || "primecart-backups";
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("BACKUP_R2_ACCESS_KEY_ID"),
      secretAccessKey: required("BACKUP_R2_SECRET_ACCESS_KEY"),
    },
  });
  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: source }));
  const path = join(tmpdir(), `primecart-restore-${process.pid}.ejson.gz`);
  await pipeline(object.Body, createWriteStream(path));
  console.log(`Downloaded r2://${bucket}/${source}`);
  return { path, temporary: true };
}

async function main() {
  const [source, targetUri] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const force = process.argv.includes("--force");
  if (!source || !targetUri) {
    throw new Error("Usage: node scripts/restore-db.mjs <backup file or R2 key> <target DATABASE_URL> [--force]");
  }

  const { path, temporary } = await localCopy(source);
  const client = new MongoClient(targetUri, { maxPoolSize: 2 });
  await client.connect();

  try {
    const db = client.db();

    // ---- refuse a non-empty target unless --force ----------------------------
    const existing = await db.listCollections({}, { nameOnly: true }).toArray();
    let nonEmpty = 0;
    for (const { name } of existing) {
      if (name.startsWith("system.")) continue;
      nonEmpty += await db.collection(name).estimatedDocumentCount();
    }
    if (nonEmpty > 0 && !force) {
      throw new Error(
        `Target database "${db.databaseName}" already has ${nonEmpty} documents. ` +
          `Restore into an empty database, or pass --force to upsert over it.`
      );
    }
    console.log(
      `Restoring into "${db.databaseName}"${nonEmpty > 0 ? ` (non-empty, --force: upserting by _id)` : ""}`
    );

    // ---- stream the file -------------------------------------------------------
    const lines = createInterface({
      input: createReadStream(path).pipe(createGunzip()),
      crlfDelay: Infinity,
    });

    let current = null;
    let batch = [];
    const restored = {};
    let expected = null;

    const flush = async () => {
      if (!current || batch.length === 0) return;
      const collection = db.collection(current);
      if (force) {
        await collection.bulkWrite(
          batch.map((doc) => ({
            replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
          })),
          { ordered: false }
        );
      } else {
        await collection.insertMany(batch, { ordered: true });
      }
      restored[current] = (restored[current] ?? 0) + batch.length;
      batch = [];
    };

    for await (const line of lines) {
      if (!line.trim()) continue;
      const record = EJSON.parse(line, { relaxed: false });

      if (record.t === "meta") {
        if (record.format !== "primecart-backup-v1") {
          throw new Error(`Unknown backup format: ${record.format}`);
        }
        console.log(`Backup of "${record.database}" taken ${new Date(record.createdAt).toISOString()} (${record.source})`);
      } else if (record.t === "collection") {
        await flush();
        current = record.name;
        restored[current] = 0;
        await db.createCollection(current).catch((error) => {
          if (error?.codeName !== "NamespaceExists") throw error;
        });
        const indexes = record.indexes
          .filter((index) => index.name !== "_id_")
          .map(({ v: _v, ns: _ns, ...spec }) => spec);
        if (indexes.length > 0) {
          await db.collection(current).createIndexes(indexes);
        }
      } else if (record.t === "doc") {
        batch.push(record.d);
        if (batch.length >= BATCH) await flush();
      } else if (record.t === "end") {
        await flush();
        expected = record.collections;
      }
    }
    await flush();

    if (!expected) throw new Error("Backup file is truncated: no end marker.");

    let mismatch = false;
    for (const [name, count] of Object.entries(expected)) {
      // Counts come back as BSON Int32 from canonical EJSON.
      const ok = restored[name] === Number(count);
      if (!ok) mismatch = true;
      console.log(`  ${name}: ${restored[name] ?? 0} / ${Number(count)}${ok ? "" : "  <-- MISMATCH"}`);
    }
    if (mismatch) throw new Error("Restored counts don't match the backup.");
    console.log("Restore complete. Spot-check a few documents before switching DATABASE_URL.");
  } finally {
    await client.close();
    if (temporary) {
      try {
        unlinkSync(path);
      } catch {
        // already gone
      }
    }
  }
}

main().catch((error) => {
  console.error(`Restore FAILED: ${error?.message ?? error}`);
  process.exit(1);
});
