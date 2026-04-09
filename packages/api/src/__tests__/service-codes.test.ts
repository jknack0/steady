import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, mockServiceCode } from "./helpers";
import { SERVICE_CODE_SEED } from "@steady/shared";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  (db.practiceMembership.findFirst as any).mockResolvedValue({
    practiceId: "practice-1",
    role: "CLINICIAN",
  });
});

describe("GET /api/service-codes", () => {
  it("seeds 15 codes on first access", async () => {
    (db.serviceCode.findFirst as any).mockResolvedValue(null);
    (db.serviceCode.createMany as any).mockResolvedValue({ count: 15 });
    (db.serviceCode.findMany as any).mockResolvedValue(
      SERVICE_CODE_SEED.map((s, i) => mockServiceCode({ id: `sc-${i}`, code: s.code })),
    );
    const res = await request(app).get("/api/service-codes").set(...authHeader());
    expect(res.status).toBe(200);
    expect(db.serviceCode.createMany).toHaveBeenCalled();
    const call = (db.serviceCode.createMany as any).mock.calls[0][0];
    expect(call.data).toHaveLength(15);
    expect(res.body.data).toHaveLength(15);
  });

  it("is idempotent on repeated calls", async () => {
    (db.serviceCode.findFirst as any).mockResolvedValue({ id: "sc-1" });
    (db.serviceCode.findMany as any).mockResolvedValue([mockServiceCode()]);
    const res = await request(app).get("/api/service-codes").set(...authHeader());
    expect(res.status).toBe(200);
    expect(db.serviceCode.createMany).not.toHaveBeenCalled();
  });

  it("only returns active codes, ordered by code asc", async () => {
    (db.serviceCode.findFirst as any).mockResolvedValue({ id: "sc-1" });
    (db.serviceCode.findMany as any).mockResolvedValue([mockServiceCode()]);
    await request(app).get("/api/service-codes").set(...authHeader());
    const call = (db.serviceCode.findMany as any).mock.calls[0][0];
    expect(call.where.isActive).toBe(true);
    expect(call.orderBy).toEqual({ code: "asc" });
  });
});

describe("Service code writes return 405", () => {
  it("POST returns 405", async () => {
    const res = await request(app)
      .post("/api/service-codes")
      .set(...authHeader())
      .send({ code: "12345", description: "x", defaultDurationMinutes: 30 });
    expect(res.status).toBe(405);
  });

  it("PATCH returns 405", async () => {
    const res = await request(app)
      .patch("/api/service-codes/sc-1")
      .set(...authHeader())
      .send({ description: "x" });
    expect(res.status).toBe(405);
  });

  it("DELETE returns 405", async () => {
    const res = await request(app).delete("/api/service-codes/sc-1").set(...authHeader());
    expect(res.status).toBe(405);
  });
});
