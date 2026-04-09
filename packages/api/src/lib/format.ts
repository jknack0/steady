/**
 * Format a person's first + last name, trimming any trailing whitespace
 * when lastName is empty.
 */
export function formatName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
