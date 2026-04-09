import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader } from "./helpers";

const db = vi.mocked(prisma);

// Mock bcryptjs for legacy fallback (Cognito not configured in test env)
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const mockUser = (overrides: any = {}) => ({
  id: "user-1",
  email: "test@steady.dev",
  passwordHash: "hashed-password",
  firstName: "Test",
  lastName: "User",
  role: "CLINICIAN",
  createdAt: new Date(),
  updatedAt: new Date(),
  clinicianProfile: { id: "cp-1" },
  participantProfile: null,
  ...overrides,
});

describe("POST /api/auth/register", () => {
  it("creates a new clinician user", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(mockUser() as any);

    const res = await request(app).post("/api/auth/register").send({
      email: "test@steady.dev",
      password: "password123",
      firstName: "Test",
      lastName: "User",
      role: "CLINICIAN",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("test@steady.dev");
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it("returns 409 if email already exists", async () => {
    db.user.findUnique.mockResolvedValue(mockUser() as any);

    const res = await request(app).post("/api/auth/register").send({
      email: "test@steady.dev",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email already registered");
  });

  it("returns 400 for invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for short password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@steady.dev",
      password: "short",
      firstName: "Test",
      lastName: "User",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing firstName", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@steady.dev",
      password: "password123",
      lastName: "User",
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with valid credentials (legacy mode)", async () => {
    const bcrypt = await import("bcryptjs");
    const mockBcrypt = vi.mocked(bcrypt.default);

    db.user.findUnique.mockResolvedValue(mockUser() as any);
    mockBcrypt.compare.mockResolvedValue(true as any);

    const res = await request(app).post("/api/auth/login").send({
      email: "test@steady.dev",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("test@steady.dev");
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Should not return passwordHash
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("returns 401 for non-existent user", async () => {
    db.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@steady.dev",
      password: "password123",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("returns 401 for wrong password (legacy mode)", async () => {
    const bcrypt = await import("bcryptjs");
    const mockBcrypt = vi.mocked(bcrypt.default);

    db.user.findUnique.mockResolvedValue(mockUser() as any);
    mockBcrypt.compare.mockResolvedValue(false as any);

    const res = await request(app).post("/api/auth/login").send({
      email: "test@steady.dev",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("returns 400 for missing email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      password: "password123",
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns current user with valid token", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@steady.dev",
      firstName: "Test",
      lastName: "User",
      role: "CLINICIAN",
      createdAt: new Date(),
    } as any);

    db.clinicianConfig.findUnique.mockResolvedValue(null as any);

    const res = await request(app)
      .get("/api/auth/me")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("test@steady.dev");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/refresh", () => {
  it("returns 400 without refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 in legacy mode (no Cognito configured)", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "some-token" });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("returns success and clears cookies", async () => {
    const res = await request(app).post("/api/auth/logout").send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns success even with refresh token in body", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken: "some-token" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("POST /api/auth/forgot-password", () => {
  it("returns success regardless of email existence (legacy mode)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "test@steady.dev" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 without email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/confirm-reset-password", () => {
  it("returns 503 in legacy mode", async () => {
    const res = await request(app)
      .post("/api/auth/confirm-reset-password")
      .send({ email: "test@steady.dev", code: "123456", newPassword: "newpassword123" });

    expect(res.status).toBe(503);
  });

  it("returns 400 with missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/confirm-reset-password")
      .send({ email: "test@steady.dev" });

    expect(res.status).toBe(400);
  });
});
