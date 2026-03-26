import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { createTestToken } from "./helpers";
import { JWT_SECRET } from "../lib/env";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Authentication Middleware", () => {
  it("returns 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/programs");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing authorization token");
  });

  it("returns 401 when Authorization header is malformed", async () => {
    const res = await request(app)
      .get("/api/programs")
      .set("Authorization", "NotBearer token");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing authorization token");
  });

  it("returns 401 when token is invalid", async () => {
    const res = await request(app)
      .get("/api/programs")
      .set("Authorization", "Bearer invalid.jwt.token");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  it("returns 401 when token is expired", async () => {
    const jwt = require("jsonwebtoken");
    const expiredToken = jwt.sign(
      { userId: "user-1", role: "CLINICIAN" },
      JWT_SECRET,
      { expiresIn: "0s" }
    );

    // Small delay to ensure expiry
    await new Promise((r) => setTimeout(r, 50));

    const res = await request(app)
      .get("/api/programs")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it("returns 403 when role is insufficient", async () => {
    const token = createTestToken({ role: "PARTICIPANT" });

    const res = await request(app)
      .get("/api/programs")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Insufficient permissions");
  });

  it("passes through with valid clinician token", async () => {
    // This will fail at the DB level (mock returns undefined by default)
    // but it should NOT fail at the auth level
    const token = createTestToken({ role: "CLINICIAN" });

    const res = await request(app)
      .get("/api/programs")
      .set("Authorization", `Bearer ${token}`);

    // Should not be 401 or 403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("Health Check", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("STEADY with ADHD");
  });
});
