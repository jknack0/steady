import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Hoist ALL mock variables so they're accessible inside vi.mock() factories
const { mdb, mockConstructEvent, mockStripeClient, mockBossSend } = vi.hoisted(() => {
  const m = (extra?: Record<string, any>) => ({
    create: vi.fn(), findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue(null),
    findUniqueOrThrow: vi.fn(), update: vi.fn(), delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0), upsert: vi.fn(), deleteMany: vi.fn(),
    createMany: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(), updateMany: vi.fn(),
    ...extra,
  });
  const mdb = {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    $transaction: vi.fn().mockImplementation(async (fn: any) => {
      if (typeof fn === "function") return fn(mdb);
      return Promise.all(fn);
    }),
    program: m(), module: m(), part: m(), enrollment: m(), user: m(),
    homeworkInstance: m(), moduleProgress: m(), partProgress: m(),
    task: m(), journalEntry: m(), calendarEvent: m(), session: m(),
    participantProfile: m(), clinicianProfile: m(),
    notificationPreference: m(), practice: m(),
    practiceMembership: m(), auditLog: m(), appointment: m(),
    location: m(), serviceCode: m(), dailyTracker: m(),
    dailyTrackerField: m(), dailyTrackerEntry: m(),
    rtmEngagementEvent: m(), rtmEnrollment: m(),
    rtmBillingPeriod: m(), rtmClinicianTimeLog: m(),
    clinicianConfig: m(), clientConfig: m(),
    clinicianBillingProfile: m(), clinicianClient: m(),
    patientInvitation: m(), refreshToken: m({ updateMany: vi.fn() }),
    reviewTemplate: m(), sessionReview: m(),
    enrollmentOverride: m(), streakRecord: m(),
    waitlistEntry: m(),
    invoice: m(), invoiceLineItem: m(), payment: m(),
    stripeCustomer: m(), savedPaymentMethod: m(), checkoutSession: m(),
  };

  const mockConstructEvent = vi.fn();
  const mockStripeClient = { webhooks: { constructEvent: mockConstructEvent } };
  const mockBossSend = vi.fn().mockResolvedValue("job-id");

  return { mdb, mockConstructEvent, mockStripeClient, mockBossSend };
});

vi.mock("@steady/db", () => ({
  prisma: mdb,
  PrismaClient: vi.fn(),
  runWithAuditUser: vi.fn((_u: any, fn: any) => fn()),
  getAuditUserId: vi.fn().mockReturnValue(null),
}));

// Route now uses getStripeClient() from stripe-client — mock it
vi.mock("../services/stripe-client", () => ({
  getStripeClient: vi.fn(() => mockStripeClient),
  getConnectedAccountId: vi.fn(),
}));

// Mock pg-boss queue
vi.mock("../services/queue", () => ({
  getQueue: vi.fn().mockResolvedValue({ send: mockBossSend }),
}));

const { default: app } = await import("../app");

function makeEvent(overrides: Record<string, any> = {}) {
  return {
    id: "evt_test_123",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_456",
        metadata: { invoiceId: "inv-1", practiceId: "practice-1" },
        ...overrides.dataObject,
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  process.env.STRIPE_SECRET_KEY = "sk_test_key";
});

// ── Signature Verification (COND-4) ────────────────────

describe("POST /api/stripe/webhooks — signature verification", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const res = await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .send(Buffer.from(payload));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing stripe-signature header");
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not a raw Buffer", async () => {
    const res = await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "text/plain")
      .set("stripe-signature", "t=123,v1=abc")
      .send("not a buffer");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Expected raw body");
  });

  it("returns 400 for invalid signature", async () => {
    const error = new Error("Invalid signature");
    (error as any).type = "StripeSignatureVerificationError";
    mockConstructEvent.mockImplementation(() => { throw error; });

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const res = await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=invalid")
      .send(Buffer.from(payload));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid signature");
  });

  it("returns 200 for valid signature", async () => {
    mockConstructEvent.mockReturnValue(makeEvent());

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const res = await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=valid")
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});

// ── Event Processing ────────────────────────────────────

describe("POST /api/stripe/webhooks — event processing", () => {
  it("queues checkout.session.completed event via pg-boss", async () => {
    mockConstructEvent.mockReturnValue(makeEvent());

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const res = await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=abc")
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);
    expect(mockBossSend).toHaveBeenCalledWith("stripe-webhook-process", expect.objectContaining({
      eventId: "evt_test_123",
      eventType: "checkout.session.completed",
    }));
  });

  it("queues checkout.session.expired event via pg-boss", async () => {
    mockConstructEvent.mockReturnValue(makeEvent({ type: "checkout.session.expired" }));

    const payload = JSON.stringify({ type: "checkout.session.expired" });
    const res = await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=abc")
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);
    expect(mockBossSend).toHaveBeenCalledWith("stripe-webhook-process", expect.objectContaining({
      eventType: "checkout.session.expired",
    }));
  });

  it("returns 400 when checkout.session.completed has no invoiceId in metadata", async () => {
    mockConstructEvent.mockReturnValue(makeEvent({
      type: "checkout.session.completed",
      dataObject: { metadata: { practiceId: "practice-1" } },
    }));

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const res = await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=abc")
      .send(Buffer.from(payload));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing invoiceId in metadata");
    expect(mockBossSend).not.toHaveBeenCalled();
  });

  it("returns 200 and queues unknown event type", async () => {
    const event = {
      id: "evt_unknown_1",
      type: "payment_intent.created",
      data: { object: { id: "pi_test_1", metadata: {} } },
    };
    mockConstructEvent.mockReturnValue(event);

    const payload = JSON.stringify({ type: "payment_intent.created" });
    const res = await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=abc")
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);
    expect(mockBossSend).toHaveBeenCalledWith("stripe-webhook-process", expect.objectContaining({
      eventType: "payment_intent.created",
    }));
  });

  it("verifies pg-boss send is called with correct event data", async () => {
    mockConstructEvent.mockReturnValue(makeEvent());

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=abc")
      .send(Buffer.from(payload));

    expect(mockBossSend).toHaveBeenCalledWith("stripe-webhook-process", {
      eventId: "evt_test_123",
      eventType: "checkout.session.completed",
      eventData: { id: "cs_test_456", metadata: { invoiceId: "inv-1", practiceId: "practice-1" } },
      practiceId: "practice-1",
    });
  });
});

// ── Idempotency ─────────────────────────────────────────

describe("POST /api/stripe/webhooks — idempotency", () => {
  it("processes same event ID twice without error", async () => {
    mockConstructEvent.mockReturnValue(makeEvent());

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const sendReq = () => request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=abc")
      .send(Buffer.from(payload));

    const res1 = await sendReq();
    const res2 = await sendReq();

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(mockBossSend).toHaveBeenCalledTimes(2);
  });

  it("verifies event data contains all required fields", async () => {
    mockConstructEvent.mockReturnValue(makeEvent());

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=abc")
      .send(Buffer.from(payload));

    const sendArg = mockBossSend.mock.calls[0][1];
    expect(sendArg).toHaveProperty("eventId");
    expect(sendArg).toHaveProperty("eventType");
    expect(sendArg).toHaveProperty("eventData");
    expect(sendArg).toHaveProperty("practiceId");
  });
});

// ── Error Handling ──────────────────────────────────────

describe("POST /api/stripe/webhooks — error handling", () => {
  it("returns 400 on generic webhook processing error", async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error("Something went wrong"); });

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const res = await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=abc")
      .send(Buffer.from(payload));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Webhook processing failed");
  });

  it("returns 500 when STRIPE_WEBHOOK_SECRET not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const res = await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=abc")
      .send(Buffer.from(payload));

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Webhook not configured");
  });
});

// ── Raw Body Verification ───────────────────────────────

describe("POST /api/stripe/webhooks — raw body verification", () => {
  it("sends raw Buffer body and verifies constructEvent receives Buffer", async () => {
    mockConstructEvent.mockReturnValue(makeEvent());

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=abc")
      .send(Buffer.from(payload));

    const rawBodyArg = mockConstructEvent.mock.calls[0][0];
    expect(Buffer.isBuffer(rawBodyArg)).toBe(true);
  });

  it("verifies constructEvent is called with correct args", async () => {
    mockConstructEvent.mockReturnValue(makeEvent());

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    await request(app)
      .post("/api/stripe/webhooks")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=sig_value")
      .send(Buffer.from(payload));

    expect(mockConstructEvent).toHaveBeenCalledWith(
      expect.any(Buffer),
      "t=123,v1=sig_value",
      "whsec_test_secret",
    );
  });
});
