// One-off: re-run the merge step on an existing session's transcript
// so we can see the new friendly speaker labels without re-recording.
//
// Usage: npx tsx packages/api/scripts/remerge-transcript.ts [sessionId]

import "../src/lib/bootstrap-env";
import { prisma } from "@steady/db";
import type { Prisma } from "@prisma/client";
import type { MultiTrackTranscript } from "../src/services/recording";
import { logger } from "../src/lib/logger";

const SESSION_ID = process.argv[2] ?? "cmntbpapu0004kktr4nrumkiv";

type MergedSegment = {
  start: number;
  end: number;
  text: string;
  participantIdentity: string;
  speakerLabel: string;
};

async function buildSpeakerLabels(
  tx: Prisma.TransactionClient,
  identities: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(identities.filter(Boolean)));
  if (unique.length === 0) return {};
  const users = await tx.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  const labels: Record<string, string> = {};
  for (const id of unique) {
    const user = users.find((u) => u.id === id);
    if (!user) {
      labels[id] = `Speaker ${id.slice(0, 6)}`;
      continue;
    }
    const first = user.firstName?.trim() ?? "";
    const last = user.lastName?.trim() ?? "";
    if (user.role === "CLINICIAN") {
      labels[id] = last ? `Dr. ${last}` : first ? `Dr. ${first}` : "Clinician";
    } else if (user.role === "PARTICIPANT") {
      const fullName = [first, last].filter(Boolean).join(" ");
      labels[id] = fullName || "Client";
    } else {
      labels[id] = [first, last].filter(Boolean).join(" ") || `Speaker ${id.slice(0, 6)}`;
    }
  }
  return labels;
}

async function mergePerSpeaker(
  tx: Prisma.TransactionClient,
  transcript: MultiTrackTranscript,
): Promise<{ text: string; segments: MergedSegment[] }> {
  const labels = await buildSpeakerLabels(
    tx,
    transcript.perSpeaker.map((s) => s.participantIdentity),
  );
  const merged: MergedSegment[] = [];
  for (const slot of transcript.perSpeaker) {
    if (!slot.transcript?.segments) continue;
    const speakerLabel = labels[slot.participantIdentity] ?? slot.participantIdentity;
    for (const seg of slot.transcript.segments) {
      merged.push({
        start: seg.start,
        end: seg.end,
        text: seg.text,
        participantIdentity: slot.participantIdentity,
        speakerLabel,
      });
    }
  }
  merged.sort((a, b) => a.start - b.start);
  const text = merged.map((s) => `${s.speakerLabel}: ${s.text}`).join("\n");
  return { text, segments: merged };
}

async function main() {
  const session = await prisma.telehealthSession.findUnique({
    where: { id: SESSION_ID },
  });
  if (!session) {
    logger.error(`Session not found: ${SESSION_ID}`, new Error("not found"));
    process.exit(1);
  }
  const current = session.transcript as unknown as MultiTrackTranscript | null;
  if (!current || !current.perSpeaker || current.perSpeaker.length === 0) {
    logger.error("Session has no perSpeaker transcript data", new Error("no data"));
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    const merged = await mergePerSpeaker(tx, current);
    current.merged = merged;
    // Duplicate at top level for session-summary compatibility
    (current as unknown as {
      text: string;
      segments: MergedSegment[];
    }).text = merged.text;
    (current as unknown as {
      text: string;
      segments: MergedSegment[];
    }).segments = merged.segments;
    await tx.telehealthSession.update({
      where: { id: SESSION_ID },
      data: { transcript: current as unknown as object },
    });
  });

  logger.info("Re-merge complete", `sessionId=${SESSION_ID}`);
  const updated = await prisma.telehealthSession.findUnique({
    where: { id: SESSION_ID },
    select: { transcript: true },
  });
  const mergedText = (updated?.transcript as any)?.merged?.text ?? "";
  // eslint-disable-next-line no-console
  console.log("\n=== MERGED TRANSCRIPT ===\n");
  // eslint-disable-next-line no-console
  console.log(mergedText);
  // eslint-disable-next-line no-console
  console.log("\n=========================\n");
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
