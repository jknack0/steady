import { PrismaClient } from "@prisma/client";

/**
 * Prisma middleware that logs all create/update/delete mutations to the audit_logs table.
 *
 * HIPAA compliance: Only logs IDs and operation names. Never logs PII fields.
 *
 * The userId is attached to the Prisma client via `setAuditUser()` which stores
 * the current user in AsyncLocalStorage, avoiding any need to pass userId through
 * every service call.
 */

import { AsyncLocalStorage } from "node:async_hooks";

const auditContext = new AsyncLocalStorage<{ userId: string | null }>();

/**
 * Run a callback with audit context (userId). Use in route handlers:
 * ```
 * runWithAuditUser(req.user?.userId ?? null, async () => { ... })
 * ```
 */
export function runWithAuditUser<T>(userId: string | null, fn: () => T): T {
  return auditContext.run({ userId }, fn);
}

/**
 * Get the current audit user from AsyncLocalStorage context.
 */
export function getAuditUserId(): string | null {
  return auditContext.getStore()?.userId ?? null;
}

// Models to skip auditing (internal/meta tables)
const SKIP_MODELS = new Set([
  "AuditLog", // Don't audit the audit log itself
]);

// Map Prisma actions to our audit actions
const PRISMA_TO_AUDIT: Record<string, "CREATE" | "UPDATE" | "DELETE" | null> = {
  create: "CREATE",
  createMany: "CREATE",
  update: "UPDATE",
  updateMany: "UPDATE",
  upsert: "UPDATE",
  delete: "DELETE",
  deleteMany: "DELETE",
};

/**
 * Extract the resource ID from the operation args.
 * Returns the ID of the affected resource, or "bulk" for *Many operations.
 */
function extractResourceId(action: string, args: any, result: any): string {
  // For single operations, try to get ID from result first, then from where clause
  if (result?.id) return result.id;
  if (args?.where?.id) return args.where.id;

  // Composite unique keys
  if (args?.where) {
    const whereKeys = Object.keys(args.where);
    if (whereKeys.length === 1) {
      const val = args.where[whereKeys[0]];
      if (typeof val === "string") return val;
    }
  }

  // *Many operations
  if (action.endsWith("Many")) return "bulk";

  return "unknown";
}

/**
 * Build safe metadata (no PII). Only include:
 * - which fields were changed (for updates)
 * - count (for *Many operations)
 */
function buildMetadata(action: string, args: any, result: any): Record<string, any> | null {
  if (action === "update" || action === "upsert") {
    const data = args?.data;
    if (data) {
      // Only log field names that changed, never values
      return { changedFields: Object.keys(data) };
    }
  }

  if (action === "updateMany" || action === "deleteMany") {
    return { count: result?.count ?? null };
  }

  if (action === "createMany") {
    return { count: result?.count ?? null };
  }

  return null;
}

/**
 * Register the audit middleware on a PrismaClient instance.
 */
export function registerAuditMiddleware(client: PrismaClient): void {
  client.$use(async (params: { model?: string; action: string; args: any }, next: (params: any) => Promise<any>) => {
    const auditAction = PRISMA_TO_AUDIT[params.action];

    // Skip non-mutation actions (findMany, aggregate, etc.) and skipped models
    if (!auditAction || !params.model || SKIP_MODELS.has(params.model)) {
      return next(params);
    }

    // Execute the actual operation first
    const result = await next(params);

    // Log asynchronously — don't block the response
    const userId = getAuditUserId();
    const resourceId = extractResourceId(params.action, params.args, result);
    const metadata = buildMetadata(params.action, params.args, result);

    // Fire-and-forget: write audit log without blocking
    // Use raw SQL to avoid triggering the middleware recursively
    client.$executeRawUnsafe(
      `INSERT INTO audit_logs (id, "userId", action, "resourceType", "resourceId", metadata, timestamp)
       VALUES (gen_random_uuid(), $1, $2::"AuditAction", $3, $4, $5::jsonb, NOW())`,
      userId,
      auditAction,
      params.model,
      resourceId,
      metadata ? JSON.stringify(metadata) : null
    ).catch((err: unknown) => {
      // Never let audit logging break the application
      // Log only error name/message — never the full object which may contain SQL with PHI
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : "Unknown error";
      console.warn(`[AUDIT] Audit log write failed — ${msg}`);
    });

    return result;
  });
}
