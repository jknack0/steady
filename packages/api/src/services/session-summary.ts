/**
 * Session Summary Service
 *
 * Uses Claude (via AWS Bedrock) to generate clinical notes from a session
 * transcript. Output: structured JSON with overview, key themes, action
 * items, etc. Uses the clinical-tier model (Sonnet) since these notes
 * drive therapist documentation.
 */

import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { getBedrockClient, MODELS } from "../lib/bedrock";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

interface Transcript {
  text: string;
  segments: TranscriptSegment[];
  language?: string;
  duration?: number;
}

export interface SessionSummary {
  overview: string;          // 2-3 paragraph high-level summary
  keyThemes: string[];       // Main topics discussed
  progressNotes: string;     // Clinical observations suitable for the therapist's note
  actionItems: string[];     // Homework, follow-ups, things to bring next time
  concerns: string[];        // Safety concerns, escalations (empty array if none)
  mood: {
    affect: string;          // e.g. "flat", "anxious", "engaged"
    engagement: string;      // e.g. "high", "moderate", "withdrawn"
  };
}

const SYSTEM_PROMPT = `You are an AI assistant helping a licensed therapist write clinical progress notes after a therapy session. You will receive a session transcript and produce a structured clinical summary.

Guidelines:
- Be objective and factual. Stick to what was actually said in the transcript.
- Use clinical language appropriate for progress notes (e.g. "client reported", "affect was", "client engaged with").
- Never speculate about diagnoses or make judgments.
- If safety concerns arise (suicidal ideation, homicidal ideation, abuse, active crisis), flag them in the "concerns" array.
- Keep the overview concise but comprehensive — this will be the therapist's starting point for their note.
- Action items should be specific and actionable.

Return ONLY valid JSON matching this exact schema:
{
  "overview": "string — 2-3 paragraph summary of the session",
  "keyThemes": ["theme 1", "theme 2", ...],
  "progressNotes": "string — clinical observations formatted as a progress note",
  "actionItems": ["action 1", "action 2", ...],
  "concerns": ["concern 1", ...],
  "mood": {
    "affect": "string",
    "engagement": "string"
  }
}

Do NOT include markdown code fences or any text outside the JSON.`;

/**
 * Generate a clinical summary from a transcript using Claude (via Bedrock).
 */
export async function generateSummary(transcript: Transcript): Promise<SessionSummary> {
  const anthropic = getBedrockClient();

  const transcriptText = transcript.text || transcript.segments.map((s) => s.text).join(" ");

  const message = await anthropic.messages.create({
    model: MODELS.clinical,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Session transcript:\n\n${transcriptText}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Strip any markdown code fences if Claude included them anyway
  let json = textBlock.text.trim();
  json = json.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

  const parsed = JSON.parse(json) as SessionSummary;

  // Basic shape validation
  if (
    typeof parsed.overview !== "string" ||
    !Array.isArray(parsed.keyThemes) ||
    typeof parsed.progressNotes !== "string" ||
    !Array.isArray(parsed.actionItems) ||
    !Array.isArray(parsed.concerns) ||
    !parsed.mood
  ) {
    throw new Error("Invalid summary shape from Claude");
  }

  return parsed;
}

/**
 * Queue a summarization job for a session that has a completed transcript.
 * Non-blocking: triggers the pg-boss worker to process asynchronously.
 *
 * Idempotent by design: the multi-track merge path can call this multiple
 * times for the same session (once per `allDone=true` transition as tracks
 * get re-transcribed). Without a guard that means 3+ duplicate Sonnet
 * calls and 3+ duplicate DB writes for a single session.
 *
 * The guard is an atomic `updateMany` that only flips `"none"` or
 * `"failed"` to `"pending"`. Any other status (pending/generating/
 * completed) means a job is already in flight or done, and we skip.
 * Concurrent callers race on the same WHERE clause — exactly one wins
 * the update and proceeds to enqueue; all others see `count === 0` and
 * return.
 */
export async function queueSummarization(sessionId: string): Promise<void> {
  // Atomic claim: only fresh ("none") or previously-failed sessions can be queued.
  const claim = await prisma.telehealthSession.updateMany({
    where: {
      id: sessionId,
      summaryStatus: { in: ["none", "failed"] },
    },
    data: { summaryStatus: "pending" },
  });

  if (claim.count === 0) {
    logger.info(
      "Summarization skipped — already pending/generating/completed",
      `sessionId=${sessionId}`,
    );
    return;
  }

  try {
    const { getQueue } = await import("./queue");
    const boss = await getQueue();
    await boss.send("summarize-transcript", { sessionId }, {
      retryLimit: 2,
      retryDelay: 30,
      expireInMinutes: 15,
    });
    logger.info("Summarization queued", `sessionId=${sessionId}`);
  } catch (err) {
    // Roll back so a retry can re-acquire the claim.
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: { summaryStatus: "failed" },
    });
    throw err;
  }
}

/**
 * Generate and save a summary for a session.
 * Called by the pg-boss worker.
 */
export async function summarizeSession(sessionId: string): Promise<void> {
  const session = await prisma.telehealthSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.transcriptStatus !== "completed" || !session.transcript) {
    throw new Error(`Session not ready for summary: status=${session.transcriptStatus}`);
  }

  try {
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: { summaryStatus: "generating" },
    });

    const summary = await generateSummary(session.transcript as unknown as Transcript);

    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        summary: summary as any,
        summaryStatus: "completed",
        summarizedAt: new Date(),
      },
    });

    logger.info("Summary generated", `sessionId=${sessionId}`);
  } catch (err) {
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: { summaryStatus: "failed" },
    });
    // HIPAA: log only error type, never transcript content
    logger.error("Summary generation failed", err instanceof Error ? err.name : "unknown");
    throw err;
  }
}
