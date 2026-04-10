/**
 * Recording Control Service
 *
 * Handles the recording consent and control flow for telehealth sessions.
 *
 * Flow:
 * 1. Clinician requests consent → creates TelehealthConsent (PENDING)
 *    and sends a data message to the patient via LiveKit
 * 2. Patient responds (GRANTED | DECLINED) within 60 seconds
 * 3. On GRANT → start LiveKit Egress, update session
 * 4. On DECLINE or TIMEOUT → no recording starts
 * 5. Patient can revoke at any time → stop egress
 */

import { RoomServiceClient, EgressClient } from "livekit-server-sdk";
import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from "../lib/env";
import { startRecording } from "./recording";

function getLivekitHttpUrl(): string {
  return LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://");
}

function getRoomClient(): RoomServiceClient {
  return new RoomServiceClient(getLivekitHttpUrl(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

function getEgressClient(): EgressClient {
  return new EgressClient(getLivekitHttpUrl(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

export const CONSENT_TIMEOUT_MS = 60_000; // 60 seconds

/**
 * Send a data channel message to all participants in a room.
 * Used to notify participants of consent requests / state changes.
 */
async function broadcastToRoom(roomName: string, message: object): Promise<void> {
  try {
    const client = getRoomClient();
    const data = new TextEncoder().encode(JSON.stringify(message));
    await client.sendData(roomName, data, 0 /* DataPacket_Kind.RELIABLE */);
  } catch (err) {
    logger.error("Failed to broadcast to room", err);
  }
}

/**
 * Clinician requests consent to start recording.
 * Creates a PENDING consent record and notifies the patient via data channel.
 */
export async function requestRecordingConsent(
  appointmentId: string,
  clinicianUserId: string,
): Promise<{ consentId: string; roomName: string }> {
  const session = await prisma.telehealthSession.findUnique({
    where: { appointmentId },
    include: {
      appointment: {
        include: {
          participant: { include: { user: { select: { id: true } } } },
        },
      },
    },
  });

  if (!session) {
    throw new Error("Telehealth session not found");
  }

  if (session.status !== "ACTIVE") {
    throw new Error("Session is not active");
  }

  if (session.egressId) {
    throw new Error("Recording already active");
  }

  // Check for an existing pending/granted consent
  const existing = await prisma.telehealthConsent.findFirst({
    where: {
      telehealthSessionId: session.id,
      status: { in: ["PENDING", "GRANTED"] },
    },
  });
  if (existing) {
    throw new Error("Consent request already in progress");
  }

  const participantUserId = session.appointment.participant.user.id;

  const consent = await prisma.telehealthConsent.create({
    data: {
      telehealthSessionId: session.id,
      clinicianUserId,
      participantUserId,
      status: "PENDING",
    },
  });

  // Broadcast to the room so the patient's UI shows the consent modal
  await broadcastToRoom(session.roomName, {
    type: "recording:consent:requested",
    consentId: consent.id,
    timeoutMs: CONSENT_TIMEOUT_MS,
  });

  // Schedule a timeout to auto-expire the consent request
  setTimeout(async () => {
    try {
      const current = await prisma.telehealthConsent.findUnique({
        where: { id: consent.id },
      });
      if (current?.status === "PENDING") {
        await prisma.telehealthConsent.update({
          where: { id: consent.id },
          data: { status: "TIMEOUT", respondedAt: new Date() },
        });
        await broadcastToRoom(session.roomName, {
          type: "recording:consent:timeout",
          consentId: consent.id,
        });
        logger.info("Consent request timed out", `consentId=${consent.id}`);
      }
    } catch (err) {
      logger.error("Consent timeout handler failed", err);
    }
  }, CONSENT_TIMEOUT_MS);

  logger.info("Recording consent requested", `sessionId=${session.id} consentId=${consent.id}`);

  return { consentId: consent.id, roomName: session.roomName };
}

/**
 * Patient responds to a consent request.
 * If GRANTED, immediately start recording.
 */
export async function respondToConsent(
  consentId: string,
  participantUserId: string,
  granted: boolean,
  ipAddress?: string,
): Promise<{ status: string; recordingStarted: boolean }> {
  const consent = await prisma.telehealthConsent.findUnique({
    where: { id: consentId },
    include: {
      session: {
        include: {
          appointment: { select: { clinicianId: true } },
        },
      },
    },
  });

  if (!consent) {
    throw new Error("Consent request not found");
  }

  if (consent.participantUserId !== participantUserId) {
    throw new Error("Not authorized to respond to this consent request");
  }

  if (consent.status !== "PENDING") {
    throw new Error(`Consent request is already ${consent.status}`);
  }

  const newStatus = granted ? "GRANTED" : "DECLINED";

  await prisma.telehealthConsent.update({
    where: { id: consentId },
    data: {
      status: newStatus,
      respondedAt: new Date(),
      ipAddress,
    },
  });

  let recordingStarted = false;

  if (granted) {
    // Start LiveKit Egress
    const egressId = await startRecording(
      consent.session.roomName,
      consent.session.id,
      consent.session.appointment.clinicianId,
    );

    if (egressId) {
      await prisma.telehealthSession.update({
        where: { id: consent.session.id },
        data: { egressId },
      });
      recordingStarted = true;
    }

    await broadcastToRoom(consent.session.roomName, {
      type: "recording:started",
      consentId,
    });
  } else {
    await broadcastToRoom(consent.session.roomName, {
      type: "recording:consent:declined",
      consentId,
    });
  }

  logger.info("Consent response recorded", `consentId=${consentId} status=${newStatus}`);

  return { status: newStatus, recordingStarted };
}

/**
 * Stop an active recording.
 * Can be called by clinician (manual stop) or patient (revoke consent).
 */
export async function stopRecording(
  appointmentId: string,
  userId: string,
  isRevoke: boolean = false,
): Promise<void> {
  const session = await prisma.telehealthSession.findUnique({
    where: { appointmentId },
  });

  if (!session) {
    throw new Error("Telehealth session not found");
  }

  if (!session.egressId) {
    throw new Error("No active recording");
  }

  try {
    const client = getEgressClient();
    await client.stopEgress(session.egressId);
    logger.info("Egress stopped", `sessionId=${session.id}`);
  } catch (err) {
    logger.error("Failed to stop egress", err);
  }

  // If this is a revoke, mark the consent as REVOKED
  if (isRevoke) {
    const activeConsent = await prisma.telehealthConsent.findFirst({
      where: {
        telehealthSessionId: session.id,
        status: "GRANTED",
      },
      orderBy: { respondedAt: "desc" },
    });
    if (activeConsent) {
      await prisma.telehealthConsent.update({
        where: { id: activeConsent.id },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
    }
  }

  await broadcastToRoom(session.roomName, {
    type: "recording:stopped",
    revoked: isRevoke,
  });

  // egressId is cleared by the egress_ended webhook when the audio is saved
  logger.info("Recording stop requested", `sessionId=${session.id} revoke=${isRevoke}`);
}

/**
 * Get the current recording state for a session.
 */
export async function getRecordingState(appointmentId: string): Promise<{
  isRecording: boolean;
  consentStatus: string | null;
  pendingConsentId: string | null;
}> {
  const session = await prisma.telehealthSession.findUnique({
    where: { appointmentId },
    include: {
      consents: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!session) {
    return { isRecording: false, consentStatus: null, pendingConsentId: null };
  }

  const latestConsent = session.consents[0];

  return {
    isRecording: !!session.egressId,
    consentStatus: latestConsent?.status ?? null,
    pendingConsentId: latestConsent?.status === "PENDING" ? latestConsent.id : null,
  };
}
