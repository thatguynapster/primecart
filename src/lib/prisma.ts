import { PrismaClient } from "@prisma/client";

// Next.js hot-reloads modules in development, which would otherwise open a new
// connection pool on every reload until MongoDB refuses them. Caching the
// client on globalThis keeps a single instance across reloads. In production
// the module is evaluated once, so the global is not used.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
