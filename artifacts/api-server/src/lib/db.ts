import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function prismaHasScoreDelegate(client: unknown): boolean {
  return typeof client === "object" && client !== null && "score" in client;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const prismaSingleton = ((): PrismaClient => {
  const existing = globalForPrisma.prisma;
  if (existing && prismaHasScoreDelegate(existing)) {
    return existing;
  }
  if (existing) {
    void existing.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }
  const created = createPrismaClient();
  globalForPrisma.prisma = created;
  return created;
})();

export const prisma = prismaSingleton;
