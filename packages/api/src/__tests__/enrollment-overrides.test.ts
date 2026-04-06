import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import {
  authHeader,
  participantAuthHeader,
  mockProgram,
  mockEnrollment,
  mockModule,
  mockPart,
  mockOverride,
} from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  (db.practiceMembership.findFirst as any).mockResolvedValue({
    practiceId: "practice-1",
    role: "CLINICIAN",
  });
});

const validAddResource = {
  overrideType: "ADD_RESOURCE",
  moduleId: "module-1",
  payload: {
    title: "Extra Resource",
    url: "https://example.com/resource",
    description: "Helpful reading",
  },
};

const validHide = {
  overrideType: "HIDE_HOMEWORK_ITEM",
  targetPartId: "part-1",
  payload: {},
};

const validNote = {
  overrideType: "CLINICIAN_NOTE",
  moduleId: "module-1",
  payload: { content: "Focus on breathing exercises." },
};

const validAddHomework = {
  overrideType: "ADD_HOMEWORK_ITEM",
  moduleId: "module-1",
  payload: { title: "Extra practice", itemType: "ACTION" },
};

// ── Create Override ──────────────────────────────

describe("POST /api/enrollments/:id/overrides", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/enrollments/enrollment-1/overrides")
      .send(validAddResource);
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/enrollments/enrollment-1/overrides")
      .set(...participantAuthHeader())
      .send(validAddResource);
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-owner clinician", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({
        program: { ...mockProgram(), clinicianId: "other-clinician" },
      }),
    );
    const res = await request(app)
      .post("/api/enrollments/enrollment-1/overrides")
      .set(...authHeader())
      .send(validAddResource);
    expect(res.status).toBe(404);
  });

  it("creates add-resource override with title + url", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { ...mockProgram(), clinicianId: "test-clinician-profile-id" } }),
    );
    (db.module.findFirst as any).mockResolvedValue(mockModule());
    (db.enrollmentOverride.create as any).mockResolvedValue(mockOverride());

    const res = await request(app)
      .post("/api/enrollments/enrollment-1/overrides")
      .set(...authHeader())
      .send(validAddResource);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe("override-1");
  });

  it("creates hide override with valid targetPartId", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { ...mockProgram(), clinicianId: "test-clinician-profile-id" } }),
    );
    (db.part.findFirst as any).mockResolvedValue(mockPart());
    (db.enrollmentOverride.create as any).mockResolvedValue(
      mockOverride({ overrideType: "HIDE_HOMEWORK_ITEM", targetPartId: "part-1" }),
    );

    const res = await request(app)
      .post("/api/enrollments/enrollment-1/overrides")
      .set(...authHeader())
      .send(validHide);
    expect(res.status).toBe(201);
  });

  it("returns 400 for HIDE with non-existent targetPartId", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { ...mockProgram(), clinicianId: "test-clinician-profile-id" } }),
    );
    (db.part.findFirst as any).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/enrollments/enrollment-1/overrides")
      .set(...authHeader())
      .send(validHide);
    expect(res.status).toBe(400);
  });

  it("returns 400 for ADD_RESOURCE without moduleId", async () => {
    const res = await request(app)
      .post("/api/enrollments/enrollment-1/overrides")
      .set(...authHeader())
      .send({
        overrideType: "ADD_RESOURCE",
        payload: { title: "Resource", url: "https://example.com" },
      });
    expect(res.status).toBe(400);
  });

  it("returns 400 for HIDE without targetPartId", async () => {
    const res = await request(app)
      .post("/api/enrollments/enrollment-1/overrides")
      .set(...authHeader())
      .send({ overrideType: "HIDE_HOMEWORK_ITEM", payload: {} });
    expect(res.status).toBe(400);
  });

  it("creates clinician-note override with content", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { ...mockProgram(), clinicianId: "test-clinician-profile-id" } }),
    );
    (db.module.findFirst as any).mockResolvedValue(mockModule());
    (db.enrollmentOverride.create as any).mockResolvedValue(
      mockOverride({ overrideType: "CLINICIAN_NOTE", payload: { content: "Note" } }),
    );

    const res = await request(app)
      .post("/api/enrollments/enrollment-1/overrides")
      .set(...authHeader())
      .send(validNote);
    expect(res.status).toBe(201);
  });

  it("creates add-homework override with title + itemType", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { ...mockProgram(), clinicianId: "test-clinician-profile-id" } }),
    );
    (db.module.findFirst as any).mockResolvedValue(mockModule());
    (db.enrollmentOverride.create as any).mockResolvedValue(
      mockOverride({ overrideType: "ADD_HOMEWORK_ITEM" }),
    );

    const res = await request(app)
      .post("/api/enrollments/enrollment-1/overrides")
      .set(...authHeader())
      .send(validAddHomework);
    expect(res.status).toBe(201);
  });
});

// ── List Overrides ──────────────────────────────

describe("GET /api/enrollments/:id/overrides", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/enrollments/enrollment-1/overrides");
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-owner clinician", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({
        program: { ...mockProgram(), clinicianId: "other-clinician" },
      }),
    );
    const res = await request(app)
      .get("/api/enrollments/enrollment-1/overrides")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("lists overrides ordered by createdAt desc", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { ...mockProgram(), clinicianId: "test-clinician-profile-id" } }),
    );
    (db.enrollmentOverride.findMany as any).mockResolvedValue([
      mockOverride({ id: "o-2" }),
      mockOverride({ id: "o-1" }),
    ]);

    const res = await request(app)
      .get("/api/enrollments/enrollment-1/overrides")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

// ── Delete Override ──────────────────────────────

describe("DELETE /api/enrollments/:id/overrides/:overrideId", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).delete(
      "/api/enrollments/enrollment-1/overrides/override-1",
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-owner clinician", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({
        program: { ...mockProgram(), clinicianId: "other-clinician" },
      }),
    );
    const res = await request(app)
      .delete("/api/enrollments/enrollment-1/overrides/override-1")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-existent override", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { ...mockProgram(), clinicianId: "test-clinician-profile-id" } }),
    );
    (db.enrollmentOverride.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .delete("/api/enrollments/enrollment-1/overrides/override-1")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("hard-deletes override", async () => {
    (db.enrollment.findFirst as any).mockResolvedValue(
      mockEnrollment({ program: { ...mockProgram(), clinicianId: "test-clinician-profile-id" } }),
    );
    (db.enrollmentOverride.findFirst as any).mockResolvedValue(mockOverride());
    (db.enrollmentOverride.delete as any).mockResolvedValue(mockOverride());

    const res = await request(app)
      .delete("/api/enrollments/enrollment-1/overrides/override-1")
      .set(...authHeader());
    expect(res.status).toBe(204);
    expect(db.enrollmentOverride.delete).toHaveBeenCalledWith({
      where: { id: "override-1" },
    });
  });
});
