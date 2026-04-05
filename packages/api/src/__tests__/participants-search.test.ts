import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { __resetRateLimit } from "../middleware/rate-limit";
import { authHeader, participantAuthHeader } from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimit();
  (db.practiceMembership.findFirst as any).mockResolvedValue({
    practiceId: "practice-1",
    role: "CLINICIAN",
  });
  (db.participantProfile.findMany as any).mockResolvedValue([]);
  (db.auditLog.create as any).mockResolvedValue({});
});

function makeProfile(id: string, firstName: string, lastName: string, email: string) {
  return {
    id,
    userId: `u-${id}`,
    timezone: "America/New_York",
    onboardingCompleted: true,
    user: { id: `u-${id}`, firstName, lastName, email },
  };
}

describe("GET /api/participants/search", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/participants/search?q=jo");
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .get("/api/participants/search?q=jo")
      .set(...participantAuthHeader());
    expect(res.status).toBe(403);
  });

  it("returns 400 when q is less than 2 characters", async () => {
    const res = await request(app)
      .get("/api/participants/search?q=j")
      .set(...authHeader());
    expect(res.status).toBe(400);
  });

  it("returns 400 when q is missing", async () => {
    const res = await request(app)
      .get("/api/participants/search")
      .set(...authHeader());
    expect(res.status).toBe(400);
  });

  it("returns matching participants for a valid query", async () => {
    (db.participantProfile.findMany as any).mockResolvedValue([
      makeProfile("pp-1", "Maria", "Garcia", "maria@test.com"),
      makeProfile("pp-2", "Mark", "Thompson", "mark@test.com"),
    ]);

    const res = await request(app)
      .get("/api/participants/search?q=mar")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual({
      id: "pp-1",
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria@test.com",
    });
  });

  it("filters by practice membership (cross-tenant isolation)", async () => {
    // Verify that the where clause includes the practiceId filter
    (db.participantProfile.findMany as any).mockResolvedValue([]);

    await request(app)
      .get("/api/participants/search?q=mar")
      .set(...authHeader());

    expect(db.participantProfile.findMany).toHaveBeenCalled();
    const callArgs = (db.participantProfile.findMany as any).mock.calls[0][0];
    const whereStr = JSON.stringify(callArgs.where);
    expect(whereStr).toContain("practice-1");
  });

  it("writes an audit row with hashed query (never plaintext)", async () => {
    (db.participantProfile.findMany as any).mockResolvedValue([]);

    await request(app)
      .get("/api/participants/search?q=sensitive-name")
      .set(...authHeader());

    expect(db.auditLog.create).toHaveBeenCalled();
    const auditArgs = (db.auditLog.create as any).mock.calls[0][0];
    const metadata = auditArgs.data.metadata;
    expect(metadata.kind).toBe("search");
    expect(typeof metadata.queryHash).toBe("string");
    expect(metadata.queryHash).not.toBe("sensitive-name");
    expect(metadata.queryHash).toHaveLength(64); // sha256 hex
    // Ensure plaintext query is not anywhere in the audit data
    expect(JSON.stringify(auditArgs.data)).not.toContain("sensitive-name");
  });

  it("enforces rate limit (31st request in 60s returns 429)", async () => {
    (db.participantProfile.findMany as any).mockResolvedValue([]);

    let lastStatus = 200;
    for (let i = 0; i < 31; i++) {
      const res = await request(app)
        .get("/api/participants/search?q=jo")
        .set(...authHeader());
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});

describe("POST /api/participants", () => {
  beforeEach(() => {
    (db.user.findUnique as any).mockResolvedValue(null);
    (db.user.create as any).mockResolvedValue({
      id: "u-new",
      email: "new@test.com",
      firstName: "New",
      lastName: "Client",
      participantProfile: { id: "pp-new" },
    });
    (db.clinicianClient.create as any).mockResolvedValue({ id: "cc-new" });
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/participants")
      .send({ firstName: "New", lastName: "Client", email: "new@test.com" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/participants")
      .set(...participantAuthHeader())
      .send({ firstName: "New", lastName: "Client", email: "new@test.com" });
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app)
      .post("/api/participants")
      .set(...authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await request(app)
      .post("/api/participants")
      .set(...authHeader())
      .send({ firstName: "New", lastName: "Client", email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("creates a participant profile without any enrollment", async () => {
    const res = await request(app)
      .post("/api/participants")
      .set(...authHeader())
      .send({ firstName: "New", lastName: "Client", email: "new@test.com" });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: "pp-new",
      firstName: "New",
      lastName: "Client",
      email: "new@test.com",
    });

    // Verify user.create was called without any enrollment creation
    expect(db.user.create).toHaveBeenCalled();
    const createArgs = (db.user.create as any).mock.calls[0][0];
    expect(createArgs.data.role).toBe("PARTICIPANT");
    expect(createArgs.data.participantProfile).toBeDefined();
    expect(JSON.stringify(createArgs.data)).not.toContain("enrollment");

    // Verify clinician-client link was created
    expect(db.clinicianClient.create).toHaveBeenCalled();
  });

  it("returns 409 when email already exists", async () => {
    (db.user.findUnique as any).mockResolvedValue({
      id: "u-existing",
      email: "new@test.com",
    });
    const res = await request(app)
      .post("/api/participants")
      .set(...authHeader())
      .send({ firstName: "New", lastName: "Client", email: "new@test.com" });
    expect(res.status).toBe(409);
  });
});
