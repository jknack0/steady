const isProduction = process.env.NODE_ENV === "production";

function requireEnv(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

export const JWT_SECRET = requireEnv("JWT_SECRET", "dev-secret-change-in-production");

// Cognito — optional, falls back to JWT_SECRET verification if not set
export const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "";
export const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";
export const COGNITO_REGION = process.env.COGNITO_REGION || "us-east-2";

// LiveKit (telehealth video) — optional, telehealth endpoints return 503 if not configured
export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "devsecret";
export const LIVEKIT_URL = process.env.LIVEKIT_URL || "ws://localhost:7880";

// Transcription pipeline — S3 bucket for audio recordings
export const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || "";
export const TRANSCRIPTION_QUEUE_URL = process.env.TRANSCRIPTION_QUEUE_URL || "";
export const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";
export const TRANSCRIPTION_WORKER_URL = process.env.TRANSCRIPTION_WORKER_URL || "";
export const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
// URL the transcription worker uses to POST back to us. Differs from
// API_BASE_URL in local dev because the worker runs inside Docker
// while the API runs on the host — `localhost` inside the container
// is the container itself, not the host. Defaults to API_BASE_URL in
// prod (both run on the same machine or behind the same DNS).
export const TRANSCRIPTION_CALLBACK_BASE_URL =
  process.env.TRANSCRIPTION_CALLBACK_BASE_URL || API_BASE_URL;

// Client Web Portal (FR-1 through FR-12)
export const PORTAL_BASE_URL =
  process.env.PORTAL_BASE_URL || "http://localhost:3000/portal";
export const PORTAL_INVITE_TTL_DAYS = parseInt(
  process.env.PORTAL_INVITE_TTL_DAYS || "7",
  10
);

// Amazon SES — transactional email for portal invitations
// BAA-eligible; must be in production mode before GA per COND-2
export const SES_REGION = process.env.SES_REGION || "us-east-2";
export const SES_FROM_ADDRESS =
  process.env.SES_FROM_ADDRESS || "no-reply@portal.steadymentalhealth.com";
export const SES_CONFIGURATION_SET = process.env.SES_CONFIGURATION_SET || "";
export const SES_BOUNCE_TOPIC_ARN = process.env.SES_BOUNCE_TOPIC_ARN || "";
export const SES_COMPLAINT_TOPIC_ARN =
  process.env.SES_COMPLAINT_TOPIC_ARN || "";

// Dev/test flag — when true, SES sends are stubbed and recorded in-memory.
// Required true in CI/test; false in staging/production.
export const SES_MOCK_MODE =
  process.env.SES_MOCK_MODE === "true" ||
  process.env.NODE_ENV === "test" ||
  !process.env.SES_FROM_ADDRESS;
