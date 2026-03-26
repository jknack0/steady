import { PrismaClient } from "@prisma/client";
import { registerAuditMiddleware } from "./audit-middleware";
import { registerEncryptionMiddleware } from "./encryption-middleware";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Register middleware (idempotent — only on first creation)
// Order matters: encryption runs first (innermost), then audit wraps it
if (!globalForPrisma.prisma) {
  registerEncryptionMiddleware(prisma);
  registerAuditMiddleware(prisma);
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient } from "@prisma/client";
export type * from "@prisma/client";
export { runWithAuditUser, getAuditUserId } from "./audit-middleware";
export { encryptField, decryptField } from "./crypto";
