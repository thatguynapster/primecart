import { notFound } from "next/navigation";

import { requireMerchant } from "@/lib/merchant/current";

/**
 * TEMPORARY: fails on purpose, to prove the owner's error-alert email arrives.
 * Only on Preview deployments (dev), never in production. Remove after the
 * email has been seen.
 */
export default async function ErrorTestPage() {
  await requireMerchant();
  if (process.env.VERCEL_ENV !== "preview") notFound();

  throw new Error("Deliberate error to test the owner alert.");
}
