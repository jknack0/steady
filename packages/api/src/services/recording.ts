/**
 * LiveKit Egress Recording Service
 *
 * Records therapy session audio via LiveKit's Egress API.
 * Audio is saved to S3 (or S3-compatible storage like MinIO in dev).
 * After recording, queues a transcription job via SQS or pg-boss.
 */

import { EgressClient, EncodedFileOutput, EncodedFileType } from "livekit-server-sdk";
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
    const egressClient = new EgressClient(getLivekitHttpUrl(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    const filepath = `recordings/${therapistId}/${sessionId}.ogg`;

    // S3-compatible config — works with AWS S3 in prod and MinIO in dev
    const s3Config: Record<string, unknown> = {
      bucket: S3_BUCKET,
      region: process.env.AWS_DEFAULT_REGION || "us-east-2",
    };

    // MinIO / custom S3 endpoint (dev)
    if (process.env.AWS_ENDPOINT_URL) {
      s3Config.endpoint = process.env.AWS_ENDPOINT_URL;
      s3Config.forcePathStyle = true;
    }

    // Credentials — in prod these come from IAM instance role
    // In dev, pass them explicitly for MinIO
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      s3Config.accessKey = process.env.AWS_ACCESS_KEY_ID;
      s3Config.secret = process.env.AWS_SECRET_ACCESS_KEY;
    }

    const output = new EncodedFileOutput({
      fileType: EncodedFileType.OGG,
      filepath,
      output: {
        case: "s3" as const,
        value: s3Config as any,
      },
    });

    const info = await egressClient.startRoomCompositeEgress(
      roomName,
      { file: output },
      { audioOnly: true },
    );

    logger.info("Recording started", `room=${roomName} egressId=${info.egressId}`);

    return info.egressId;
  } catch (err) {
    logger.error("Failed to start recording", err);
    return null;
  }
}

/**
 * Called when audio is confirmed saved to S3.
 * Updates the database and queues a transcription job.
 *
 * Queue backend is determined by TRANSCRIPTION_QUEUE_URL:
 * - If set and starts with "https://sqs." → real AWS SQS
 * - Otherwise (dev/local) → pg-boss (same DB as the app)
 */
export async function onSessionEnd(
  sessionId: string,
  audioPath: string,
  therapistId: string,
): Promise<void> {
  // Update database
  await prisma.telehealthSession.update({
    where: { id: sessionId },
    data: {
      audioPath,
      transcriptStatus: "pending",
    },
  });

  const message = {
    sessionId,
    therapistId,
    audioPath,
    bucket: S3_BUCKET,
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
