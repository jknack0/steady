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
 * Host (whoever scheduled the session) requests consent to start recording.
 * Creates a PENDING consent record and notifies other participants via data channel.
 */
export async function requestRecordingConsent(
  appointmentId: string,
  hostUserId: string,
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

  if (session.status === "ENDED") {
    throw new Error("Session has ended");
  }

  if (session.egressId) {
    throw new Error("Recording already active");
  }

  // Check for an existing pending/granted consent. Auto-clean stale ones:
  // - PENDING that's older than the consent window (timeout handler missed it)
  // - GRANTED but the session has no egressId (previous egress start failed)
  // Both cases mean the prior attempt didn't produce an active recording,
  // so it's safe to mark them REVOKED and let the clinician retry.
  const existing = await prisma.telehealthConsent.findFirst({
    where: {
      telehealthSessionId: session.id,
      status: { in: ["PENDING", "GRANTED"] },
    },
    orderBy: { requestedAt: "desc" },
  });
  if (existing) {
    const isStalePending =
      existing.status === "PENDING" &&
      existing.requestedAt.getTime() + CONSENT_TIMEOUT_MS < Date.now();
    const isOrphanedGranted =
      existing.status === "GRANTED" && !session.egressId;

    if (isStalePending || isOrphanedGranted) {
      await prisma.telehealthConsent.update({
        where: { id: existing.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
      });
      logger.info(
        "Auto-cleaned stale consent",
        `consentId=${existing.id} prevStatus=${existing.status}`
      );
    } else {
      throw new Error("Consent request already in progress");
    }
  }

  // Pre-assign the appointment's participant, but the actual responder
  // will be recorded when they respond (may differ for clinician-to-clinician)
  const participantUserId = session.appointment.participant.user.id;

  const consent = await prisma.telehealthConsent.create({
    data: {
      telehealthSessionId: session.id,
      clinicianUserId: hostUserId,
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
  respondingUserId: string,
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

  // The host (whoever requested consent) cannot respond to their own request
  if (consent.clinicianUserId === respondingUserId) {
    throw new Error("Cannot respond to your own consent request");
  }

  if (consent.status !== "PENDING") {
    throw new Error(`Consent request is already ${consent.status}`);
  }

  // Record who actually responded (may differ from the pre-assigned participantUserId
  // in clinician-to-clinician scenarios)
  await prisma.telehealthConsent.update({
    where: { id: consentId },
    data: { participantUserId: respondingUserId },
  });

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
      await broadcastToRoom(consent.session.roomName, {
        type: "recording:started",
        consentId,
      });
    } else {
      // Egress start failed — roll consent back to DECLINED and notify
      // the room so the UIs don't show a false "Recording" indicator.
      // Real cause is logged by startRecording() — check API logs for
      // "Failed to start recording" or "S3_BUCKET not configured".
      await prisma.telehealthConsent.update({
        where: { id: consentId },
        data: { status: "DECLINED" },
      });
      await broadcastToRoom(consent.session.roomName, {
        type: "recording:consent:declined",
        consentId,
      });
      logger.error(
        "Recording egress failed to start — consent marked as declined",
        new Error(`sessionId=${consent.session.id}`)
      );
    }
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

  // session.egressId may be a single egress ID or a comma-separated
  // list (one per participant) when recorded via startParticipantEgress.
  const egressIds = session.egressId.split(",").map((s) => s.trim()).filter(Boolean);
  const client = getEgressClient();
  for (const egressId of egressIds) {
    try {
      await client.stopEgress(egressId);
      logger.info("Egress stopped", `sessionId=${session.id} egressId=${egressId}`);
    } catch (err) {
      // Non-fatal — an already-ended egress will throw Precondition Failed,
      // which we swallow so the revoke flow still completes for the others.
      logger.error("Failed to stop egress", err);
    }
  }

  // Clear egressId on the session row so getRecordingState returns
  // isRecording=false immediately. Without this, the UI stays showing
  // "Recording" even though every egress has been stopped — the
  // egress_ended webhook fires per file AFTER the audio is uploaded
  // (seconds later), and it doesn't actually clear the field either.
  await prisma.telehealthSession.update({
    where: { id: session.id },
    data: { egressId: null },
  });

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
