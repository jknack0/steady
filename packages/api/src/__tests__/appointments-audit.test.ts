import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "@steady/db";
import { authHeader, mockAppointment, mockServiceCode, mockLocation } from "./helpers";

const db = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  (db.practiceMembership.findFirst as any).mockResolvedValue({
    practiceId: "practice-1",
    role: "CLINICIAN",
  });
  (db.serviceCode.findFirst as any).mockResolvedValue(mockServiceCode());
  (db.location.findFirst as any).mockResolvedValue(mockLocation());
  (db.participantProfile.findUnique as any).mockResolvedValue({
    id: "pp-1",
    userId: "u-pp-1",
    user: { id: "u-pp-1", firstName: "Jane", lastName: "Doe", email: "jane@test.com" },
  });
  (db.clinicianClient.findFirst as any).mockResolvedValue({ id: "cc-1" });
  (db.appointment.findMany as any).mockResolvedValue([]);
});

describe("Appointments audit logging (COND-4/5/6)", () => {
  it("status transition writes explicit audit row with from/to metadata", async () => {
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
    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    const audit = (db.auditLog.create as any).mock.calls[0][0];
    expect(audit.data.resourceType).toBe("Appointment");
    expect(audit.data.resourceId).toBe("appt-1");
    expect(audit.data.metadata.from).toBe("SCHEDULED");
    expect(audit.data.metadata.to).toBe("ATTENDED");
    expect(audit.data.metadata.changedFields).toEqual(["status"]);
    expect(audit.data.userId).toBe("test-user-id");
  });

  it("status transition audit does not contain internalNote PHI text", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(
      mockAppointment({ internalNote: "Patient trauma details XYZ" }),
    );
    (db.appointment.update as any).mockResolvedValue(
      mockAppointment({ status: "ATTENDED", internalNote: "Patient trauma details XYZ" }),
    );
    (db.auditLog.create as any).mockResolvedValue({});

    await request(app)
      .post("/api/appointments/appt-1/status")
      .set(...authHeader())
      .send({ status: "ATTENDED" });

    const audit = (db.auditLog.create as any).mock.calls[0][0];
    const serialized = JSON.stringify(audit);
    expect(serialized).not.toContain("trauma");
    expect(serialized).not.toContain("XYZ");
  });

  it("update sets statusChangedAt server-side (COND-10)", async () => {
    (db.appointment.findFirst as any).mockResolvedValue(mockAppointment());
    (db.appointment.update as any).mockResolvedValue(
      mockAppointment({ status: "ATTENDED" }),
    );
    (db.auditLog.create as any).mockResolvedValue({});

    await request(app)
      .post("/api/appointments/appt-1/status")
      .set(...authHeader())
      .send({ status: "ATTENDED" });

    const updateCall = (db.appointment.update as any).mock.calls[0][0];
    expect(updateCall.data.statusChangedAt).toBeInstanceOf(Date);
  });
});
