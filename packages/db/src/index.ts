import { PrismaClient } from "@prisma/client";
import { registerAuditMiddleware } from "./audit-middleware";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Register audit middleware (idempotent — only on first creation)
if (!globalForPrisma.prisma) {
  registerAuditMiddleware(prisma);
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient } from "@prisma/client";
export type * from "@prisma/client";
export { runWithAuditUser, getAuditUserId } from "./audit-middleware";
