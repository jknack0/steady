import { describe, it, expect, vi, beforeEach } from "vitest";

const mdb = vi.hoisted(() => {
  const m = (extra?: Record<string, any>) => ({
    create: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    updateMany: vi.fn(),
    ...extra,
  });
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    $transaction: vi.fn().mockImplementation(async (fn: any) => {
      if (typeof fn === "function") return fn(mdb);
      return Promise.all(fn);
    }),
    program: m(),
    module: m(),
    part: m(),
    enrollment: m(),
    user: m(),
    homeworkInstance: m(),
    moduleProgress: m(),
    partProgress: m(),
    task: m(),
    journalEntry: m(),
    calendarEvent: m(),
    session: m(),
    participantProfile: m(),
    clinicianProfile: m(),
    notificationPreference: m(),
    practice: m(),
    practiceMembership: m(),
    auditLog: m(),
    appointment: m(),
    location: m(),
    serviceCode: m(),
    dailyTracker: m(),
    dailyTrackerField: m(),
    dailyTrackerEntry: m(),
    rtmEngagementEvent: m(),
    rtmEnrollment: m(),
    rtmBillingPeriod: m(),
    rtmClinicianTimeLog: m(),
    clinicianConfig: m(),
    clientConfig: m(),
    clinicianBillingProfile: m(),
    clinicianClient: m(),
    patientInvitation: m(),
    refreshToken: m({ updateMany: vi.fn() }),
    reviewTemplate: m(),
    sessionReview: m(),
    enrollmentOverride: m(),
    streakRecord: m(),
    waitlistEntry: m(),
    invoice: m(),
    invoiceLineItem: m(),
    payment: m(),
    stripeCustomer: m(),
    savedPaymentMethod: m(),
    checkoutSession: m(),
  };
});

vi.mock("@steady/db", () => ({
  prisma: mdb,
  PrismaClient: vi.fn(),
  runWithAuditUser: vi.fn((_u: any, fn: any) => fn()),
  getAuditUserId: vi.fn().mockReturnValue(null),
}));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function mockInvoice(overrides: Record<string, any> = {}) {
  return {
    id: "inv-1",
    practiceId: "practice-1",
    clinicianId: "clin-1",
    participantId: "pp-1",
    totalCents: 14000,
    paidCents: 0,
    status: "PARTIALLY_PAID",
    payments: [{ amountCents: 10000 }],
    lineItems: [{ serviceCodeId: "sc-1", serviceCode: { id: "sc-1" } }],
    ...overrides,
  };
}

describe("checkAndCreateBalanceDue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mocks
    mdb.invoice.findUnique.mockResolvedValue(null);
    mdb.invoice.findFirst.mockResolvedValue(null);
    mdb.invoice.create.mockResolvedValue({ id: "inv-bd-new" });
    mdb.invoice.update.mockResolvedValue({});
    mdb.invoiceLineItem.updateMany.mockResolvedValue({});
  });

  // --- Balance-due creation ---

  it("creates a draft invoice for remaining balance after insurance payment", async () => {
    const { checkAndCreateBalanceDue } = await import(
      "../services/balance-due"
    );

    mdb.invoice.findUnique.mockResolvedValueOnce(
      mockInvoice({ totalCents: 14000, payments: [{ amountCents: 10000 }] }),
    );
    // findFirst #1: no existing draft
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #2: no existing sent
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #3: last invoice for number generation
    mdb.invoice.findFirst.mockResolvedValueOnce(null);

    await checkAndCreateBalanceDue("inv-1");

    expect(mdb.invoice.create).toHaveBeenCalledOnce();
    const createCall = mdb.invoice.create.mock.calls[0][0];
    expect(createCall.data.subtotalCents).toBe(4000);
    expect(createCall.data.totalCents).toBe(4000);
    expect(createCall.data.status).toBe("DRAFT");
    expect(createCall.data.balanceDueSourceInvoiceId).toBe("inv-1");
    expect(createCall.data.lineItems.create.description).toBe(
      "Patient responsibility \u2014 balance after insurance",
    );
    expect(createCall.data.lineItems.create.unitPriceCents).toBe(4000);
    expect(createCall.data.lineItems.create.totalCents).toBe(4000);
  });

  it("does not create a balance-due when fully covered (remaining <= 0)", async () => {
    const { checkAndCreateBalanceDue } = await import(
      "../services/balance-due"
    );

    mdb.invoice.findUnique.mockResolvedValueOnce(
      mockInvoice({ totalCents: 14000, payments: [{ amountCents: 14000 }] }),
    );

    await checkAndCreateBalanceDue("inv-1");

    expect(mdb.invoice.create).not.toHaveBeenCalled();
    expect(mdb.invoice.findFirst).not.toHaveBeenCalled();
  });

  it("does not create a balance-due for VOID invoice", async () => {
    const { checkAndCreateBalanceDue } = await import(
      "../services/balance-due"
    );

    mdb.invoice.findUnique.mockResolvedValueOnce(
      mockInvoice({ status: "VOID" }),
    );

    await checkAndCreateBalanceDue("inv-1");

    expect(mdb.invoice.create).not.toHaveBeenCalled();
    expect(mdb.invoice.findFirst).not.toHaveBeenCalled();
  });

  // --- Existing draft update ---

  it("updates an existing draft balance-due on adjustment", async () => {
    const { checkAndCreateBalanceDue } = await import(
      "../services/balance-due"
    );

    mdb.invoice.findUnique.mockResolvedValueOnce(
      mockInvoice({ totalCents: 14000, payments: [{ amountCents: 11000 }] }),
    );
    // findFirst #1: existing draft found
    mdb.invoice.findFirst.mockResolvedValueOnce({
      id: "inv-bd",
      status: "DRAFT",
    });

    await checkAndCreateBalanceDue("inv-1");

    expect(mdb.invoice.update).toHaveBeenCalledOnce();
    expect(mdb.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-bd" },
      data: { subtotalCents: 3000, totalCents: 3000 },
    });

    expect(mdb.invoiceLineItem.updateMany).toHaveBeenCalledOnce();
    expect(mdb.invoiceLineItem.updateMany).toHaveBeenCalledWith({
      where: { invoiceId: "inv-bd" },
      data: { unitPriceCents: 3000, totalCents: 3000 },
    });

    expect(mdb.invoice.create).not.toHaveBeenCalled();
  });

  it("does not create a duplicate when a non-draft balance-due exists", async () => {
    const { checkAndCreateBalanceDue } = await import(
      "../services/balance-due"
    );

    mdb.invoice.findUnique.mockResolvedValueOnce(
      mockInvoice({ totalCents: 14000, payments: [{ amountCents: 10000 }] }),
    );
    // findFirst #1: no draft
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #2: already-sent balance-due exists
    mdb.invoice.findFirst.mockResolvedValueOnce({
      id: "inv-bd-sent",
      status: "SENT",
    });

    await checkAndCreateBalanceDue("inv-1");

    expect(mdb.invoice.create).not.toHaveBeenCalled();
  });

  // --- Edge cases ---

  it("returns early when invoice not found", async () => {
    const { checkAndCreateBalanceDue } = await import(
      "../services/balance-due"
    );

    mdb.invoice.findUnique.mockResolvedValueOnce(null);

    await checkAndCreateBalanceDue("inv-missing");

    expect(mdb.invoice.findFirst).not.toHaveBeenCalled();
    expect(mdb.invoice.create).not.toHaveBeenCalled();
  });

  it("returns early when no line items have serviceCodeId", async () => {
    const { checkAndCreateBalanceDue } = await import(
      "../services/balance-due"
    );

    mdb.invoice.findUnique.mockResolvedValueOnce(
      mockInvoice({
        totalCents: 14000,
        payments: [{ amountCents: 10000 }],
        lineItems: [{ serviceCodeId: null }],
      }),
    );
    // findFirst #1: no draft
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #2: no sent
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #3: last invoice
    mdb.invoice.findFirst.mockResolvedValueOnce(null);

    await checkAndCreateBalanceDue("inv-1");

    expect(mdb.invoice.create).not.toHaveBeenCalled();
  });

  it("generates sequential invoice number from last practice invoice", async () => {
    const { checkAndCreateBalanceDue } = await import(
      "../services/balance-due"
    );

    mdb.invoice.findUnique.mockResolvedValueOnce(mockInvoice());
    // findFirst #1: no draft
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #2: no sent
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #3: last invoice with number
    mdb.invoice.findFirst.mockResolvedValueOnce({
      invoiceNumber: "INV-1005",
    });

    await checkAndCreateBalanceDue("inv-1");

    expect(mdb.invoice.create).toHaveBeenCalledOnce();
    const createCall = mdb.invoice.create.mock.calls[0][0];
    expect(createCall.data.invoiceNumber).toBe("INV-1006");
  });

  // --- Invoice number generation ---

  it("defaults to INV-1001 when no existing invoices", async () => {
    const { checkAndCreateBalanceDue } = await import(
      "../services/balance-due"
    );

    mdb.invoice.findUnique.mockResolvedValueOnce(mockInvoice());
    // findFirst #1: no draft
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #2: no sent
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #3: no last invoice
    mdb.invoice.findFirst.mockResolvedValueOnce(null);

    await checkAndCreateBalanceDue("inv-1");

    expect(mdb.invoice.create).toHaveBeenCalledOnce();
    const createCall = mdb.invoice.create.mock.calls[0][0];
    expect(createCall.data.invoiceNumber).toBe("INV-1001");
  });

  it("handles non-numeric invoice numbers gracefully", async () => {
    const { checkAndCreateBalanceDue } = await import(
      "../services/balance-due"
    );

    mdb.invoice.findUnique.mockResolvedValueOnce(mockInvoice());
    // findFirst #1: no draft
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #2: no sent
    mdb.invoice.findFirst.mockResolvedValueOnce(null);
    // findFirst #3: last invoice with non-numeric number
    mdb.invoice.findFirst.mockResolvedValueOnce({
      invoiceNumber: "CUSTOM-ABC",
    });

    await checkAndCreateBalanceDue("inv-1");

    expect(mdb.invoice.create).toHaveBeenCalledOnce();
    const createCall = mdb.invoice.create.mock.calls[0][0];
    expect(createCall.data.invoiceNumber).toBe("INV-1001");
  });
});
