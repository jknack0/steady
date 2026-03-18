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

// Error handler
app.use(errorHandler);

export default app;
