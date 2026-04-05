import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, mockLocation } from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  (db.practiceMembership.findFirst as any).mockResolvedValue({
    practiceId: "practice-1",
    role: "CLINICIAN",
  });
  (db.location.findFirst as any).mockResolvedValue(null);
  (db.location.findMany as any).mockResolvedValue([]);
  (db.location.createMany as any).mockResolvedValue({ count: 0 });
});

describe("GET /api/locations", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/locations");
    expect(res.status).toBe(401);
  });

  it("seeds default locations on first access and returns list", async () => {
    (db.location.findFirst as any).mockResolvedValue(null);
    (db.location.findMany as any).mockResolvedValue([mockLocation(), mockLocation({ id: "loc-2", name: "Telehealth", type: "VIRTUAL" })]);
    const res = await request(app).get("/api/locations").set(...authHeader());
    expect(res.status).toBe(200);
    expect(db.location.createMany).toHaveBeenCalled();
    expect(res.body.data).toHaveLength(2);
  });

  it("skips seeding when already seeded", async () => {
    (db.location.findFirst as any).mockResolvedValue({ id: "loc-1" });
    (db.location.findMany as any).mockResolvedValue([mockLocation()]);
    const res = await request(app).get("/api/locations").set(...authHeader());
    expect(res.status).toBe(200);
    expect(db.location.createMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/locations", () => {
  it("creates when user is account owner", async () => {
    (db.practiceMembership.findFirst as any).mockResolvedValue({
      practiceId: "practice-1",
      role: "OWNER",
    });
    (db.location.create as any).mockResolvedValue(mockLocation({ name: "NW" }));
    const res = await request(app)
      .post("/api/locations")
      .set(...authHeader())
      .send({ name: "NW", type: "IN_PERSON" });
    expect(res.status).toBe(201);
  });

  it("returns 403 for non-owner", async () => {
    const res = await request(app)
      .post("/api/locations")
      .set(...authHeader())
      .send({ name: "NW", type: "IN_PERSON" });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/locations/:id", () => {
  it("updates as owner", async () => {
    (db.practiceMembership.findFirst as any).mockResolvedValue({
      practiceId: "practice-1",
      role: "OWNER",
    });
    (db.location.findFirst as any).mockResolvedValue(mockLocation());
    (db.location.update as any).mockResolvedValue(mockLocation({ name: "Renamed" }));
    const res = await request(app)
      .patch("/api/locations/loc-1")
      .set(...authHeader())
      .send({ name: "Renamed" });
    expect(res.status).toBe(200);
  });

  it("returns 403 for non-owner", async () => {
    const res = await request(app)
      .patch("/api/locations/loc-1")
      .set(...authHeader())
      .send({ name: "Renamed" });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/locations/:id", () => {
  it("soft-deletes when no active references", async () => {
    (db.practiceMembership.findFirst as any).mockResolvedValue({
      practiceId: "practice-1",
      role: "OWNER",
    });
    (db.location.findFirst as any).mockResolvedValue(mockLocation());
    (db.appointment.findFirst as any).mockResolvedValue(null);
    (db.location.update as any).mockResolvedValue(mockLocation({ isActive: false }));
    const res = await request(app).delete("/api/locations/loc-1").set(...authHeader());
    expect(res.status).toBe(204);
  });

  it("returns 409 when referenced by active appointment", async () => {
    (db.practiceMembership.findFirst as any).mockResolvedValue({
      practiceId: "practice-1",
      role: "OWNER",
    });
    (db.location.findFirst as any).mockResolvedValue(mockLocation());
    (db.appointment.findFirst as any).mockResolvedValue({ id: "appt-1" });
    const res = await request(app).delete("/api/locations/loc-1").set(...authHeader());
    expect(res.status).toBe(409);
  });

  it("returns 403 for non-owner", async () => {
    const res = await request(app).delete("/api/locations/loc-1").set(...authHeader());
    expect(res.status).toBe(403);
  });
});
