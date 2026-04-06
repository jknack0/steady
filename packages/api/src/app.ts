import express, { type CookieOptions } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@steady/db";
import { APP_NAME } from "@steady/shared";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import programRoutes from "./routes/programs";
import moduleRoutes from "./routes/modules";
import partRoutes from "./routes/parts";
import enrollmentRoutes from "./routes/enrollments";
import participantRoutes from "./routes/participant";
import taskRoutes from "./routes/tasks";
import calendarRoutes from "./routes/calendar";
import journalRoutes from "./routes/journal";
import notificationRoutes from "./routes/notifications";
import aiRoutes from "./routes/ai";
import statsRoutes from "./routes/stats";
import clinicianRoutes from "./routes/clinician";
import sessionRoutes from "./routes/sessions";
import adminRoutes from "./routes/admin";
import practiceRoutes from "./routes/practice";
import uploadRoutes from "./routes/uploads";
import dailyTrackerRoutes from "./routes/daily-trackers";
import rtmRoutes from "./routes/rtm";
import { rtmParticipantRouter } from "./routes/rtm";
import configRoutes from "./routes/config";
import { configParticipantRouter } from "./routes/config";
import appointmentsRoutes from "./routes/appointments";
import locationsRoutes from "./routes/locations";
import serviceCodesRoutes from "./routes/service-codes";
import participantsRoutes from "./routes/participants";
import invitationRoutes from "./routes/invitations";
import reviewTemplateRoutes from "./routes/review-templates";
import sessionReviewRoutes from "./routes/session-reviews";
import { participantReviewRouter } from "./routes/session-reviews";
import sessionPrepRoutes from "./routes/session-prep";
import enrollmentOverrideRoutes from "./routes/enrollment-overrides";

const app = express();

// Trust proxy headers (X-Forwarded-For) — required when running behind Railway/load balancer
// so express-rate-limit can correctly identify client IPs
app.set("trust proxy", 1);

const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.CORS_ORIGINS) {
  throw new Error("CORS_ORIGINS must be set in production (comma-separated list of allowed origins)");
}
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : true; // permissive in dev/test only
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

// Security headers — HIPAA compliance
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0"); // Modern browsers use CSP instead
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Health check — always returns 200 so Railway deploys succeed.
// Database status is informational only.
app.get("/health", async (_req, res) => {
  let dbStatus = "unknown";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }
  res.json({ status: "ok", service: APP_NAME, database: dbStatus });
});

// Waitlist signup (public, rate-limited)
import rateLimit from "express-rate-limit";
const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." },
});
app.post("/api/waitlist", waitlistLimiter, async (req, res) => {
  try {
    const email = req.body?.email?.trim()?.toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, error: "Valid email is required" });
      return;
    }
    await prisma.waitlistEntry.upsert({
      where: { email },
      create: { email },
      update: {},
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to join waitlist" });
  }
});

// Demo provisioning — create account, clone admin's data, log in
const DEMO_SOURCE_EMAIL = "admin@admin.com";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const demoCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." },
});

app.post("/api/demo/provision", demoLimiter, async (req, res) => {
  try {
    const firstName = req.body?.firstName?.trim();
    const lastName = req.body?.lastName?.trim();
    const email = req.body?.email?.trim()?.toLowerCase();

    if (!firstName || !lastName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, error: "First name, last name, and valid email are required" });
      return;
    }

    // Save to waitlist
    await prisma.waitlistEntry.upsert({ where: { email }, create: { email }, update: {} });

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: { clinicianProfile: true, participantProfile: true },
    });

    if (user && user.role !== "CLINICIAN") {
      res.status(400).json({ success: false, error: "Unable to create account with this email" });
      return;
    }

    let isNewAccount = false;

    if (!user) {
      isNewAccount = true;
      const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);

      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash,
          role: "CLINICIAN",
          clinicianProfile: { create: {} },
        },
        include: { clinicianProfile: true, participantProfile: true },
      });

      // Create default clinician config
      await prisma.clinicianConfig.create({
        data: {
          clinicianId: user.clinicianProfile!.id,
          enabledModules: ["homework", "journal", "assessments", "strategy_cards", "program_modules"],
          dashboardLayout: [],
          setupCompleted: true,
        },
      });

      // Find admin source account
      const adminUser = await prisma.user.findUnique({
        where: { email: DEMO_SOURCE_EMAIL },
        include: { clinicianProfile: true },
      });

      if (adminUser?.clinicianProfile) {
        const adminClinicianId = adminUser.clinicianProfile.id;
        const newClinicianId = user.clinicianProfile!.id;

        // Clone admin's programs (with modules, parts, trackers)
        const programs = await prisma.program.findMany({
          where: { clinicianId: adminClinicianId, status: { not: "ARCHIVED" } },
          include: {
            modules: {
              where: { deletedAt: null },
              orderBy: { sortOrder: "asc" },
              include: { parts: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } },
            },
            dailyTrackers: {
              include: { fields: { orderBy: { sortOrder: "asc" } } },
            },
          },
        });

        for (const source of programs) {
          await prisma.$transaction(async (tx) => {
            const newProgram = await tx.program.create({
              data: {
                clinicianId: newClinicianId,
                title: source.title,
                description: source.description,
                category: source.category,
                durationWeeks: source.durationWeeks,
                coverImageUrl: source.coverImageUrl,
                cadence: source.cadence,
                enrollmentMethod: source.enrollmentMethod,
                sessionType: source.sessionType,
                followUpCount: source.followUpCount,
                isTemplate: source.isTemplate,
                status: source.status,
              },
            });

            for (const mod of source.modules) {
              const newModule = await tx.module.create({
                data: {
                  programId: newProgram.id,
                  title: mod.title,
                  subtitle: mod.subtitle,
                  summary: mod.summary,
                  estimatedMinutes: mod.estimatedMinutes,
                  sortOrder: mod.sortOrder,
                  unlockRule: mod.unlockRule,
                  unlockDelayDays: mod.unlockDelayDays,
                },
              });

              if (mod.parts.length > 0) {
                await tx.part.createMany({
                  data: mod.parts.map((p, i) => ({
                    moduleId: newModule.id,
                    type: p.type,
                    title: p.title,
                    sortOrder: i,
                    isRequired: p.isRequired,
                    content: p.content as any,
                  })),
                });
              }
            }

            for (const tracker of source.dailyTrackers) {
              const newTracker = await tx.dailyTracker.create({
                data: {
                  programId: newProgram.id,
                  createdById: newClinicianId,
                  name: tracker.name,
                  description: tracker.description,
                  reminderTime: tracker.reminderTime,
                  isActive: tracker.isActive,
                },
              });

              if (tracker.fields.length > 0) {
                await tx.dailyTrackerField.createMany({
                  data: tracker.fields.map((f) => ({
                    trackerId: newTracker.id,
                    label: f.label,
                    fieldType: f.fieldType,
                    sortOrder: f.sortOrder,
                    isRequired: f.isRequired,
                    options: f.options as any,
                  })),
                });
              }
            }
          });
        }

        // Clone admin's clients (create ClinicianClient relationships)
        const adminClients = await prisma.clinicianClient.findMany({
          where: { clinicianId: adminClinicianId },
        });

        for (const client of adminClients) {
          const exists = await prisma.clinicianClient.findUnique({
            where: { clinicianId_clientId: { clinicianId: newClinicianId, clientId: client.clientId } },
          });
          if (!exists) {
            await prisma.clinicianClient.create({
              data: {
                clinicianId: newClinicianId,
                clientId: client.clientId,
                status: "ACTIVE",
                acceptedAt: new Date(),
              },
            });
          }
        }
      }
    }

    // Issue tokens
    const authPayload = {
      userId: user.id,
      role: "CLINICIAN" as const,
      clinicianProfileId: user.clinicianProfile!.id,
    };
    const accessToken = jwt.sign(authPayload, JWT_SECRET, { expiresIn: "30m" });
    const refreshToken = crypto.randomBytes(48).toString("base64url");
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        familyId: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    // Set cookies
    res.cookie("access_token", accessToken, { ...demoCookieOptions, maxAge: 30 * 60 * 1000 });
    res.cookie("refresh_token", refreshToken, { ...demoCookieOptions, maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000, path: "/api/auth" });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          hasCompletedSetup: true,
        },
        isNewAccount,
      },
    });
  } catch (err) {
    const logger = await import("./lib/logger").then((m) => m.logger);
    logger.error("Demo provision error", err);
    res.status(500).json({ success: false, error: "Failed to provision demo. Please try again." });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/programs/:programId/modules", moduleRoutes);
app.use("/api/programs/:programId/modules/:moduleId/parts", partRoutes);
app.use("/api/programs/:programId/enrollments", enrollmentRoutes);
app.use("/api/participant", participantRoutes);
app.use("/api/participant/tasks", taskRoutes);
app.use("/api/participant/calendar", calendarRoutes);
app.use("/api/participant/journal", journalRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/clinician", clinicianRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/practices", practiceRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/daily-trackers", dailyTrackerRoutes);
app.use("/api/rtm", rtmRoutes);
app.use("/api/participant/rtm", rtmParticipantRouter);
app.use("/api/config", configRoutes);
app.use("/api/participant/config", configParticipantRouter);
app.use("/api/appointments", sessionReviewRoutes);
app.use("/api/appointments", sessionPrepRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/locations", locationsRoutes);
app.use("/api/service-codes", serviceCodesRoutes);
app.use("/api/participants", participantsRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/programs", reviewTemplateRoutes);
app.use("/api/participant/appointments", participantReviewRouter);
app.use("/api/enrollments", enrollmentOverrideRoutes);

// Error handler
app.use(errorHandler);

export default app;
