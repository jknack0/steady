/**
 * Generic query string builder.
 *
 * Accepts a flat record and converts non-null/undefined values to a
 * URLSearchParams string. Booleans and numbers are stringified.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      qs.set(key, String(value));
    }
  }
  return qs.toString();
}
