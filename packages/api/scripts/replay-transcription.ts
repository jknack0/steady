// One-off script to replay existing audio files through the
// transcription pipeline.
//
// IMPORTANT: This script uses a bare pg-boss instance that does NOT
// register any workers. If we called `onSessionEnd()` (which invokes
// the shared `getQueue()` helper), we'd spin up a second worker loop
// in this process that races the API's workers via `SKIP LOCKED`,
// claims jobs, and orphans them when the script exits.
//
// Usage:
//   npx tsx packages/api/scripts/replay-transcription.ts

import "../src/lib/bootstrap-env";
import PgBoss from "pg-boss";
import { prisma } from "@steady/db";
import { logger } from "../src/lib/logger";
import type { MultiTrackTranscript } from "../src/services/recording";

const SESSION_ID = "cmnt72sqg000c609ju9kmzql6";
const FILES = [
  "recordings/cmnnn6qvr0001vuqstgul3h4i/cmnt72sqg000c609ju9kmzql6/cmnnn6qvr0000vuqsff07h5yf-TR_AM3EtE6dQ4C8EJ.ogg",
  "recordings/cmnnn6qvr0001vuqstgul3h4i/cmnt72sqg000c609ju9kmzql6/cmnt7127f0001609jajok6g84-TR_AMd8QKSN9GQsGZ.ogg",
];

async function main() {
  const session = await prisma.telehealthSession.findUnique({
    where: { id: SESSION_ID },
    include: { appointment: { select: { clinicianId: true } } },
  });
  if (!session) {
    logger.error(`Session not found: ${SESSION_ID}`, new Error("not found"));
    process.exit(1);
  }
  const therapistId = session.appointment.clinicianId;

  // Reset transcript state so the pipeline treats this as a fresh run,
  // AND pre-populate the perSpeaker slots so the callback handler can
  // update the correct slot when each transcription completes.
  const perSpeaker: MultiTrackTranscript["perSpeaker"] = FILES.map((audioPath) => {
    const filename = audioPath.split("/").pop() ?? "";
    const participantIdentity = filename.replace(/\.ogg$/, "").split("-")[0];
    return {
      audioPath,
      participantIdentity,
      status: "pending",
    };
  });

  await prisma.telehealthSession.update({
    where: { id: SESSION_ID },
    data: {
      transcript: {
        status: "transcribing",
        perSpeaker,
      } as object,
      transcriptStatus: "pending",
      transcribedAt: null,
    },
  });
  logger.info("Session transcript reset with seeded slots", `sessionId=${SESSION_ID}`);

  // Bare pg-boss client — no workers. Just send jobs and stop.
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error("DATABASE_URL is required", new Error("missing env"));
    process.exit(1);
  }
  const boss = new PgBoss(databaseUrl);
  await boss.start();
  try {
    await boss.createQueue("transcribe-session");
  } catch {
    // already exists
  }

  const bucket = process.env.AWS_S3_BUCKET_NAME ?? "steady-dev";
  for (const audioPath of FILES) {
    const filename = audioPath.split("/").pop() ?? "";
    const participantIdentity = filename.replace(/\.ogg$/, "").split("-")[0];
    const id = await boss.send(
      "transcribe-session",
      {
        sessionId: SESSION_ID,
        therapistId,
        audioPath,
        bucket,
        participantIdentity,
        createdAt: new Date().toISOString(),
      },
      {
        retryLimit: 3,
        retryDelay: 60,
        expireInMinutes: 5, // short so orphans recycle quickly in dev
      },
    );
    logger.info(`Enqueued transcribe-session`, `jobId=${id} path=${audioPath}`);
  }

  // Stop the pg-boss client cleanly so no background polling is left behind.
  await boss.stop({ graceful: true, close: true });
  logger.info("Replay complete — jobs enqueued, waiting for API worker to pick up");

  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
