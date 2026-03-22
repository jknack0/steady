import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { authHeader, participantAuthHeader } from "./helpers";

// Mock the S3 presign functions
vi.mock("../services/s3", () => ({
  generateUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: "https://steady-uploads-test.s3.amazonaws.com/uploads/test-clinician-profile-id/programs/abc123.png?X-Amz-Signature=...",
    key: "uploads/test-clinician-profile-id/programs/abc123.png",
    publicUrl: "https://steady-uploads-test.s3.amazonaws.com/uploads/test-clinician-profile-id/programs/abc123.png",
  }),
  generateDownloadUrl: vi.fn().mockResolvedValue(
    "https://steady-uploads-test.s3.amazonaws.com/uploads/test-clinician-profile-id/programs/abc123.png?X-Amz-Signature=..."
  ),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

vi.mock("../services/notifications", () => ({
  scheduleSessionReminders: vi.fn().mockResolvedValue(undefined),
  cancelSessionReminders: vi.fn().mockResolvedValue(undefined),
  cancelHomeworkReminders: vi.fn().mockResolvedValue(undefined),
  scheduleTaskReminder: vi.fn().mockResolvedValue(undefined),
  recordDismissal: vi.fn().mockResolvedValue(undefined),
  registerNotificationWorkers: vi.fn().mockResolvedValue(undefined),
  queueNotification: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── POST /api/uploads/presign ──────────────────────────

describe("POST /api/uploads/presign", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/uploads/presign");
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing fileName", async () => {
    const res = await request(app)
      .post("/api/uploads/presign")
      .set(...authHeader())
      .send({ fileType: "image/png", context: "program-cover" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing fileType", async () => {
    const res = await request(app)
      .post("/api/uploads/presign")
      .set(...authHeader())
      .send({ fileName: "cover.png", context: "program-cover" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing context", async () => {
    const res = await request(app)
      .post("/api/uploads/presign")
      .set(...authHeader())
      .send({ fileName: "cover.png", fileType: "image/png" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid context", async () => {
    const res = await request(app)
      .post("/api/uploads/presign")
      .set(...authHeader())
      .send({ fileName: "cover.png", fileType: "image/png", context: "invalid" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for disallowed file type", async () => {
    const res = await request(app)
      .post("/api/uploads/presign")
      .set(...authHeader())
      .send({ fileName: "hack.exe", fileType: "application/x-msdownload", context: "program-cover" });
    expect(res.status).toBe(400);
  });

  it("returns presigned upload URL for clinician", async () => {
    const res = await request(app)
      .post("/api/uploads/presign")
      .set(...authHeader())
      .send({ fileName: "cover.png", fileType: "image/png", context: "program-cover" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uploadUrl).toContain("s3.amazonaws.com");
    expect(res.body.data.key).toContain("test-clinician-profile-id");
    expect(res.body.data.publicUrl).toBeDefined();
  });

  it("works for participant role", async () => {
    const res = await request(app)
      .post("/api/uploads/presign")
      .set(...participantAuthHeader())
      .send({ fileName: "photo.jpg", fileType: "image/jpeg", context: "attachment" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("accepts PDF for handout context", async () => {
    const res = await request(app)
      .post("/api/uploads/presign")
      .set(...authHeader())
      .send({ fileName: "handout.pdf", fileType: "application/pdf", context: "handout" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── GET /api/uploads/presign-download ──────────────────

describe("GET /api/uploads/presign-download", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/uploads/presign-download");
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing key", async () => {
    const res = await request(app)
      .get("/api/uploads/presign-download")
      .set(...authHeader());
    expect(res.status).toBe(400);
  });

  it("returns presigned download URL", async () => {
    const res = await request(app)
      .get("/api/uploads/presign-download?key=uploads/test-clinician-profile-id/programs/abc123.png")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.downloadUrl).toContain("s3.amazonaws.com");
  });

  it("works for participant role", async () => {
    const res = await request(app)
      .get("/api/uploads/presign-download?key=uploads/some/file.pdf")
      .set(...participantAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
