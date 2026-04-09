import { describe, it, expect } from "vitest";
import {
  UpsertReviewTemplateSchema,
  SubmitReviewSchema,
  DEFAULT_REVIEW_TEMPLATE,
} from "../schemas/review";

describe("UpsertReviewTemplateSchema", () => {
  it("parses valid template with all field types", () => {
    const result = UpsertReviewTemplateSchema.parse({
      questions: [{ id: "q1", text: "What did you do?", enabled: true }],
      barriers: [{ id: "b1", label: "Forgot", enabled: true }],
    });
    expect(result.questions).toHaveLength(1);
    expect(result.barriers).toHaveLength(1);
  });

  it("applies default enabled=true", () => {
    const result = UpsertReviewTemplateSchema.parse({
      questions: [{ id: "q1", text: "Q?" }],
      barriers: [{ id: "b1", label: "B" }],
    });
    expect(result.questions[0].enabled).toBe(true);
    expect(result.barriers[0].enabled).toBe(true);
  });

  it("rejects template with 0 questions", () => {
    expect(() =>
      UpsertReviewTemplateSchema.parse({
        questions: [],
        barriers: [{ id: "b1", label: "B", enabled: true }],
      }),
    ).toThrow();
  });

  it("rejects template with 11 questions", () => {
    const questions = Array.from({ length: 11 }, (_, i) => ({
      id: `q${i}`,
      text: "Q?",
      enabled: true,
    }));
    expect(() =>
      UpsertReviewTemplateSchema.parse({
        questions,
        barriers: [{ id: "b1", label: "B", enabled: true }],
      }),
    ).toThrow();
  });

  it("rejects template with 0 barriers", () => {
    expect(() =>
      UpsertReviewTemplateSchema.parse({
        questions: [{ id: "q1", text: "Q?", enabled: true }],
        barriers: [],
      }),
    ).toThrow();
  });

  it("rejects template with 21 barriers", () => {
    const barriers = Array.from({ length: 21 }, (_, i) => ({
      id: `b${i}`,
      label: "B",
      enabled: true,
    }));
    expect(() =>
      UpsertReviewTemplateSchema.parse({
        questions: [{ id: "q1", text: "Q?", enabled: true }],
        barriers,
      }),
    ).toThrow();
  });

  it("rejects barrier label >200 chars", () => {
    expect(() =>
      UpsertReviewTemplateSchema.parse({
        questions: [{ id: "q1", text: "Q?", enabled: true }],
        barriers: [{ id: "b1", label: "x".repeat(201), enabled: true }],
      }),
    ).toThrow();
  });

  it("rejects question text >500 chars", () => {
    expect(() =>
      UpsertReviewTemplateSchema.parse({
        questions: [{ id: "q1", text: "x".repeat(501), enabled: true }],
        barriers: [{ id: "b1", label: "B", enabled: true }],
      }),
    ).toThrow();
  });
});

describe("SubmitReviewSchema", () => {
  it("parses valid submission with responses + barriers", () => {
    const result = SubmitReviewSchema.parse({
      responses: [
        { questionId: "q1", question: "What did you do?", answer: "I worked hard." },
      ],
      barriers: ["Forgot to do it"],
    });
    expect(result.responses).toHaveLength(1);
    expect(result.barriers).toHaveLength(1);
  });

  it("rejects empty responses array", () => {
    expect(() =>
      SubmitReviewSchema.parse({ responses: [], barriers: [] }),
    ).toThrow();
  });

  it("rejects answer >2000 chars", () => {
    expect(() =>
      SubmitReviewSchema.parse({
        responses: [
          { questionId: "q1", question: "Q?", answer: "x".repeat(2001) },
        ],
        barriers: [],
      }),
    ).toThrow();
  });

  it("strips unknown fields", () => {
    const result = SubmitReviewSchema.parse({
      responses: [
        { questionId: "q1", question: "Q?", answer: "A", extraField: "ignored" },
      ],
      barriers: [],
      unknownTopLevel: "stripped",
    });
    expect((result as any).unknownTopLevel).toBeUndefined();
    expect((result.responses[0] as any).extraField).toBeUndefined();
  });

  it("rejects more than 10 responses", () => {
    const responses = Array.from({ length: 11 }, (_, i) => ({
      questionId: `q${i}`,
      question: "Q?",
      answer: "A",
    }));
    expect(() =>
      SubmitReviewSchema.parse({ responses, barriers: [] }),
    ).toThrow();
  });
});

describe("DEFAULT_REVIEW_TEMPLATE", () => {
  it("has 4 questions and 9 barriers", () => {
    expect(DEFAULT_REVIEW_TEMPLATE.questions).toHaveLength(4);
    expect(DEFAULT_REVIEW_TEMPLATE.barriers).toHaveLength(9);
  });

  it("parses through UpsertReviewTemplateSchema", () => {
    const result = UpsertReviewTemplateSchema.parse(DEFAULT_REVIEW_TEMPLATE);
    expect(result.questions).toHaveLength(4);
    expect(result.barriers).toHaveLength(9);
  });
});
