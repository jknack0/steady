/**
 * Shared date and money formatting utilities.
 *
 * Consolidates duplicate formatting functions that were previously
 * defined locally across multiple dashboard pages.
 */

import { MS_PER_DAY } from "@/lib/constants";

/**
 * Returns a human-readable "X days ago" label and a staleness flag.
 * Used on RTM dashboard cards to show last engagement.
 */
export function daysAgoLabel(dateStr: string | null): { label: string; isStale: boolean } {
  if (!dateStr) return { label: "Never", isStale: true };
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { label: "Today", isStale: false };
  if (diffDays === 1) return { label: "Yesterday", isStale: false };
  return { label: `${diffDays} days ago`, isStale: diffDays > 2 };
}

/**
 * Formats a number as USD currency with no decimal places.
 * e.g. 150 -> "$150"
 */
export function formatCurrency(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

/**
 * Formats a date string as "Mon DD, YYYY".
 * e.g. "2026-03-15" -> "Mar 15, 2026"
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats a date string as "Mon DD" (no year).
 * e.g. "2026-03-15" -> "Mar 15"
 */
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats a number as a dollar amount with two decimal places.
 * e.g. 125.5 -> "$125.50"
 */
export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Formats an amount in cents as a dollar string with two decimal places.
 * e.g. 15050 -> "$150.50"
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Formats a date string as MM/DD/YYYY (numeric).
 * e.g. "2026-03-15" -> "03/15/2026"
 * Used in superbill / CMS-1500 contexts.
 */
export function formatDateNumeric(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Formats a date string as a compact "last active" label.
 * Used on the participants list page.
 */
export function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
