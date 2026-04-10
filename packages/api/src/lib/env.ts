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
