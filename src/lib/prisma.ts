import { PrismaClient } from "@prisma/client";

/**
 * Prisma client, constructed lazily on first use.
 *
 * Construction is deferred to first property access so that no connection is
 * opened for requests that never touch the database — most proxy invocations,
 * the marketing site, and any static route. It also keeps any future
 * construction-time failure inside the request path, where the proxy's
 * fail-open guard can catch it (handover §Proxy, Fix 3: "must never crash a
 * request") rather than at module import, which no handler can guard.
 *
 * Note: Prisma 6.19 does *not* throw when constructed with a missing or
 * malformed DATABASE_URL — it throws on the first query instead. So this is
 * hardening, not a fix for a live failure.
 *
 * Call sites are unchanged: `prisma.merchant.findFirst(...)`,
 * `prisma.$runCommandRaw(...)` and so on all behave as before.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Module-scoped cache for production, where `globalThis` is deliberately not
 * used. Without this, every property access would build a new client and
 * exhaust the connection pool.
 */
let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  // In development Next.js hot-reloads modules, which would otherwise open a
  // new connection pool on every reload until MongoDB refuses them. Caching on
  // globalThis survives reloads; in production the module is evaluated once.
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (client) return client;

  client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const instance = getClient();
    const value = Reflect.get(instance, property, receiver);
    // Model delegates (`prisma.merchant`) are plain objects and pass through.
    // Methods (`prisma.$runCommandRaw`) must keep `this` bound to the client.
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
