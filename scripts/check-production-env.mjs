/**
 * Stops a production deploy, before the backup and schema push, unless every
 * variable in `production-env.mjs` is set and looks right. Lists all the
 * problems at once. Skipped on other Vercel builds.
 *
 * Check a local file instead: `npm run env:check` (reads `.env.prod`).
 *
 * Prints variable names only, never values (the repository is public).
 */
import { checkProductionEnv, REQUIRED_NAMES } from "./production-env.mjs";

const local = process.argv.includes("--local");

if (process.env.VERCEL && !process.env.VERCEL_ENV) {
  console.error("VERCEL_ENV is missing. In Vercel, turn on automatic system environment variables.");
  process.exit(1);
}

if (local || process.env.VERCEL_ENV === "production") {
  const { errors, warnings } = checkProductionEnv(process.env);
  for (const warning of warnings) console.warn(`Note: ${warning}`);
  if (errors.length > 0) {
    console.error(`\nProduction environment: ${errors.length} to fix${local ? "" : " in Vercel (Production)"}`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`Production environment: all ${REQUIRED_NAMES.length} variables are set and look right.`);
}
