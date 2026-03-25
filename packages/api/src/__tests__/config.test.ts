import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { authHeader } from "./helpers";
import { prisma } from "@steady/db";

const mockPrisma = prisma as any;

describe("Config Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/config/dashboard-layout", () => {
    it("saves dashboard layout only", async () => {
      mockPrisma.clinicianConfig.update.mockResolvedValue({ id: "config-1" });
      mockPrisma.clinicianConfig.findUnique.mockResolvedValue({ id: "config-1", clinicianId: "test-clinician-profile-id" });

      const layout = [
        { widgetId: "stat_active_clients", visible: true, column: "main", order: 0, settings: {} },
      ];

      const res = await request(app)
        .patch("/api/config/dashboard-layout")
        .set(...authHeader())
        .send({ dashboardLayout: layout });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.clinicianConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicianId: "test-clinician-profile-id" },
          data: expect.objectContaining({ dashboardLayout: layout }),
        })
      );
    });

    it("saves clientOverviewLayout only", async () => {
      mockPrisma.clinicianConfig.update.mockResolvedValue({ id: "config-1" });
      mockPrisma.clinicianConfig.findUnique.mockResolvedValue({ id: "config-1" });

      const layout = [
        { widgetId: "client_demographics", visible: true, column: "main", order: 0, settings: {} },
      ];

      const res = await request(app)
        .patch("/api/config/dashboard-layout")
        .set(...authHeader())
        .send({ clientOverviewLayout: layout });

      expect(res.status).toBe(200);
      expect(mockPrisma.clinicianConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clientOverviewLayout: layout }),
        })
      );
    });

    it("rejects empty body", async () => {
      const res = await request(app)
        .patch("/api/config/dashboard-layout")
        .set(...authHeader())
        .send({});

      expect(res.status).toBe(400);
    });

    it("requires auth", async () => {
      const res = await request(app)
        .patch("/api/config/dashboard-layout")
        .send({ dashboardLayout: [] });

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/config/clients/:clientId/overview-layout", () => {
    it("saves client overview layout", async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: "enrollment-1" });
      mockPrisma.clientConfig.upsert.mockResolvedValue({ id: "cc-1" });

      const layout = [
        { widgetId: "client_demographics", visible: true, column: "main", order: 0, settings: {} },
      ];

      const res = await request(app)
        .patch("/api/config/clients/client-user-id/overview-layout")
        .set(...authHeader())
        .send({ clientOverviewLayout: layout });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 404 for unrelated client", async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/config/clients/unknown-user/overview-layout")
        .set(...authHeader())
        .send({ clientOverviewLayout: [] });

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/config (backward compat)", () => {
    it("accepts legacy dashboardLayout shape", async () => {
      mockPrisma.clinicianConfig.upsert.mockResolvedValue({ id: "config-1" });

      const res = await request(app)
        .put("/api/config")
        .set(...authHeader())
        .send({
          providerType: "THERAPIST",
          enabledModules: ["daily_tracker"],
          dashboardLayout: [
            { widgetId: "tracker_summary", visible: true },
          ],
        });

      expect(res.status).toBe(200);
    });

    it("accepts new dashboardLayout shape with all fields", async () => {
      mockPrisma.clinicianConfig.upsert.mockResolvedValue({ id: "config-1" });

      const res = await request(app)
        .put("/api/config")
        .set(...authHeader())
        .send({
          providerType: "THERAPIST",
          enabledModules: ["daily_tracker"],
          dashboardLayout: [
            { widgetId: "tracker_summary", visible: true, column: "main", order: 0, settings: {} },
          ],
          clientOverviewLayout: [
            { widgetId: "client_demographics", visible: true, column: "main", order: 0, settings: {} },
          ],
        });

      expect(res.status).toBe(200);
    });
  });
});
