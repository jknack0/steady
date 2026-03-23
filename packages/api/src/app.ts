import express from "express";
import cors from "cors";
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

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

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

// Error handler
app.use(errorHandler);

export default app;
