/**
 * Fails `npm run build` on Vercel. Deploys must run `npm run vercel-build`,
 * which backs up the database, pushes the schema and runs the backfills
 * before building. A Build Command override such as
 * `npm run build && npm run db:push` silently skips all of that (it did,
 * until 2026-11-18): no backup, and no merchant ever got a trial.
 *
 * Locally (no VERCEL env var) this does nothing.
 */
if (process.env.VERCEL && process.env.npm_lifecycle_event === "build") {
  console.error(
    [
      "",
      "This Vercel deploy ran `npm run build`, which skips the database backup,",
      "schema push and backfills. Set Project Settings -> Build and Deployment ->",
      "Build Command to `npm run vercel-build` (or turn the override off).",
      "",
    ].join("\n")
  );
  process.exit(1);
}
