/**
 * HIPAA-safe logger. Logs error type, message, and stack trace only.
 * Never logs full error objects, query results, or request bodies,
 * as these may contain PHI (names, emails, health data).
 */

function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    // Log name + message + stack (no data/cause which may contain PII)
    return `${err.name}: ${err.message}`;
  }
  if (typeof err === "string") {
    return err;
  }
  return "Unknown error";
}

export const logger = {
  error(context: string, err?: unknown): void {
    if (err) {
      console.error(`[ERROR] ${context} — ${sanitizeError(err)}`);
      // Log stack in non-production for debugging
      if (process.env.NODE_ENV !== "production" && err instanceof Error && err.stack) {
        console.error(err.stack);
      }
    } else {
      console.error(`[ERROR] ${context}`);
    }
  },

  warn(context: string, detail?: string): void {
    console.warn(`[WARN] ${context}${detail ? ` — ${detail}` : ""}`);
  },

  info(context: string, detail?: string): void {
    console.log(`[INFO] ${context}${detail ? ` — ${detail}` : ""}`);
  },
};
