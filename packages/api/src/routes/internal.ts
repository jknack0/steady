import { Router } from "express";
import { prisma } from "@steady/db";
import type { Prisma } from "@prisma/client";
import { authenticateInternal } from "../middleware/internal-auth";
import { logger } from "../lib/logger";
import { queueSummarization } from "../services/session-summary";
import type { MultiTrackTranscript } from "../services/recording";

const router = Router();

router.use(authenticateInternal);

type SingleTranscript = {
  text: string;
  segments: Array<{ start: number; end: number; text: string; speaker?: string }>;
  language?: string;
  duration?: number;
};

type MergedSegment = {
  start: number;
  end: number;
  text: string;
  participantIdentity: string;
  speakerLabel: string;
};

/**
 * Build a friendly display name for a speaker label.
 *   CLINICIAN → "Dr. LastName" (falls back to "Dr. [first letter]." or "Clinician")
 *   PARTICIPANT → "FirstName LastName" (falls back to first name or "Client")
 *   unknown → "Speaker [id-prefix]"
 *
 * The incoming identity is the User.id (what we pass as the LiveKit
 * participant identity when generating tokens).
 */
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
      if (last) labels[id] = `Dr. ${last}`;
      else if (first) labels[id] = `Dr. ${first}`;
      else labels[id] = "Clinician";
    } else if (user.role === "PARTICIPANT") {
      const fullName = [first, last].filter(Boolean).join(" ");
      labels[id] = fullName || "Client";
    } else {
      labels[id] = [first, last].filter(Boolean).join(" ") || `Speaker ${id.slice(0, 6)}`;
    }
  }
  return labels;
}

/**
 * Merge all per-speaker transcripts into a single time-sorted transcript
 * with friendly speaker attribution. Called when every perSpeaker slot
 * has a completed transcript.
 */
async function mergePerSpeaker(
  tx: Prisma.TransactionClient,
  transcript: MultiTrackTranscript,
): Promise<{
  text: string;
  segments: MergedSegment[];
}> {
  // Look up display names for every unique participant identity
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

/**
 * POST /internal/transcripts?audioPath=...
 *
 * Called by the transcription worker after transcription completes for
 * a single audio file. Multi-track sessions have multiple audio files,
 * so this endpoint may be called multiple times per session. Each call
 * updates one perSpeaker slot; when all slots are complete, the merge
 * step runs and transcriptStatus flips to "completed".
 *
 * Internal only — authenticated via INTERNAL_API_KEY shared secret.
 */
router.post("/transcripts", async (req, res) => {
  try {
    const { sessionId, transcript, audioHash } = req.body as {
      sessionId: string;
      transcript: SingleTranscript;
      audioHash?: string;
    };

    // The audioPath is passed via query string so we know which
    // per-speaker slot this callback belongs to.
    const audioPath =
      typeof req.query.audioPath === "string" ? req.query.audioPath : undefined;

    if (!sessionId || !transcript) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }

    // Use a read-modify-write inside a transaction so concurrent
    // callbacks for the same session don't clobber each other.
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.telehealthSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) return { notFound: true } as const;

      // Only accept transcripts while transcription is in flight
      if (!["pending", "transcribing"].includes(session.transcriptStatus)) {
        return { invalidState: session.transcriptStatus } as const;
      }

      const current =
        (session.transcript as unknown as MultiTrackTranscript | null) ?? {
          status: "transcribing" as const,
          perSpeaker: [],
        };

      if (audioPath) {
        // Multi-track: find the matching slot and update it
        const slot = current.perSpeaker.find((s) => s.audioPath === audioPath);
        if (slot) {
          slot.status = "completed";
          slot.transcript = transcript;
          slot.audioHash = audioHash;
        } else {
          // Slot doesn't exist yet (webhook arrived before egress_ended?).
          // Add a new one so the callback isn't lost.
          current.perSpeaker.push({
            audioPath,
            participantIdentity:
              audioPath.split("/").pop()?.replace(/\.ogg$/, "").split("-")[0] ??
              "unknown",
            status: "completed",
            transcript,
            audioHash,
          });
        }

        // Are all slots complete?
        const allDone =
          current.perSpeaker.length > 0 &&
          current.perSpeaker.every((s) => s.status === "completed");

        if (allDone) {
          const merged = await mergePerSpeaker(tx, current);
          current.merged = merged;
          current.status = "completed";
          // Duplicate merged.text / merged.segments at the top level so
          // services/session-summary.ts (which reads transcript.text and
          // transcript.segments) works without any changes.
          (current as unknown as {
            text: string;
            segments: Array<{ start: number; end: number; text: string }>;
          }).text = merged.text;
          (current as unknown as {
            text: string;
            segments: Array<{ start: number; end: number; text: string }>;
          }).segments = merged.segments;
        } else {
          current.status = "transcribing";
        }

        await tx.telehealthSession.update({
          where: { id: sessionId },
          data: {
            transcript: current as unknown as object,
            transcriptStatus: allDone ? "completed" : "transcribing",
            transcribedAt: allDone ? new Date() : null,
          },
        });

        return { ok: true, allDone } as const;
      }

      // Legacy single-file path: no audioPath query param. Write the
      // transcript as-is and mark completed.
      await tx.telehealthSession.update({
        where: { id: sessionId },
        data: {
          transcript: transcript as unknown as object,
          transcriptStatus: "completed",
          transcribedAt: new Date(),
        },
      });
      return { ok: true, allDone: true } as const;
    });

    if ("notFound" in result) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }
    if ("invalidState" in result) {
      res.status(409).json({
        success: false,
        error: `Invalid session state: ${result.invalidState}`,
      });
      return;
    }

    // HIPAA: log only IDs and hash, never transcript content
    logger.info(
      "Transcript stored",
      `sessionId=${sessionId} audioPath=${audioPath ?? "(legacy)"} hash=${audioHash || "none"} allDone=${result.allDone}`,
    );

    // Only queue summarization once — when ALL per-speaker tracks are done
    if (result.allDone) {
      queueSummarization(sessionId).catch((err) => {
        logger.error("Failed to queue summarization", err);
      });
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("Transcript callback error", err);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

export default router;
