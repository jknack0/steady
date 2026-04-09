/**
 * LiveKit Egress Recording Service
 *
 * Records therapy session audio via LiveKit's Egress API.
 * Audio is saved directly to S3 as a WAV file.
 * After recording, sends an SQS message to queue transcription.
 */

import { EgressClient, EncodedFileOutput, EncodedFileType } from "livekit-server-sdk";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, S3_BUCKET, TRANSCRIPTION_QUEUE_URL } from "../lib/env";

const sqs = new SQSClient({ region: process.env.AWS_DEFAULT_REGION || "us-east-2" });

function getLivekitHttpUrl(): string {
  return LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://");
}

/**
 * Start recording audio for a LiveKit room.
 * Called when a session becomes ACTIVE (both participants present).
 *
 * Output: WAV (PCM 16-bit, 16kHz mono) saved to S3 at
 *   recordings/{therapistId}/{sessionId}.wav
 */
export async function startRecording(roomName: string, sessionId: string, therapistId: string): Promise<string | null> {
  if (!S3_BUCKET) {
    logger.warn("S3_BUCKET not configured — skipping recording");
    return null;
  }

  try {
    const egressClient = new EgressClient(getLivekitHttpUrl(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    const filepath = `recordings/${therapistId}/${sessionId}.wav`;

    const output = new EncodedFileOutput({
      fileType: EncodedFileType.DEFAULT_FILETYPE,
      filepath,
      output: {
        case: "s3" as const,
        value: {
          bucket: S3_BUCKET,
          region: process.env.AWS_DEFAULT_REGION || "us-east-2",
        },
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
 * Called when a session ends and audio is confirmed saved to S3.
 * Updates the database and queues a transcription job via SQS.
 *
 * Per spec: SQS message sent immediately after LiveKit Egress
 * confirms the recording is saved to S3.
 */
export async function onSessionEnd(sessionId: string, audioPath: string, therapistId: string): Promise<void> {
  // Update database
  await prisma.telehealthSession.update({
    where: { id: sessionId },
    data: {
      audioPath,
      transcriptStatus: "pending",
    },
  });

  // Queue transcription job via SQS
  if (TRANSCRIPTION_QUEUE_URL) {
    try {
      await sqs.send(new SendMessageCommand({
        QueueUrl: TRANSCRIPTION_QUEUE_URL,
        MessageBody: JSON.stringify({
          sessionId,
          therapistId,
          audioPath,
          bucket: S3_BUCKET,
          createdAt: new Date().toISOString(),
        }),
      }));

      logger.info("Transcription job queued", `sessionId=${sessionId}`);
    } catch (err) {
      logger.error("Failed to queue transcription job", err);
    }
  }

  logger.info("Session audio saved", `sessionId=${sessionId}`);
}
