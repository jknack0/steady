import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader } from "./helpers";

const db = vi.mocked(prisma);

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

const mockBcrypt = vi.mocked(bcrypt);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: refreshToken.create returns a stored token object
  db.refreshToken.create.mockImplementation(async ({ data }: any) => ({
    id: "rt-1",
    token: data.token,
    userId: data.userId,
    familyId: data.familyId,
    revoked: false,
    expiresAt: data.expiresAt,
    createdAt: new Date(),
  }));
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
    // Refresh token should be stored in DB
    expect(db.refreshToken.create).toHaveBeenCalledOnce();
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
  it("logs in with valid credentials and stores refresh token in DB", async () => {
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
    // Refresh token stored in DB
    expect(db.refreshToken.create).toHaveBeenCalledOnce();
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

  it("returns 401 for wrong password", async () => {
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

  it("returns 401 when token not found in DB", async () => {
    db.refreshToken.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "unknown-token" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired refresh token");
  });

  it("returns 401 when token is expired", async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      id: "rt-1",
      token: "expired-token",
      userId: "user-1",
      familyId: "family-1",
      revoked: false,
      expiresAt: new Date(Date.now() - 1000), // expired
      createdAt: new Date(),
    } as any);

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "expired-token" });

    expect(res.status).toBe(401);
  });

  it("rotates token: revokes old, issues new in same family", async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      id: "rt-1",
      token: "valid-token",
      userId: "user-1",
      familyId: "family-1",
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    } as any);

    db.refreshToken.update.mockResolvedValue({} as any);
    db.user.findUnique.mockResolvedValue(mockUser() as any);

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "valid-token" });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();

    // Old token revoked
    expect(db.refreshToken.update).toHaveBeenCalledWith({
      where: { id: "rt-1" },
      data: { revoked: true },
    });

    // New token created in same family
    expect(db.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          familyId: "family-1",
        }),
      })
    );
  });

  it("detects token reuse and revokes entire family", async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      id: "rt-1",
      token: "reused-token",
      userId: "user-1",
      familyId: "family-1",
      revoked: true, // already used
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    } as any);

    db.refreshToken.updateMany.mockResolvedValue({ count: 3 } as any);

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "reused-token" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Token reuse detected. Please log in again.");

    // All tokens in the family should be revoked
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId: "family-1" },
      data: { revoked: true },
    });
  });
});

describe("POST /api/auth/logout", () => {
  it("revokes entire token family on logout", async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      id: "rt-1",
      token: "logout-token",
      userId: "user-1",
      familyId: "family-1",
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    } as any);

    db.refreshToken.updateMany.mockResolvedValue({ count: 2 } as any);

    const res = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken: "logout-token" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId: "family-1" },
      data: { revoked: true },
    });
  });

  it("returns success even without refresh token (client-only logout)", async () => {
    const res = await request(app).post("/api/auth/logout").send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns success even if token not found in DB", async () => {
    db.refreshToken.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken: "unknown-token" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
