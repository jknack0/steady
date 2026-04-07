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

// LiveKit (telehealth video)
export const LIVEKIT_API_KEY = requireEnv("LIVEKIT_API_KEY", "devkey");
export const LIVEKIT_API_SECRET = requireEnv("LIVEKIT_API_SECRET", "devsecret");
export const LIVEKIT_URL = process.env.LIVEKIT_URL || "ws://localhost:7880";
