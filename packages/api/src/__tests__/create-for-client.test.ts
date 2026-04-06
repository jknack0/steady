import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader } from "./helpers";

const db = prisma as any;

describe("POST /api/programs/for-client", () => {
  it("creates a program with module and enrollment for a valid client", async () => {
    // Mock client ownership check
    db.clinicianClient.findFirst.mockResolvedValue({
      id: "cc-1",
      clinicianId: "test-clinician-profile-id",
      clientId: "client-user-1",
      status: "ACTIVE",
      client: {
        id: "client-user-1",
        participantProfile: { id: "participant-profile-1" },
      },
    } as any);

    const newProgram = {
      id: "new-prog-1",
      clinicianId: "test-clinician-profile-id",
      title: "Custom Plan",
      isTemplate: false,
      status: "PUBLISHED",
      templateSourceId: null,
    };

    const newEnrollment = {
      id: "enrollment-1",
      participantId: "participant-profile-1",
      programId: "new-prog-1",
      status: "ACTIVE",
    };

    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") {
        const tx = {
          program: {
            create: vi.fn().mockResolvedValue(newProgram),
            update: vi.fn().mockResolvedValue({ ...newProgram, templateSourceId: "new-prog-1" }),
          },
          module: {
            create: vi.fn().mockResolvedValue({ id: "mod-1", title: "Module 1", sortOrder: 0 }),
          },
          enrollment: {
            create: vi.fn().mockResolvedValue(newEnrollment),
          },
        };
        return fn(tx);
      }
      return Promise.all(fn);
    });

    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...authHeader())
      .send({ title: "Custom Plan", clientId: "client-user-1" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.program.templateSourceId).toBe("new-prog-1");
    expect(res.body.data.enrollment.status).toBe("ACTIVE");
    expect(res.body.data.enrollment.participantId).toBe("participant-profile-1");
  });

  it("returns 403 when client does not belong to clinician", async () => {
    db.clinicianClient.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...authHeader())
      .send({ title: "Custom Plan", clientId: "not-my-client" });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("not in your client list");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...authHeader())
      .send({ clientId: "client-user-1" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when clientId is missing", async () => {
    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...authHeader())
      .send({ title: "Custom Plan" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/programs/for-client")
      .send({ title: "Custom Plan", clientId: "client-user-1" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...participantAuthHeader())
      .send({ title: "Custom Plan", clientId: "client-user-1" });

    expect(res.status).toBe(403);
  });

  it("returns 400 when client has no participant profile", async () => {
    db.clinicianClient.findFirst.mockResolvedValue({
      id: "cc-1",
      clinicianId: "test-clinician-profile-id",
      clientId: "client-user-1",
      status: "ACTIVE",
      client: {
        id: "client-user-1",
        participantProfile: null,
      },
    } as any);

    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...authHeader())
      .send({ title: "Custom Plan", clientId: "client-user-1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("participant profile");
  });

  it("returns 403 for discharged client", async () => {
    // findFirst with status: { not: "DISCHARGED" } returns null for discharged clients
    db.clinicianClient.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...authHeader())
      .send({ title: "Custom Plan", clientId: "discharged-client" });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("not in your client list");
  });
});
