/**
 * Database backup (Phase 18, task 18.0 / brief T0).
 *
 * Production runs on an Atlas M0 cluster with no managed backups, so backups
 * are ours. This one script runs in two places:
 *   - `vercel-build`, before `db:push`, so every deploy that might migrate
 *     takes a fresh copy first. Skipped unless VERCEL_ENV=production (or
 *     BACKUP_ON_BUILD=1), so Preview builds don't pile up copies.
 *   - .github/workflows/db-backup.yml, daily (BACKUP_SOURCE=scheduled).
 *
 * Output: one gzipped file of newline-delimited **canonical EJSON**, so
 * ObjectIds, dates and number types survive a restore exactly:
 *   {"t":"meta", ...}
 *   {"t":"collection","name":"Merchant","indexes":[...]}
 *   {"t":"doc","d":{...}}           <- one per document, after its collection
 *   ...
 *   {"t":"end","collections":{...counts}}
 *
 * Uploaded to a PRIVATE R2 bucket at
 *   production/<ISO timestamp>-<commit>.ejson.gz            (deploys)
 *   production/scheduled/<ISO timestamp>.ejson.gz           (daily)
 * with its own R2 token scoped to that bucket only (not the image key).
 *
 * The repository is public: this never prints documents or connection
 * strings. Counts, names and sizes only. Exits non-zero on any failure, so
 * a deploy never migrates without a backup.
 *
 * Env:
 *   DATABASE_URL                     source database (read access is enough)
 *   R2_ACCOUNT_ID                    Cloudflare account id
 *   BACKUP_R2_ACCESS_KEY_ID          token scoped to the backup bucket
 *   BACKUP_R2_SECRET_ACCESS_KEY
 *   BACKUP_R2_BUCKET                 default "primecart-backups"
 *   BACKUP_ON_BUILD=1                force a run outside VERCEL_ENV=production
 *   BACKUP_SOURCE=scheduled          file naming for the daily job
 *   BACKUP_PREFIX                    default "production"
 *
 * Local copy without uploading (also how the restore drill is tested):
 *   node --env-file=.env scripts/backup-db.mjs --out ./backup.ejson.gz
 */
import { createReadStream, createWriteStream, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createGzip } from "node:zlib";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BSON, MongoClient } from "mongodb";

const { EJSON } = BSON;

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

/** Writes to a gzip stream, respecting backpressure. */
async function writeLine(gzip, value) {
  if (!gzip.write(`${EJSON.stringify(value, { relaxed: false })}\n`)) {
    await once(gzip, "drain");
  }
}

async function dump(uri, outPath) {
  const client = new MongoClient(uri, {
    // Gentle on an M0: one connection, read from a secondary when possible.
    maxPoolSize: 1,
    readPreference: "secondaryPreferred",
  });
  await client.connect();

  const gzip = createGzip({ level: 9 });
  const file = createWriteStream(outPath);
  gzip.pipe(file);
  const fileClosed = once(file, "close");

  const counts = {};
  try {
    const db = client.db(); // database named in the connection string
    await writeLine(gzip, {
      t: "meta",
      format: "primecart-backup-v1",
      database: db.databaseName,
      createdAt: new Date(),
      source: process.env.BACKUP_SOURCE || "deploy",
      commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null,
    });

    const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((name) => !name.startsWith("system."))
      .sort();

    for (const name of collections) {
      const collection = db.collection(name);
      const indexes = await collection.listIndexes().toArray();
      await writeLine(gzip, { t: "collection", name, indexes });

      let n = 0;
      // promoteValues: false keeps BSON wrapper types (Double, Int32, Long)
      // instead of plain JS numbers. Without it, a stored double like 50.0
      // becomes the JS number 50 and canonical EJSON writes it as an Int32,
      // silently changing the type on restore. Caught by the restore test.
      for await (const doc of collection.find({}, { batchSize: 500, promoteValues: false })) {
        await writeLine(gzip, { t: "doc", d: doc });
        n += 1;
      }
      counts[name] = n;
    }

    await writeLine(gzip, { t: "end", collections: counts });
  } finally {
    gzip.end();
    await fileClosed;
    await client.close();
  }

  return { counts, bytes: statSync(outPath).size };
}

function backupKey() {
  const prefix = process.env.BACKUP_PREFIX || "production";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (process.env.BACKUP_SOURCE === "scheduled") {
    return `${prefix}/scheduled/${stamp}.ejson.gz`;
  }
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local").slice(0, 7);
  return `${prefix}/${stamp}-${sha}.ejson.gz`;
}

async function upload(path, key, bytes) {
  const bucket = process.env.BACKUP_R2_BUCKET || "primecart-backups";
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("BACKUP_R2_ACCESS_KEY_ID"),
      secretAccessKey: required("BACKUP_R2_SECRET_ACCESS_KEY"),
    },
  });
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(path),
      ContentLength: bytes,
      ContentType: "application/gzip",
    })
  );
  return bucket;
}

async function main() {
  const outPath = arg("--out");
  const onBuild = process.env.VERCEL_ENV === "production" || process.env.BACKUP_ON_BUILD === "1";

  if (!outPath && !onBuild) {
    console.log(
      `Backup skipped: VERCEL_ENV=${process.env.VERCEL_ENV ?? "(unset)"}, BACKUP_ON_BUILD not set.`
    );
    return;
  }

  const uri = required("DATABASE_URL");
  const started = Date.now();
  const localPath = outPath ?? join(tmpdir(), `primecart-backup-${process.pid}.ejson.gz`);

  const { counts, bytes } = await dump(uri, localPath);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(
    `Backup dumped: ${Object.keys(counts).length} collections, ${total} documents, ` +
      `${(bytes / 1024).toFixed(1)} KiB gzipped, in ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
  for (const [name, n] of Object.entries(counts)) console.log(`  ${name}: ${n}`);

  if (outPath) {
    console.log(`Backup written to ${outPath} (not uploaded).`);
    return;
  }

  try {
    const key = backupKey();
    const bucket = await upload(localPath, key, bytes);
    console.log(`Backup uploaded: r2://${bucket}/${key}`);
  } finally {
    try {
      unlinkSync(localPath);
    } catch {
      // temp file already gone
    }
  }
}

main().catch((error) => {
  // Message only: never the connection string or document contents.
  console.error(`Backup FAILED: ${error?.message ?? error}`);
  process.exit(1);
});
