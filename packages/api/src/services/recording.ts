/**
 * LiveKit Egress Recording Service
 *
 * Records therapy session audio via LiveKit's Egress API.
 * Audio is saved to S3 (or S3-compatible storage like MinIO in dev).
 * After recording, queues a transcription job via SQS or pg-boss.
 */

import {
  DirectFileOutput,
  EgressClient,
  RoomServiceClient,
  TrackType,
} from "livekit-server-sdk";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
  S3_BUCKET,
  TRANSCRIPTION_QUEUE_URL,
} from "../lib/env";

const sqs = new SQSClient({
  region: process.env.AWS_DEFAULT_REGION || "us-east-2",
  // AWS_ENDPOINT_URL — set to MinIO URL in dev
  ...(process.env.AWS_ENDPOINT_URL ? { endpoint: process.env.AWS_ENDPOINT_URL } : {}),
});

function getLivekitHttpUrl(): string {
  return LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://");
}

/**
 * Start recording audio for a LiveKit room.
 * Called when a session becomes ACTIVE (both participants present).
 *
 * Output: OGG audio-only saved to S3 at recordings/{therapistId}/{sessionId}.ogg
 * In dev, the S3 endpoint points to MinIO via AWS_ENDPOINT_URL.
 */
function buildS3Config(): Record<string, unknown> {
  const s3Config: Record<string, unknown> = {
    bucket: S3_BUCKET,
    region: process.env.AWS_DEFAULT_REGION || "us-east-2",
  };

  // MinIO / custom S3 endpoint.
  //
  // LOCAL DEV GOTCHA: the API runs on the host, but the Egress worker
  // runs inside Docker. The API reads MinIO via the host port
  // (http://localhost:9100), but the Egress container must reach
  // MinIO via the Docker network name (http://minio:9000).
  // - EGRESS_S3_ENDPOINT_URL (dev): http://minio:9000
  // - AWS_ENDPOINT_URL (dev):       http://localhost:9100
  // In production neither is set and the AWS SDK uses real S3.
  const egressEndpoint =
    process.env.EGRESS_S3_ENDPOINT_URL || process.env.AWS_ENDPOINT_URL;
  if (egressEndpoint) {
    s3Config.endpoint = egressEndpoint;
    s3Config.forcePathStyle = true;
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Config.accessKey = process.env.AWS_ACCESS_KEY_ID;
    s3Config.secret = process.env.AWS_SECRET_ACCESS_KEY;
  }

  return s3Config;
}

export async function startRecording(
  roomName: string,
  sessionId: string,
  therapistId: string,
): Promise<string | null> {
  if (!S3_BUCKET) {
    logger.warn("S3_BUCKET not configured — skipping recording");
    return null;
  }

  try {
    const egressClient = new EgressClient(
      getLivekitHttpUrl(),
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
    );

    // Enumerate participants and find all published, unmuted AUDIO
    // tracks. Start one TrackEgress per audio track. TrackEgress writes
    // the raw Opus bitstream into an OGG container — no Chrome, no
    // composite template, no encoding. Works in dev where the egress
    // container can't reach the hosted LiveKit composite template URL.
    //
    // We produce one file per track (one per speaking participant) and
    // store all egress IDs as a comma-separated list on session.egressId.
    // The stop flow iterates and stops each one.
    const roomClient = new RoomServiceClient(
      getLivekitHttpUrl(),
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
    );
    const participants = await roomClient.listParticipants(roomName);

    if (participants.length === 0) {
      logger.warn(
        "No participants in room — skipping recording",
        `room=${roomName}`,
      );
      return null;
    }

    const s3Config = buildS3Config();
    const egressIds: string[] = [];

    for (const participant of participants) {
      // Find audio tracks the participant is currently publishing
      const audioTracks = (participant.tracks ?? []).filter(
        (t) => t.type === TrackType.AUDIO && !t.muted,
      );
      if (audioTracks.length === 0) {
        logger.info(
          "Participant has no audio tracks — skipping",
          `identity=${participant.identity}`,
        );
        continue;
      }

      for (const track of audioTracks) {
        const filepath = `recordings/${therapistId}/${sessionId}/${participant.identity}-${track.sid}.ogg`;
        const output = new DirectFileOutput({
          filepath,
          output: {
            case: "s3" as const,
            value: s3Config as any,
          },
        });

        try {
          const info = await egressClient.startTrackEgress(
            roomName,
            output,
            track.sid,
          );
          if (info.egressId) {
            egressIds.push(info.egressId);
            logger.info(
              "Track egress started",
              `identity=${participant.identity} trackSid=${track.sid} egressId=${info.egressId}`,
            );
          }
        } catch (err) {
          logger.error(
            `Failed to start track egress for ${participant.identity}/${track.sid}`,
            err,
          );
        }
      }
    }

    if (egressIds.length === 0) {
      logger.error(
        "No egress started for any participant",
        new Error(`room=${roomName}`),
      );
      return null;
    }

    // Store all egress IDs as a comma-separated string in session.egressId
    const combined = egressIds.join(",");
    logger.info(
      "Recording started",
      `room=${roomName} egressIds=${combined}`,
    );
    return combined;
  } catch (err) {
    logger.error("Failed to start recording", err);
    return null;
  }
}

/**
 * Shape stored in `telehealthSession.transcript` while multi-track
 * transcription is in flight. Once every per-speaker entry has a
 * transcript, the merge step populates `merged`.
 */
export interface MultiTrackTranscript {
  status: "transcribing" | "completed" | "partial" | "failed";
  perSpeaker: Array<{
    audioPath: string;
    participantIdentity: string;
    status: "pending" | "transcribing" | "completed" | "failed";
    transcript?: {
      text: string;
      segments: Array<{ start: number; end: number; text: string; speaker?: string }>;
      language?: string;
      duration?: number;
    };
    audioHash?: string;
  }>;
  merged?: {
    text: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      participantIdentity: string;
      speakerLabel?: string;
    }>;
  };
}

/**
 * Called when audio is confirmed saved to S3 — once per TrackEgress.
 *
 * Appends the new track to `session.transcript.perSpeaker` and queues
 * a transcription job for it. When every perSpeaker entry is completed,
 * the `/internal/transcripts` callback handler merges them into
 * `session.transcript.merged` and flips transcriptStatus to "completed".
 */
export async function onSessionEnd(
  sessionId: string,
  audioPath: string,
  therapistId: string,
  participantIdentity?: string,
): Promise<void> {
  // Derive a participant identity from the filepath if not provided.
  // Filepath pattern: recordings/{therapistId}/{sessionId}/{identity}-{trackSid}.ogg
  const inferredIdentity =
    participantIdentity ??
    audioPath.split("/").pop()?.replace(/\.ogg$/, "").split("-")[0] ??
    "unknown";

  // Read the current session transcript (may be null or have prior tracks)
  const session = await prisma.telehealthSession.findUnique({
    where: { id: sessionId },
    select: { transcript: true, audioPath: true },
  });
  const existing =
    (session?.transcript as unknown as MultiTrackTranscript | null) ?? {
      status: "transcribing",
      perSpeaker: [],
    };

  // Append this track if not already present (webhook retries are idempotent)
  const alreadyPresent = existing.perSpeaker.some(
    (s) => s.audioPath === audioPath,
  );
  if (!alreadyPresent) {
    existing.perSpeaker.push({
      audioPath,
      participantIdentity: inferredIdentity,
      status: "pending",
    });
    existing.status = "transcribing";
  }

  // Keep audioPath column populated with the most recent path for
  // back-compat with any code that reads it as a scalar. The source
  // of truth for multi-track is transcript.perSpeaker.
  await prisma.telehealthSession.update({
    where: { id: sessionId },
    data: {
      audioPath,
      transcriptStatus: "pending",
      transcript: existing as unknown as object,
    },
  });

  const message = {
    sessionId,
    therapistId,
    audioPath,
    bucket: S3_BUCKET,
    participantIdentity: inferredIdentity,
    createdAt: new Date().toISOString(),
  };

  // Queue transcription job — use SQS if configured, else pg-boss
  if (TRANSCRIPTION_QUEUE_URL && TRANSCRIPTION_QUEUE_URL.includes("sqs.")) {
    try {
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: TRANSCRIPTION_QUEUE_URL,
          MessageBody: JSON.stringify(message),
        }),
      );
      logger.info("Transcription job queued via SQS", `sessionId=${sessionId}`);
    } catch (err) {
      logger.error("Failed to queue SQS transcription job", err);
    }
  } else {
    try {
      const { getQueue } = await import("./queue");
      const boss = await getQueue();
      await boss.send("transcribe-session", message, {
        retryLimit: 3,
        retryDelay: 60,
        expireInMinutes: 30,
      });
      logger.info("Transcription job queued via pg-boss", `sessionId=${sessionId}`);
    } catch (err) {
      logger.error("Failed to queue pg-boss transcription job", err);
    }
  }
}
