/** Milliseconds in one day (24 hours). */
export const MS_PER_DAY = 86_400_000;

/** Milliseconds in one hour. */
export const MS_PER_HOUR = 3_600_000;

/** Milliseconds in one minute. */
export const MS_PER_MINUTE = 60_000;

/** Default admin email used for dev syncing and seed data. */
export const ADMIN_EMAIL =
  process.env.ADMIN_SYNC_SOURCE_EMAIL || "admin@admin.com";
