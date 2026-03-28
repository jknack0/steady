import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { authHeader, participantAuthHeader } from "./helpers";

// ── Mock Anthropic SDK ──────────────────────────────────

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  const MockAnthropic = function (this: any) {
    this.messages = { create: mockCreate };
  };
  return { default: MockAnthropic };
});

// ── Mock S3 (for parse-homework-pdf) ────────────────────

vi.mock("../services/s3", () => ({
  getFileBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-pdf-bytes")),
  generatePresignedUploadUrl: vi.fn(),
  generatePresignedDownloadUrl: vi.fn(),
}));

// Ensure ANTHROPIC_API_KEY is set for tests
process.env.ANTHROPIC_API_KEY = "test-key";

beforeEach(() => {
  mockCreate.mockReset();
});

// ── Helper to build Anthropic response ──────────────────

function anthropicResponse(text: string) {
  return {
    content: [{ type: "text", text }],
  };
}

// ═══════════════════════════════════════════════════════
// Auth & Authorization
// ═══════════════════════════════════════════════════════

describe("AI Routes — Auth", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/ai/style-content")
      .send({ rawContent: "hello" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/ai/style-content")
      .set(...participantAuthHeader())
      .send({ rawContent: "hello" });

    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/style-content
// ═══════════════════════════════════════════════════════

describe("POST /api/ai/style-content", () => {
  it("returns 400 when rawContent is missing", async () => {
    const res = await request(app)
      .post("/api/ai/style-content")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rawContent/);
  });

  it("returns 400 when rawContent is empty string", async () => {
    const res = await request(app)
      .post("/api/ai/style-content")
      .set(...authHeader())
      .send({ rawContent: "   " });

    expect(res.status).toBe(400);
  });

  it("returns styled HTML on success", async () => {
    mockCreate.mockResolvedValueOnce(
      anthropicResponse("<p style=\"color: var(--steady-teal)\">Hello</p>")
    );

    const res = await request(app)
      .post("/api/ai/style-content")
      .set(...authHeader())
      .send({ rawContent: "Hello world" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.styledHtml).toContain("Hello");
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("returns 500 when Anthropic throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API error"));

    const res = await request(app)
      .post("/api/ai/style-content")
      .set(...authHeader())
      .send({ rawContent: "Hello world" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/generate-tracker
// ═══════════════════════════════════════════════════════

describe("POST /api/ai/generate-tracker", () => {
  it("returns 400 when description is missing", async () => {
    const res = await request(app)
      .post("/api/ai/generate-tracker")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/);
  });

  it("returns tracker config on success", async () => {
    const trackerJson = JSON.stringify({
      name: "ADHD Daily Check-in",
      description: "Track daily ADHD symptoms",
      fields: [
        { label: "Focus level", fieldType: "SCALE", options: { min: 1, max: 10, minLabel: "Low", maxLabel: "High" }, sortOrder: 0, isRequired: true },
      ],
    });
    mockCreate.mockResolvedValueOnce(anthropicResponse(trackerJson));

    const res = await request(app)
      .post("/api/ai/generate-tracker")
      .set(...authHeader())
      .send({ description: "ADHD symptom tracker" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("ADHD Daily Check-in");
    expect(res.body.data.fields).toHaveLength(1);
  });

  it("strips markdown code fences from AI response", async () => {
    const trackerJson = JSON.stringify({ name: "Test", description: "Test", fields: [] });
    mockCreate.mockResolvedValueOnce(
      anthropicResponse("```json\n" + trackerJson + "\n```")
    );

    const res = await request(app)
      .post("/api/ai/generate-tracker")
      .set(...authHeader())
      .send({ description: "test" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Test");
  });

  it("returns 500 when AI returns invalid JSON", async () => {
    mockCreate.mockResolvedValueOnce(anthropicResponse("This is not JSON at all"));

    const res = await request(app)
      .post("/api/ai/generate-tracker")
      .set(...authHeader())
      .send({ description: "test" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/generate-part
// ═══════════════════════════════════════════════════════

describe("POST /api/ai/generate-part", () => {
  it("returns 400 when partType is missing", async () => {
    const res = await request(app)
      .post("/api/ai/generate-part")
      .set(...authHeader())
      .send({ rawInput: "Some notes" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/partType/);
  });

  it("returns 400 when rawInput is missing", async () => {
    const res = await request(app)
      .post("/api/ai/generate-part")
      .set(...authHeader())
      .send({ partType: "HOMEWORK" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rawInput/);
  });

  it("returns 400 for unsupported partType", async () => {
    const res = await request(app)
      .post("/api/ai/generate-part")
      .set(...authHeader())
      .send({ partType: "NONEXISTENT", rawInput: "test" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Unsupported/);
  });

  it("returns generated content for STYLED_CONTENT", async () => {
    const contentJson = JSON.stringify({
      _title: "Breathing Exercises",
      type: "STYLED_CONTENT",
      rawContent: "Deep breathing helps",
      styledHtml: "<p>Deep breathing helps</p>",
    });
    mockCreate.mockResolvedValueOnce(anthropicResponse(contentJson));

    const res = await request(app)
      .post("/api/ai/generate-part")
      .set(...authHeader())
      .send({ partType: "STYLED_CONTENT", rawInput: "breathing exercises for anxiety" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Breathing Exercises");
    expect(res.body.data.content.type).toBe("STYLED_CONTENT");
    // _title should be stripped from the content
    expect(res.body.data.content._title).toBeUndefined();
  });

  it("returns generated HOMEWORK with correct field names", async () => {
    const contentJson = JSON.stringify({
      _title: "Weekly Practice",
      type: "HOMEWORK",
      dueTimingType: "BEFORE_NEXT_SESSION",
      dueTimingValue: null,
      completionRule: "ALL",
      completionMinimum: null,
      reminderCadence: "DAILY",
      items: [
        { type: "TIMER", sortOrder: 0, description: "Breathing exercise", durationSeconds: 300 },
        { type: "HABIT_TRACKER", sortOrder: 1, description: "Take medication", habitLabel: "Did you take your medication?" },
        { type: "MOOD_CHECK", sortOrder: 2, description: "How are you feeling?", moods: [{ emoji: "😊", label: "Great" }, { emoji: "😐", label: "Okay" }], includeNote: false },
      ],
    });
    mockCreate.mockResolvedValueOnce(anthropicResponse(contentJson));

    const res = await request(app)
      .post("/api/ai/generate-part")
      .set(...authHeader())
      .send({ partType: "HOMEWORK", rawInput: "daily ADHD management exercises" });

    expect(res.status).toBe(200);
    const { content } = res.body.data;
    expect(content.items).toHaveLength(3);
    // Verify correct field names (the bug we fixed)
    expect(content.items[0].durationSeconds).toBe(300);
    expect(content.items[0].durationMinutes).toBeUndefined();
    expect(content.items[1].habitLabel).toBe("Did you take your medication?");
    expect(content.items[1].habitDescription).toBeUndefined();
  });

  it("strips markdown code fences from AI response", async () => {
    const contentJson = JSON.stringify({
      type: "CHECKLIST",
      items: [{ text: "Item 1", sortOrder: 0 }],
    });
    mockCreate.mockResolvedValueOnce(
      anthropicResponse("```json\n" + contentJson + "\n```")
    );

    const res = await request(app)
      .post("/api/ai/generate-part")
      .set(...authHeader())
      .send({ partType: "CHECKLIST", rawInput: "morning routine" });

    expect(res.status).toBe(200);
    expect(res.body.data.content.type).toBe("CHECKLIST");
  });

  it("returns 500 when AI returns invalid JSON", async () => {
    mockCreate.mockResolvedValueOnce(
      anthropicResponse("I'm sorry, I can't generate that content.")
    );

    const res = await request(app)
      .post("/api/ai/generate-part")
      .set(...authHeader())
      .send({ partType: "HOMEWORK", rawInput: "test" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/parse-homework-pdf
// ═══════════════════════════════════════════════════════

describe("POST /api/ai/parse-homework-pdf", () => {
  it("returns 400 when fileKey is missing", async () => {
    const res = await request(app)
      .post("/api/ai/parse-homework-pdf")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fileKey/);
  });

  it("returns parsed homework items on success", async () => {
    const itemsJson = JSON.stringify([
      { type: "ACTION", sortOrder: 0, description: "Do breathing exercise", subSteps: ["Inhale", "Exhale"] },
      { type: "JOURNAL_PROMPT", sortOrder: 1, prompts: ["How did you feel?"], spaceSizeHint: "medium" },
    ]);
    mockCreate.mockResolvedValueOnce(anthropicResponse(itemsJson));

    const res = await request(app)
      .post("/api/ai/parse-homework-pdf")
      .set(...authHeader())
      .send({ fileKey: "uploads/test.pdf" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0].type).toBe("ACTION");
    expect(res.body.data.items[1].type).toBe("JOURNAL_PROMPT");
  });

  it("re-indexes sortOrder sequentially", async () => {
    const itemsJson = JSON.stringify([
      { type: "ACTION", sortOrder: 5, description: "First" },
      { type: "ACTION", sortOrder: 10, description: "Second" },
    ]);
    mockCreate.mockResolvedValueOnce(anthropicResponse(itemsJson));

    const res = await request(app)
      .post("/api/ai/parse-homework-pdf")
      .set(...authHeader())
      .send({ fileKey: "uploads/test.pdf" });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].sortOrder).toBe(0);
    expect(res.body.data.items[1].sortOrder).toBe(1);
  });

  it("returns 500 when AI returns non-array JSON", async () => {
    mockCreate.mockResolvedValueOnce(
      anthropicResponse('{"type": "not an array"}')
    );

    const res = await request(app)
      .post("/api/ai/parse-homework-pdf")
      .set(...authHeader())
      .send({ fileKey: "uploads/test.pdf" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/parse/i);
  });

  it("returns 500 when AI returns invalid JSON", async () => {
    mockCreate.mockResolvedValueOnce(
      anthropicResponse("This PDF is about cognitive behavioral therapy...")
    );

    const res = await request(app)
      .post("/api/ai/parse-homework-pdf")
      .set(...authHeader())
      .send({ fileKey: "uploads/test.pdf" });

    expect(res.status).toBe(500);
  });
});
