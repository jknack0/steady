import { AccessToken, WebhookReceiver } from "livekit-server-sdk";
import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from "../lib/env";

// ── Types ────────────────────────────────────────────

interface TokenResult {
  token: string;
  url: string;
  roomName: string;
}

export class TelehealthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "TelehealthError";
  }
}

// ── Room Naming ─────────────────────────────────────

function generateRoomName(appointmentId: string): string {
  return `session-${appointmentId}`;
}

// ── Token Generation ────────────────────────────────

export async function generateToken(
  appointmentId: string,
  userId: string,
  role: "CLINICIAN" | "PARTICIPANT",
): Promise<TokenResult> {
  // 1. Look up appointment and verify it exists
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      clinician: { include: { user: { select: { id: true } } } },
      participant: { include: { user: { select: { id: true } } } },
    },
  });

  if (!appointment) {
    throw new TelehealthError("Appointment not found", 404);
  }

  // 2. Verify ownership — clinician (or same-practice clinician) or participant must match
  const clinicianUserId = appointment.clinician.user.id;
  const participantUserId = appointment.participant.user.id;

  if (role === "CLINICIAN" && userId !== clinicianUserId) {
    // Allow any clinician from the same practice to join
    const sameClinic = await prisma.practiceMembership.findFirst({
      where: {
        practiceId: appointment.practiceId,
        clinician: { userId },
      },
    });
    if (!sameClinic) {
      logger.warn("Telehealth token denied — clinician ownership mismatch", appointmentId);
      throw new TelehealthError("Not authorized for this appointment", 403);
    }
  }
  if (role === "PARTICIPANT" && userId !== participantUserId) {
    logger.warn("Telehealth token denied — participant ownership mismatch", appointmentId);
    throw new TelehealthError("Not authorized for this appointment", 403);
  }

  // 3. Verify appointment is in a joinable state
  if (!["SCHEDULED", "ATTENDED"].includes(appointment.status)) {
    throw new TelehealthError("Appointment is not in a joinable state", 409);
  }

  // 4. Upsert TelehealthSession — create if none exists, reuse if WAITING/ACTIVE
  const roomName = generateRoomName(appointmentId);

  let telehealthSession = await prisma.telehealthSession.findUnique({
    where: { appointmentId },
  });

  if (!telehealthSession || telehealthSession.status === "ENDED") {
    telehealthSession = await prisma.telehealthSession.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        roomName,
        status: "WAITING",
      },
      update: {
        roomName,
        status: "WAITING",
        clinicianJoinedAt: null,
        participantJoinedAt: null,
        endedAt: null,
        durationSeconds: null,
        endedBy: null,
      },
    });
  }

  // 5. Generate LiveKit access token
  //    HIPAA COND-1c: Only userId as identity, role label as display name — no PHI
  //    HIPAA COND-3b: No PHI in participant metadata
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: userId,
    name: role === "CLINICIAN" ? "Clinician" : "Participant",
    metadata: JSON.stringify({ role }),
    ttl: "4h",
  });

  // HIPAA COND-1d: roomAdmin only for clinician
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: role === "CLINICIAN",
  });

  const token = await at.toJwt();

  logger.info("Telehealth token issued", `appointment=${appointmentId} role=${role}`);

  return {
    token,
    url: LIVEKIT_URL,
    roomName,
  };
}

// ── Webhook Processing ──────────────────────────────

const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export async function handleWebhookEvent(
  body: string,
  authHeader: string,
): Promise<void> {
  // Verify webhook signature — HIPAA COND-3c
  const event = await webhookReceiver.receive(body, authHeader);

  // HIPAA COND-3a: Only log event type and room name — never raw payloads
  const roomName = event.room?.name;
  const eventType = event.event;
  logger.info("LiveKit webhook received", `event=${eventType} room=${roomName || "unknown"}`);

  switch (eventType) {
    case "room_started":
      await handleRoomStarted(event);
      break;
    case "participant_joined":
      await handleParticipantJoined(event);
      break;
    case "participant_left":
      await handleParticipantLeft(event);
      break;
    case "room_finished":
      await handleRoomFinished(event);
      break;
    default:
      logger.info("Unhandled LiveKit webhook event", eventType);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- LiveKit webhook event type
async function handleRoomStarted(event: any): Promise<void> {
  const roomName = event.room?.name as string | undefined;
  if (!roomName) return;

  const session = await prisma.telehealthSession.findUnique({
    where: { roomName },
  });
  if (!session) return;

  logger.info("Telehealth room started", `room=${roomName} sessionId=${session.id}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- LiveKit webhook event type
async function handleParticipantJoined(event: any): Promise<void> {
  const roomName = event.room?.name as string | undefined;
  if (!roomName) return;

  const metadata = parseMetadata(event.participant?.metadata);
  const role = metadata?.role as string | undefined;
  const identity = event.participant?.identity as string | undefined;

  const session = await prisma.telehealthSession.findUnique({
    where: { roomName },
  });
  if (!session) return;

  // HIPAA COND-6c: Only log IDs and role, never names
  logger.info(
    "Telehealth participant joined",
    `room=${roomName} identity=${identity || "unknown"} role=${role || "unknown"}`,
  );

  const now = new Date();
  const updates: Record<string, unknown> = {};

  if (role === "CLINICIAN" && !session.clinicianJoinedAt) {
    updates.clinicianJoinedAt = now;
  }
  if (role === "PARTICIPANT" && !session.participantJoinedAt) {
    updates.participantJoinedAt = now;
  }

  // Transition to ACTIVE when either participant joins
  if (session.status === "WAITING") {
    updates.status = "ACTIVE";
  }

  if (Object.keys(updates).length > 0) {
    await prisma.telehealthSession.update({
      where: { id: session.id },
      data: updates,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- LiveKit webhook event type
async function handleParticipantLeft(event: any): Promise<void> {
  const roomName = event.room?.name as string | undefined;
  if (!roomName) return;

  const identity = event.participant?.identity as string | undefined;

  const session = await prisma.telehealthSession.findUnique({
    where: { roomName },
  });
  if (!session) return;

  logger.info(
    "Telehealth participant left",
    `room=${roomName} identity=${identity || "unknown"}`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- LiveKit webhook event type
async function handleRoomFinished(event: any): Promise<void> {
  const roomName = event.room?.name as string | undefined;
  if (!roomName) return;

  const session = await prisma.telehealthSession.findUnique({
    where: { roomName },
  });
  if (!session) return;

  // Calculate duration from creation (or first join) to now
  const now = new Date();
  const startedAt = session.clinicianJoinedAt || session.participantJoinedAt || session.createdAt;
  const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

  await prisma.telehealthSession.update({
    where: { id: session.id },
    data: {
      status: "ENDED",
      endedAt: now,
      durationSeconds,
    },
  });

  logger.info(
    "Telehealth room finished",
    `room=${roomName} durationSeconds=${durationSeconds}`,
  );
}

function parseMetadata(raw: string | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}
