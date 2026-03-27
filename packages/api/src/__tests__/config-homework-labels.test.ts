import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { authHeader, participantAuthHeader } from "./helpers";

describe("PATCH /api/config/homework-labels", () => {
  // ── Validation Tests ──────────────────────────────────

  it("rejects invalid homework item type keys", async () => {
    const res = await request(app)
      .patch("/api/config/homework-labels")
      .set(...authHeader())
      .send({ homeworkLabels: { INVALID_TYPE: "Label" } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Validation failed");
  });

  it("rejects label exceeding 50 characters", async () => {
    const res = await request(app)
      .patch("/api/config/homework-labels")
      .set(...authHeader())
      .send({ homeworkLabels: { ACTION: "A".repeat(51) } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects empty label after trim", async () => {
    const res = await request(app)
      .patch("/api/config/homework-labels")
      .set(...authHeader())
      .send({ homeworkLabels: { ACTION: "   " } });

    expect(res.status).toBe(400);
  });

  it("rejects missing homeworkLabels field", async () => {
    const res = await request(app)
      .patch("/api/config/homework-labels")
      .set(...authHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it("accepts all 11 valid homework item type keys in validation", async () => {
    const allTypes = {
      ACTION: "Custom Action",
      RESOURCE_REVIEW: "Review",
      JOURNAL_PROMPT: "Journal",
      BRING_TO_SESSION: "Session Item",
      FREE_TEXT_NOTE: "Note",
      CHOICE: "Pick One",
      WORKSHEET: "Sheet",
      RATING_SCALE: "Scale",
      TIMER: "Clock",
      MOOD_CHECK: "Mood",
      HABIT_TRACKER: "Habit",
    };

    const res = await request(app)
      .patch("/api/config/homework-labels")
      .set(...authHeader())
      .send({ homeworkLabels: allTypes });

    // Not 400 means validation passed
    expect(res.status).not.toBe(400);
  });

  // ── Auth Tests ──────────────────────────────────────

  it("requires authentication", async () => {
    const res = await request(app)
      .patch("/api/config/homework-labels")
      .send({ homeworkLabels: { ACTION: "To-Do" } });

    expect(res.status).toBe(401);
  });

  it("rejects participant role", async () => {
    const res = await request(app)
      .patch("/api/config/homework-labels")
      .set(...participantAuthHeader())
      .send({ homeworkLabels: { ACTION: "To-Do" } });

    expect(res.status).toBe(403);
  });
});
