import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

export async function queueTranscriptionJob(
  telehealthSessionId: string,
  audioPath: string,
): Promise<void> {
  // Import queue lazily to avoid circular deps
  const { getQueue } = await import("./queue");
  const boss = await getQueue();

  await boss.send("transcribe-session", {
    telehealthSessionId,
    audioPath,
  }, {
    retryLimit: 3,
    retryDelay: 60, // 1 minute between retries
    expireInMinutes: 30,
  });

  await prisma.telehealthSession.update({
    where: { id: telehealthSessionId },
    data: { transcriptStatus: "PENDING" },
  });

  logger.info("Transcription job queued", `sessionId=${telehealthSessionId}`);
}

export async function handleTranscriptResult(
  telehealthSessionId: string,
  transcript: { text: string; segments: unknown[]; speakerMap?: Record<string, string> },
  audioHash?: string,
): Promise<void> {
  const session = await prisma.telehealthSession.findUnique({
    where: { id: telehealthSessionId },
  });

  if (!session) {
    throw new Error("Telehealth session not found");
  }

  if (!["PENDING", "TRANSCRIBING"].includes(session.transcriptStatus)) {
    throw new Error(`Invalid transcript status: ${session.transcriptStatus}`);
  }

  // Verify audio hash if provided
  if (audioHash && session.audioHash && audioHash !== session.audioHash) {
    throw new Error("Audio hash mismatch — transcript may not match the recording");
  }

  await prisma.telehealthSession.update({
    where: { id: telehealthSessionId },
    data: {
      transcript: JSON.stringify(transcript), // Stored as text, encrypted by middleware
      transcriptStatus: "COMPLETED",
      transcribedAt: new Date(),
      transcriptError: null,
    },
  });

  logger.info("Transcript saved", `sessionId=${telehealthSessionId}`);
}

export async function retryTranscription(telehealthSessionId: string): Promise<void> {
  const session = await prisma.telehealthSession.findUnique({
    where: { id: telehealthSessionId },
  });

  if (!session || session.transcriptStatus !== "FAILED") {
    throw new Error("Session not in FAILED state");
  }

  if (!session.audioPath) {
    throw new Error("No audio path available for retry");
  }

  await prisma.telehealthSession.update({
    where: { id: telehealthSessionId },
    data: {
      transcriptStatus: "PENDING",
      transcriptionAttempts: { increment: 1 },
      transcriptError: null,
    },
  });

  await queueTranscriptionJob(telehealthSessionId, session.audioPath);
}
