import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader, mockAppointment, mockServiceCode, mockLocation } from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  // Default membership so requirePracticeCtx passes
  (db.practiceMembership.findFirst as any).mockResolvedValue({
    practiceId: "practice-1",
    role: "CLINICIAN",
  });
  // Default verifications succeed
  (db.serviceCode.findFirst as any).mockResolvedValue(mockServiceCode());
  (db.location.findFirst as any).mockResolvedValue(mockLocation());
  (db.participantProfile.findUnique as any).mockResolvedValue({
    id: "pp-1",
    userId: "u-pp-1",
    user: { id: "u-pp-1", firstName: "Jane", lastName: "Doe", email: "jane@test.com" },
  });
  (db.clinicianClient.findFirst as any).mockResolvedValue({ id: "cc-1" });
  (db.appointment.findFirst as any).mockResolvedValue(null);
  (db.appointment.findMany as any).mockResolvedValue([]);
  (db.session.findFirst as any).mockResolvedValue(null);
});

const validBody = {
  participantId: "pp-1",
  serviceCodeId: "sc-1",
  locationId: "loc-1",
  startAt: "2026-05-01T14:00:00Z",
  endAt: "2026-05-01T15:00:00Z",
};

describe("POST /api/appointments", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/appointments").send(validBody);
    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .set(...participantAuthHeader())
      .send(validBody);
    expect(res.status).toBe(403);
  });

  it("creates an appointment and returns conflicts array", async () => {
    (db.appointment.create as any).mockResolvedValue(mockAppointment());
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.data.appointment.id).toBe("appt-1");
    expect(res.body.data.conflicts).toEqual([]);
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when endAt <= startAt", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send({ ...validBody, endAt: validBody.startAt });
    expect(res.status).toBe(400);
  });

  it("returns 400 for GROUP type", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send({ ...validBody, appointmentType: "GROUP" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for cross-tenant serviceCode", async () => {
    (db.serviceCode.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it("returns 404 for cross-tenant location", async () => {
    (db.location.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it("returns 404 for cross-tenant participant", async () => {
    (db.clinicianClient.findFirst as any).mockResolvedValue(null);
    (db.appointment.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it("defaults to INDIVIDUAL type when omitted", async () => {
    (db.appointment.create as any).mockResolvedValue(mockAppointment());
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(201);
    const call = (db.appointment.create as any).mock.calls[0][0];
    expect(call.data.appointmentType).toBe("INDIVIDUAL");
  });

  it("rejects inactive service code", async () => {
    (db.serviceCode.findFirst as any).mockResolvedValue(mockServiceCode({ isActive: false }));
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not active/i);
  });

  it("strips extra unknown fields (COND-13)", async () => {
    (db.appointment.create as any).mockResolvedValue(mockAppointment());
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send({ ...validBody, practiceId: "leaked", bogus: 123 });
    expect(res.status).toBe(201);
    const call = (db.appointment.create as any).mock.calls[0][0];
    expect(call.data.practiceId).toBe("practice-1");
  });
});

describe("GET /api/appointments", () => {
  it("returns 400 without range", async () => {
    const res = await request(app).get("/api/appointments").set(...authHeader());
    expect(res.status).toBe(400);
  });

  it("returns 400 for range > 62 days", async () => {
    const res = await request(app)
      .get("/api/appointments?startAt=2026-01-01T00:00:00Z&endAt=2026-04-01T00:00:00Z")
      .set(...authHeader());
    expect(res.status).toBe(400);
  });

  it("returns appointments in range", async () => {
    (db.appointment.findMany as any).mockResolvedValue([mockAppointment()]);
    const res = await request(app)
      .get("/api/appointments?startAt=2026-05-01T00:00:00Z&endAt=2026-05-08T00:00:00Z")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.cursor).toBeNull();
  });

  it("paginates with cursor", async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      mockAppointment({ id: `a-${i}` }),
    );
    (db.appointment.findMany as any).mockResolvedValue(rows);
    const res = await request(app)
      .get("/api/appointments?startAt=2026-05-01T00:00:00Z&endAt=2026-05-08T00:00:00Z&limit=2")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.cursor).toBe("a-1");
  });

  it("filters by locationId", async () => {
    (db.appointment.findMany as any).mockResolvedValue([]);
    const res = await request(app)
      .get("/api/appointments?startAt=2026-05-01T00:00:00Z&endAt=2026-05-08T00:00:00Z&locationId=loc-1")
      .set(...authHeader());
    expect(res.status).toBe(200);
    const call = (db.appointment.findMany as any).mock.calls[0][0];
    expect(call.where.locationId).toBe("loc-1");
  });

  it("filters by status multi-value", async () => {
    (db.appointment.findMany as any).mockResolvedValue([]);
    const res = await request(app)
      .get(
        "/api/appointments?startAt=2026-05-01T00:00:00Z&endAt=2026-05-08T00:00:00Z&status=SCHEDULED,ATTENDED",
      )
      .set(...authHeader());
    expect(res.status).toBe(200);
    const call = (db.appointment.findMany as any).mock.calls[0][0];
    expect(call.where.status.in).toEqual(["SCHEDULED", "ATTENDED"]);
  });

  it("returns 404 when non-owner requests other clinicianId", async () => {
    const res = await request(app)
      .get(
        "/api/appointments?startAt=2026-05-01T00:00:00Z&endAt=2026-05-08T00:00:00Z&clinicianId=other-clin",
      )
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("allows account owner to query other clinicianId", async () => {
    (db.practiceMembership.findFirst as any).mockResolvedValue({
      practiceId: "practice-1",
      role: "OWNER",
    });
    (db.appointment.findMany as any).mockResolvedValue([]);
    const res = await request(app)
      .get(
        "/api/appointments?startAt=2026-05-01T00:00:00Z&endAt=2026-05-08T00:00:00Z&clinicianId=other-clin",
      )
      .set(...authHeader());
    expect(res.status).toBe(200);
  });
});

describe("GET /api/appointments/:id", () => {
  it("returns the appointment", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    const res = await request(app)
      .get("/api/appointments/appt-1")
      .set(...authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("appt-1");
  });

  it("returns 404 cross-tenant / unknown", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(null);
    const res = await request(app)
      .get("/api/appointments/nope")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });

  it("allows account owner to access any practice appointment", async () => {
    (db.practiceMembership.findFirst as any).mockResolvedValue({
      practiceId: "practice-1",
      role: "OWNER",
    });
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ clinicianId: "other-clin" }),
    );
    const res = await request(app)
      .get("/api/appointments/appt-1")
      .set(...authHeader());
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/appointments/:id", () => {
  it("updates mutable fields", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    (db.appointment.update as any).mockResolvedValue(mockAppointment({ internalNote: "ok" }));
    const res = await request(app)
      .patch("/api/appointments/appt-1")
      .set(...authHeader())
      .send({ internalNote: "ok" });
    expect(res.status).toBe(200);
    expect(res.body.data.appointment.internalNote).toBe("ok");
  });

  it("strips immutable fields (COND-10)", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    (db.appointment.update as any).mockResolvedValue(mockAppointment());
    const res = await request(app)
      .patch("/api/appointments/appt-1")
      .set(...authHeader())
      .send({
        participantId: "other",
        createdById: "other",
        statusChangedAt: "2027-01-01T00:00:00Z",
        internalNote: "fine",
      });
    expect(res.status).toBe(200);
    const call = (db.appointment.update as any).mock.calls[0][0];
    expect(call.data.participantId).toBeUndefined();
    expect(call.data.createdById).toBeUndefined();
    expect(call.data.statusChangedAt).toBeUndefined();
  });

  it("returns 400 on endAt <= startAt", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    const res = await request(app)
      .patch("/api/appointments/appt-1")
      .set(...authHeader())
      .send({ startAt: "2026-05-01T15:00:00Z", endAt: "2026-05-01T14:00:00Z" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-owner editing another clinician's appt", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ clinicianId: "other-clin" }),
    );
    const res = await request(app)
      .patch("/api/appointments/appt-1")
      .set(...authHeader())
      .send({ internalNote: "ok" });
    expect(res.status).toBe(404);
  });

  it("allows internalNote edit on terminal status", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ status: "ATTENDED" }),
    );
    (db.appointment.update as any).mockResolvedValue(
      mockAppointment({ status: "ATTENDED", internalNote: "post-note" }),
    );
    const res = await request(app)
      .patch("/api/appointments/appt-1")
      .set(...authHeader())
      .send({ internalNote: "post-note" });
    expect(res.status).toBe(200);
  });

  it("rejects scheduling-field change on terminal status (409)", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ status: "ATTENDED" }),
    );
    const res = await request(app)
      .patch("/api/appointments/appt-1")
      .set(...authHeader())
      .send({ startAt: "2026-06-01T14:00:00Z", endAt: "2026-06-01T15:00:00Z" });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/appointments/:id/status", () => {
  it("transitions to ATTENDED and writes audit row", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    (db.appointment.update as any).mockResolvedValue(
      mockAppointment({ status: "ATTENDED" }),
    );
    (db.auditLog.create as any).mockResolvedValue({});
    const res = await request(app)
      .post("/api/appointments/appt-1/status")
      .set(...authHeader())
      .send({ status: "ATTENDED" });
    expect(res.status).toBe(200);
    expect((db.auditLog.create as any)).toHaveBeenCalled();
    const audit = (db.auditLog.create as any).mock.calls[0][0];
    expect(audit.data.metadata.from).toBe("SCHEDULED");
    expect(audit.data.metadata.to).toBe("ATTENDED");
  });

  it("returns 400 for invalid status", async () => {
    const res = await request(app)
      .post("/api/appointments/appt-1/status")
      .set(...authHeader())
      .send({ status: "BOGUS" });
    expect(res.status).toBe(400);
  });

  it("persists cancelReason", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    (db.appointment.update as any).mockResolvedValue(
      mockAppointment({ status: "CLIENT_CANCELED", cancelReason: "sick" }),
    );
    (db.auditLog.create as any).mockResolvedValue({});
    const res = await request(app)
      .post("/api/appointments/appt-1/status")
      .set(...authHeader())
      .send({ status: "CLIENT_CANCELED", cancelReason: "sick" });
    expect(res.status).toBe(200);
    const call = (db.appointment.update as any).mock.calls[0][0];
    expect(call.data.cancelReason).toBe("sick");
  });
});

describe("DELETE /api/appointments/:id", () => {
  it("deletes in 24h window with SCHEDULED status", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ createdAt: new Date() }),
    );
    (db.appointment.delete as any).mockResolvedValue({});
    const res = await request(app)
      .delete("/api/appointments/appt-1")
      .set(...authHeader());
    expect(res.status).toBe(204);
  });

  it("returns 409 for non-SCHEDULED status", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ status: "ATTENDED" }),
    );
    const res = await request(app)
      .delete("/api/appointments/appt-1")
      .set(...authHeader());
    expect(res.status).toBe(409);
  });

  it("returns 409 for >24h old", async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ createdAt: oldDate }),
    );
    const res = await request(app)
      .delete("/api/appointments/appt-1")
      .set(...authHeader());
    expect(res.status).toBe(409);
  });

  it("returns 409 for linked session", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ createdAt: new Date() }),
    );
    (db.session.findFirst as any).mockResolvedValue({ id: "sess-1" });
    const res = await request(app)
      .delete("/api/appointments/appt-1")
      .set(...authHeader());
    expect(res.status).toBe(409);
  });

  it("returns 404 for non-owner", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({
        clinicianId: "other-clin",
        createdById: "other-user",
        createdAt: new Date(),
      }),
    );
    const res = await request(app)
      .delete("/api/appointments/appt-1")
      .set(...authHeader());
    expect(res.status).toBe(404);
  });
});

describe("GET /api/appointments/mine (participant)", () => {
  beforeEach(() => {
    (db.appointment.findMany as any).mockResolvedValue([]);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/appointments/mine");
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const res = await request(app)
      .get("/api/appointments/mine")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });

  it("happy path: participant gets own appointments filtered by participantId", async () => {
    (db.appointment.findMany as any).mockResolvedValue([
      mockAppointment({
        internalNote: "PHI — migraine history",
        cancelReason: "sick",
        statusChangedAt: new Date(),
      }),
    ]);
    const res = await request(app)
      .get("/api/appointments/mine")
      .set(...participantAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);

    const call = (db.appointment.findMany as any).mock.calls[0][0];
    expect(call.where.participantId).toBe("test-participant-profile-id");
    // ordered asc
    expect(call.orderBy).toEqual([{ startAt: "asc" }, { id: "asc" }]);
  });

  it("COND-7: response strips internalNote, cancelReason, createdById, statusChangedAt, updatedAt", async () => {
    (db.appointment.findMany as any).mockResolvedValue([
      mockAppointment({
        internalNote: "clinician private PHI",
        cancelReason: "embarrassing reason",
        statusChangedAt: new Date(),
      }),
    ]);
    const res = await request(app)
      .get("/api/appointments/mine")
      .set(...participantAuthHeader());
    expect(res.status).toBe(200);
    const item = res.body.data[0];
    expect(item).not.toHaveProperty("internalNote");
    expect(item).not.toHaveProperty("cancelReason");
    expect(item).not.toHaveProperty("createdById");
    expect(item).not.toHaveProperty("statusChangedAt");
    expect(item).not.toHaveProperty("updatedAt");
    // raw body must not contain the PHI strings
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("clinician private PHI");
    expect(serialized).not.toContain("embarrassing reason");
  });

  it("includes clinician name and service code/location fields", async () => {
    (db.appointment.findMany as any).mockResolvedValue([mockAppointment()]);
    const res = await request(app)
      .get("/api/appointments/mine")
      .set(...participantAuthHeader());
    expect(res.status).toBe(200);
    const item = res.body.data[0];
    expect(item.clinician.firstName).toBe("Dr.");
    expect(item.clinician.lastName).toBe("Smith");
    expect(item.serviceCode.code).toBe("90834");
    expect(item.serviceCode.description).toBeTruthy();
    expect(item.location.name).toBe("Main Office");
    expect(item.location.type).toBe("IN_PERSON");
  });

  it("cross-participant: query always filters by authenticated participantProfileId", async () => {
    (db.appointment.findMany as any).mockResolvedValue([]);
    await request(app)
      .get("/api/appointments/mine")
      .set(...participantAuthHeader({ participantProfileId: "pp-B" }));
    const call = (db.appointment.findMany as any).mock.calls[0][0];
    expect(call.where.participantId).toBe("pp-B");
  });

  it("default status filter is SCHEDULED,ATTENDED", async () => {
    await request(app)
      .get("/api/appointments/mine")
      .set(...participantAuthHeader());
    const call = (db.appointment.findMany as any).mock.calls[0][0];
    expect(call.where.status.in).toEqual(["SCHEDULED", "ATTENDED"]);
  });

  it("status filter respects query param", async () => {
    await request(app)
      .get("/api/appointments/mine?status=CLIENT_CANCELED,NO_SHOW")
      .set(...participantAuthHeader());
    const call = (db.appointment.findMany as any).mock.calls[0][0];
    expect(call.where.status.in).toEqual(["CLIENT_CANCELED", "NO_SHOW"]);
  });

  it("enforces 62-day range cap via Zod", async () => {
    const res = await request(app)
      .get(
        "/api/appointments/mine?from=2026-01-01T00:00:00Z&to=2026-04-01T00:00:00Z",
      )
      .set(...participantAuthHeader());
    expect(res.status).toBe(400);
  });

  it("returns 400 when to <= from", async () => {
    const res = await request(app)
      .get(
        "/api/appointments/mine?from=2026-05-10T00:00:00Z&to=2026-05-01T00:00:00Z",
      )
      .set(...participantAuthHeader());
    expect(res.status).toBe(400);
  });

  it("empty list returns [] not 404", async () => {
    (db.appointment.findMany as any).mockResolvedValue([]);
    const res = await request(app)
      .get("/api/appointments/mine")
      .set(...participantAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.cursor).toBeNull();
  });

  it("paginates with cursor", async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      mockAppointment({ id: `a-${i}` }),
    );
    (db.appointment.findMany as any).mockResolvedValue(rows);
    const res = await request(app)
      .get("/api/appointments/mine?limit=2")
      .set(...participantAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.cursor).toBe("a-1");
  });
});

describe("toParticipantView serializer", () => {
  it("omits all PHI/internal fields (COND-7)", async () => {
    const { toParticipantView } = await import("../services/appointments");
    const view = toParticipantView(
      mockAppointment({
        internalNote: "PHI note",
        cancelReason: "PHI reason",
        statusChangedAt: new Date(),
      }),
    );
    expect(view).not.toHaveProperty("internalNote");
    expect(view).not.toHaveProperty("cancelReason");
    expect(view).not.toHaveProperty("createdById");
    expect(view).not.toHaveProperty("statusChangedAt");
    expect(view).not.toHaveProperty("updatedAt");
    expect(view).not.toHaveProperty("practiceId");
  });

  it("includes clinician.firstName and clinician.lastName", async () => {
    const { toParticipantView } = await import("../services/appointments");
    const view = toParticipantView(mockAppointment());
    expect(view.clinician.firstName).toBe("Dr.");
    expect(view.clinician.lastName).toBe("Smith");
  });

  it("includes serviceCode.code and serviceCode.description", async () => {
    const { toParticipantView } = await import("../services/appointments");
    const view = toParticipantView(mockAppointment());
    expect(view.serviceCode.code).toBe("90834");
    expect(view.serviceCode.description).toBeTruthy();
  });

  it("includes location.name and location.type", async () => {
    const { toParticipantView } = await import("../services/appointments");
    const view = toParticipantView(mockAppointment());
    expect(view.location.name).toBe("Main Office");
    expect(view.location.type).toBe("IN_PERSON");
  });
});

describe("Conflict detection", () => {
  it("returns conflict IDs for overlapping appointments", async () => {
    const conflicting = mockAppointment({ id: "conflict-1" });
    (db.appointment.findMany as any).mockResolvedValueOnce([{ id: "conflict-1" }]);
    (db.appointment.create as any).mockResolvedValue(mockAppointment());
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.data.conflicts).toEqual(["conflict-1"]);
  });

  it("filters conflicts by practiceId (cross-tenant empty)", async () => {
    (db.appointment.findMany as any).mockResolvedValueOnce([]);
    (db.appointment.create as any).mockResolvedValue(mockAppointment());
    const res = await request(app)
      .post("/api/appointments")
      .set(...authHeader())
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.data.conflicts).toEqual([]);
    const call = (db.appointment.findMany as any).mock.calls[0][0];
    expect(call.where.practiceId).toBe("practice-1");
  });
});
