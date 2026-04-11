import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@steady/db";
import { queueSummarization } from "../services/session-summary";

// Mock the queue so we don't need a running pg-boss.
const mockSend = vi.fn();
vi.mock("../services/queue", () => ({
  getQueue: vi.fn().mockResolvedValue({
    send: (...args: unknown[]) => mockSend(...args),
  }),
}));

const db = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockSend.mockReset();
  mockSend.mockResolvedValue("job-id");
});

const SESSION_ID = "session-test-1";

describe("queueSummarization — idempotency guard", () => {
  it("enqueues when summaryStatus is 'none' (fresh session)", async () => {
    db.telehealthSession.updateMany.mockResolvedValue({ count: 1 });

    await queueSummarization(SESSION_ID);

    // Claim was atomic: only none/failed → pending
    expect(db.telehealthSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: SESSION_ID,
          summaryStatus: { in: ["none", "failed"] },
        }),
        data: { summaryStatus: "pending" },
      }),
    );
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend).toHaveBeenCalledWith(
      "summarize-transcript",
      { sessionId: SESSION_ID },
      expect.any(Object),
    );
  });

  it("re-enqueues when summaryStatus is 'failed' (retry path)", async () => {
    db.telehealthSession.updateMany.mockResolvedValue({ count: 1 });

    await queueSummarization(SESSION_ID);

    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("skips enqueue when summaryStatus is already 'pending'", async () => {
    // Atomic claim returns 0 because the WHERE doesn't match — status is pending.
    db.telehealthSession.updateMany.mockResolvedValue({ count: 0 });

    await queueSummarization(SESSION_ID);

    expect(db.telehealthSession.updateMany).toHaveBeenCalledOnce();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("skips enqueue when summaryStatus is 'generating'", async () => {
    db.telehealthSession.updateMany.mockResolvedValue({ count: 0 });

    await queueSummarization(SESSION_ID);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("skips enqueue when summaryStatus is 'completed'", async () => {
    db.telehealthSession.updateMany.mockResolvedValue({ count: 0 });

    await queueSummarization(SESSION_ID);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("only one of two concurrent calls wins the claim", async () => {
    // First call wins (count: 1), second call loses (count: 0).
    db.telehealthSession.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await Promise.all([
      queueSummarization(SESSION_ID),
      queueSummarization(SESSION_ID),
    ]);

    // Both callers run the atomic update, but only one proceeds to enqueue.
    expect(db.telehealthSession.updateMany).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("rolls status back to 'failed' when boss.send throws", async () => {
    db.telehealthSession.updateMany.mockResolvedValue({ count: 1 });
    db.telehealthSession.update.mockResolvedValue({});
    mockSend.mockRejectedValueOnce(new Error("pg-boss down"));

    await expect(queueSummarization(SESSION_ID)).rejects.toThrow("pg-boss down");

    // Rollback call happened after the send failure.
    expect(db.telehealthSession.update).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
      data: { summaryStatus: "failed" },
    });
  });
});
