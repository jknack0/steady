import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

// Check for ZodError by structure rather than instanceof to avoid CJS/ESM identity issues
function isZodError(err: unknown): err is { issues: Array<{ path: (string | number)[]; message: string }> } {
  return (
    typeof err === "object" &&
    err !== null &&
    "issues" in err &&
    Array.isArray((err as any).issues)
  );
}

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (isZodError(err)) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: err.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}
