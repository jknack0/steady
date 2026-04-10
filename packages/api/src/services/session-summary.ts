/**
 * Session Summary Service
 *
 * Uses Claude to generate clinical notes from a session transcript.
 * Output: structured JSON with overview, key themes, action items, etc.
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic | null {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}

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
 * Generate a clinical summary from a transcript using Claude.
 */
export async function generateSummary(transcript: Transcript): Promise<SessionSummary> {
  const anthropic = getAnthropic();
  if (!anthropic) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const transcriptText = transcript.text || transcript.segments.map((s) => s.text).join(" ");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
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
 */
export async function queueSummarization(sessionId: string): Promise<void> {
  const { getQueue } = await import("./queue");
  const boss = await getQueue();

  await boss.send("summarize-transcript", { sessionId }, {
    retryLimit: 2,
    retryDelay: 30,
    expireInMinutes: 15,
  });

  await prisma.telehealthSession.update({
    where: { id: sessionId },
    data: { summaryStatus: "pending" },
  });

  logger.info("Summarization queued", `sessionId=${sessionId}`);
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
