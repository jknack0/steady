import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, participantAuthHeader, mockAppointment } from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /api/participant/invoices ──────────────────────────

describe("GET /api/participant/invoices", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/participant/invoices");
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    (db.practiceMembership.findFirst as any).mockResolvedValue({
      practiceId: "practice-1",
      role: "CLINICIAN",
    });
    const res = await request(app)
      .get("/api/participant/invoices")
      .set(...authHeader());
    expect(res.status).toBe(403);
  });

  it("returns participant invoices with PHI stripped", async () => {
    const invoices = [
      {
        id: "inv-1",
        invoiceNumber: "INV-001",
        status: "SENT",
        issuedAt: new Date("2026-04-01"),
        dueAt: new Date("2026-05-01"),
        totalCents: 14000,
        paidCents: 0,
        notes: "CLINICIAN INTERNAL NOTE - should not appear",
        clinician: {
          user: { firstName: "Dr.", lastName: "Smith" },
        },
      },
      {
        id: "inv-2",
        invoiceNumber: "INV-002",
        status: "PAID",
        issuedAt: new Date("2026-03-01"),
        dueAt: new Date("2026-04-01"),
        totalCents: 10000,
        paidCents: 10000,
        notes: "Another internal note",
        clinician: {
          user: { firstName: "Dr.", lastName: "Jones" },
        },
      },
    ];

    (db.invoice.findMany as any).mockResolvedValue(invoices);

    const res = await request(app)
      .get("/api/participant/invoices")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].invoiceNumber).toBe("INV-001");
    expect(res.body.data[0].clinician.firstName).toBe("Dr.");
    // PHI check: notes must NOT be present
    expect(res.body.data[0].notes).toBeUndefined();
    expect(res.body.data[1].notes).toBeUndefined();
  });

  it("never returns DRAFT or VOID invoices", async () => {
    (db.invoice.findMany as any).mockResolvedValue([]);

    const res = await request(app)
      .get("/api/participant/invoices")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    // Verify the query filters by visible statuses
    const call = (db.invoice.findMany as any).mock.calls[0][0];
    expect(call.where.status.in).toEqual(["SENT", "PAID", "PARTIALLY_PAID", "OVERDUE"]);
    expect(call.where.status.in).not.toContain("DRAFT");
    expect(call.where.status.in).not.toContain("VOID");
  });

  it("paginates with cursor", async () => {
    (db.invoice.findMany as any).mockResolvedValue([]);

    const res = await request(app)
      .get("/api/participant/invoices?cursor=inv-5&limit=10")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    const call = (db.invoice.findMany as any).mock.calls[0][0];
    expect(call.skip).toBe(1);
    expect(call.cursor).toEqual({ id: "inv-5" });
    expect(call.take).toBe(11); // limit + 1
  });
});

// ── GET /api/participant/invoices/:id ──────────────────────

describe("GET /api/participant/invoices/:id", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/participant/invoices/inv-1");
    expect(res.status).toBe(401);
  });

  it("returns invoice detail with line items and no notes", async () => {
    const invoice = {
      id: "inv-1",
      invoiceNumber: "INV-001",
      status: "SENT",
      issuedAt: new Date("2026-04-01"),
      dueAt: new Date("2026-05-01"),
      subtotalCents: 14000,
      taxCents: 0,
      totalCents: 14000,
      paidCents: 0,
      notes: "Secret clinician note",
      lineItems: [
        {
          id: "li-1",
          description: "Psychotherapy, 45 min",
          unitPriceCents: 14000,
          quantity: 1,
          totalCents: 14000,
        },
      ],
      payments: [],
      clinician: {
        user: { firstName: "Dr.", lastName: "Smith" },
      },
    };

    (db.invoice.findFirst as any).mockResolvedValue(invoice);

    const res = await request(app)
      .get("/api/participant/invoices/inv-1")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.invoiceNumber).toBe("INV-001");
    expect(res.body.data.lineItems).toHaveLength(1);
    expect(res.body.data.lineItems[0].description).toBe("Psychotherapy, 45 min");
    // PHI check
    expect(res.body.data.notes).toBeUndefined();
  });

  it("returns 404 for non-existent invoice", async () => {
    (db.invoice.findFirst as any).mockResolvedValue(null);

    const res = await request(app)
      .get("/api/participant/invoices/inv-999")
      .set(...participantAuthHeader());

    expect(res.status).toBe(404);
  });

  it("filters by participant ownership and visible statuses", async () => {
    (db.invoice.findFirst as any).mockResolvedValue(null);

    await request(app)
      .get("/api/participant/invoices/inv-1")
      .set(...participantAuthHeader());

    const call = (db.invoice.findFirst as any).mock.calls[0][0];
    expect(call.where.participantId).toBe("test-participant-profile-id");
    expect(call.where.status.in).toEqual(["SENT", "PAID", "PARTIALLY_PAID", "OVERDUE"]);
  });
});

// ── POST /api/participant/appointments/:id/cancel ──────────

describe("POST /api/participant/appointments/:id/cancel", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/participant/appointments/appt-1/cancel")
      .send({});
    expect(res.status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    (db.practiceMembership.findFirst as any).mockResolvedValue({
      practiceId: "practice-1",
      role: "CLINICIAN",
    });
    const res = await request(app)
      .post("/api/participant/appointments/appt-1/cancel")
      .set(...authHeader())
      .send({});
    expect(res.status).toBe(403);
  });

  it("cancels a scheduled appointment", async () => {
    const appt = mockAppointment({
      participantId: "test-participant-profile-id",
      status: "SCHEDULED",
    });
    (db.appointment.findFirst as any).mockResolvedValue(appt);
    (db.appointment.update as any).mockResolvedValue({
      ...appt,
      status: "CLIENT_CANCELED",
      clinician: { user: { firstName: "Dr.", lastName: "Smith" } },
      serviceCode: { code: "90834", description: "Psychotherapy, 45 min" },
      location: { name: "Main Office", type: "IN_PERSON" },
    });
    (db.appointmentReminder.updateMany as any).mockResolvedValue({ count: 2 });
    (db.auditLog.create as any).mockResolvedValue({});

    const res = await request(app)
      .post("/api/participant/appointments/appt-1/cancel")
      .set(...participantAuthHeader())
      .send({ cancelReason: "Schedule conflict" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("CLIENT_CANCELED");
    // Verify reminders were canceled
    expect(db.appointmentReminder.updateMany).toHaveBeenCalledWith({
      where: { appointmentId: "appt-1", status: "PENDING" },
      data: { status: "CANCELED" },
    });
    // Verify audit log
    expect(db.auditLog.create).toHaveBeenCalled();
  });

  it("returns 404 when appointment not found", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/participant/appointments/appt-999/cancel")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(404);
  });

  it("returns 409 when appointment not SCHEDULED", async () => {
    const appt = mockAppointment({
      participantId: "test-participant-profile-id",
      status: "ATTENDED",
    });
    (db.appointment.findFirst as any).mockResolvedValue(appt);

    const res = await request(app)
      .post("/api/participant/appointments/appt-1/cancel")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(409);
  });

  it("returns 404 for another participant's appointment", async () => {
    // Appointment belongs to different participant
    (db.appointment.findFirst as any).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/participant/appointments/appt-1/cancel")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(404);
  });

  it("accepts empty body (cancelReason is optional)", async () => {
    const appt = mockAppointment({
      participantId: "test-participant-profile-id",
      status: "SCHEDULED",
    });
    (db.appointment.findFirst as any).mockResolvedValue(appt);
    (db.appointment.update as any).mockResolvedValue({
      ...appt,
      status: "CLIENT_CANCELED",
      clinician: { user: { firstName: "Dr.", lastName: "Smith" } },
      serviceCode: { code: "90834", description: "Psychotherapy, 45 min" },
      location: { name: "Main Office", type: "IN_PERSON" },
    });
    (db.appointmentReminder.updateMany as any).mockResolvedValue({ count: 0 });
    (db.auditLog.create as any).mockResolvedValue({});

    const res = await request(app)
      .post("/api/participant/appointments/appt-1/cancel")
      .set(...participantAuthHeader())
      .send({});

    expect(res.status).toBe(200);
  });
});

// ── GET /api/participant/invoices/count ──────────────────────

describe("GET /api/participant/invoices/count", () => {
  it("returns outstanding invoice count", async () => {
    (db.invoice.count as any).mockResolvedValue(3);

    const res = await request(app)
      .get("/api/participant/invoices/count")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(3);
    // Verify it only counts SENT and OVERDUE
    const call = (db.invoice.count as any).mock.calls[0][0];
    expect(call.where.status.in).toEqual(["SENT", "OVERDUE"]);
  });
});
