import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "@steady/db";
import { APP_NAME } from "@steady/shared";

const app = express();
const PORT = process.env.API_PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", service: APP_NAME, database: "connected" });
  } catch {
    res.status(503).json({ status: "error", service: APP_NAME, database: "disconnected" });
  }
});

app.listen(PORT, () => {
  console.log(`${APP_NAME} API running on http://localhost:${PORT}`);
});

export default app;
