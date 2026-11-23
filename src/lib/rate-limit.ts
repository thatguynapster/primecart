import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { windowFor } from "@/lib/rate-window";

/**
 * Fixed-window counters in MongoDB, shared by every serverless instance. Old
 * windows are removed by the TTL index in prisma/indexes.mjs.
 *
 * Identifiers (IP addresses, phone numbers) are stored only as a keyed hash.
 *
 * Fails open: a database problem must not stop a shop from selling.
 */
export async function withinLimit(params: {
  /** What is being limited, e.g. "order-ip". */
  name: string;
  identifier: string;
  limit: number;
  windowMinutes: number;
}): Promise<boolean> {
  const { bucket, expiresAt } = windowFor(new Date(), params.windowMinutes);
  const hash = createHash("sha256")
    .update(`${process.env.CRON_SECRET ?? ""}:${params.identifier}`)
    .digest("hex")
    .slice(0, 32);
  const key = `${params.name}:${hash}:${bucket}`;

  try {
    return (await increment(key, expiresAt)) <= params.limit;
  } catch (error) {
    console.error(`Rate limit "${params.name}" could not be checked:`, error);
    return true;
  }
}

async function increment(key: string, expiresAt: Date): Promise<number> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const row = await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, expiresAt },
        update: { count: { increment: 1 } },
      });
      return row.count;
    } catch (error) {
      // Concurrent first hits can collide on the unique key, and concurrent
      // increments can conflict (P2034). Both succeed on another try.
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034");
      if (!retryable || attempt >= 4) throw error;
    }
  }
}

/** The caller's IP as Vercel reports it, or null when unknown (local dev). */
export function clientIp(headers: Headers): string | null {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}
