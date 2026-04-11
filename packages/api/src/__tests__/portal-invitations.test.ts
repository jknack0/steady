import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@steady/db";
import { createPortalInvitation } from "../services/portal-invitations";
import { ConflictError } from "../services/clinician";

// Mock the queue so we don't need a running pg-boss.
vi.mock("../services/queue", () => ({
  getQueue: vi.fn().mockResolvedValue({
    send: vi.fn().mockResolvedValue("job-id"),
  }),
}));

// Mock email suppression so it doesn't consult a real table.
vi.mock("../services/email", async () => {
  const actual = await vi.importActual<typeof import("../services/email")>(
    "../services/email"
  );
  return {
    ...actual,
    isEmailSuppressed: vi.fn().mockResolvedValue(false),
  };
});

const db = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no existing invitation conflict, mock transaction returns a
  // plausible invitation row. Individual tests override user.findUnique
  // and portalInvitation.create as needed.
  db.portalInvitation.findFirst.mockResolvedValue(null);
  db.portalInvitation.create.mockResolvedValue({
    id: "inv-default",
    expiresAt: new Date(Date.now() + 7 * 86400_000),
  });
  db.user.create.mockResolvedValue({ id: "stub-user-id" });
  db.clinicianClient.upsert.mockResolvedValue({ id: "cc-link" });
});

const CLINICIAN_PROFILE_ID = "test-clinician-profile-id";

describe("createPortalInvitation — role guard", () => {
  it("throws ConflictError when the email belongs to an existing CLINICIAN user", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "clinician-user-id",
      role: "CLINICIAN",
    });

    await expect(
      createPortalInvitation(CLINICIAN_PROFILE_ID, {
        recipientEmail: "doc@example.com",
        firstName: "Doc",
        lastName: "Smith",
      })
    ).rejects.toBeInstanceOf(ConflictError);

    // Never reaches the transaction — no invitation row created.
    expect(db.portalInvitation.create).not.toHaveBeenCalled();
  });

  it("throws ConflictError when the email belongs to an existing ADMIN user", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "admin-user-id",
      role: "ADMIN",
    });

    await expect(
      createPortalInvitation(CLINICIAN_PROFILE_ID, {
        recipientEmail: "admin@example.com",
        firstName: "Root",
        lastName: "User",
      })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(db.portalInvitation.create).not.toHaveBeenCalled();
  });

  it("allows the invite when the existing user is a PARTICIPANT", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "participant-user-id",
      role: "PARTICIPANT",
    });
    db.portalInvitation.create.mockResolvedValue({
      id: "inv-participant",
      expiresAt: new Date(Date.now() + 7 * 86400_000),
    });

    const result = await createPortalInvitation(CLINICIAN_PROFILE_ID, {
      recipientEmail: "client@example.com",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.invitation.id).toBe("inv-participant");
    expect(db.portalInvitation.create).toHaveBeenCalled();
    // Existing-user path: the link is upserted, no stub user created.
    expect(db.clinicianClient.upsert).toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("allows the invite when no user exists for the email (stub-create path)", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.portalInvitation.create.mockResolvedValue({
      id: "inv-new",
      expiresAt: new Date(Date.now() + 7 * 86400_000),
    });

    const result = await createPortalInvitation(CLINICIAN_PROFILE_ID, {
      recipientEmail: "new@example.com",
      firstName: "New",
      lastName: "Client",
    });

    expect(result.invitation.id).toBe("inv-new");
    // New-user path: a stub user IS created.
    expect(db.user.create).toHaveBeenCalled();
  });
});
