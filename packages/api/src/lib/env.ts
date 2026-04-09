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
