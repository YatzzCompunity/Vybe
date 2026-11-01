import { PrismaClient } from "@prisma/client";

/**
 * Global Prisma Client singleton for Next.js (App Router).
 * Prevents exhausting database connections or spawning duplicate client
 * instances across hot-reloads in `next dev`.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
