import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { authenticate, requireRole } from "../middleware/auth";
import { theme } from "@steady/shared";
import { getFileBuffer } from "../services/s3";
import { assertNoPhi, PhiDetectedError } from "../lib/phi-detector";

const router = Router();

router.use(authenticate, requireRole("CLINICIAN"));

function handleAiError(err: unknown, res: Response, context: string): void {
  if (err instanceof PhiDetectedError) {
    res.status(422).json({ success: false, error: err.message });
    return;
  }
  logger.error(`AI ${context} error`, err);
  res.status(500).json({ success: false, error: `Failed to ${context}. Please try again.` });
}

const STYLE_CONTEXTS: Record<string, string> = {
  general: "a healthcare professional providing patient education materials",
  exercise: "a physical therapist giving exercise instructions and movement guidance",
  nutrition: "a nutritionist providing dietary guidance and meal planning",
  mental_health: "a mental health professional providing therapeutic guidance and coping strategies",
  education: "a clinical educator providing learning materials for patients",
};

const SUPPORTED_TAGS = `<p>, <h1>, <h2>, <h3>, <h4>, <h5>, <h6>, <ul>, <ol>, <li>, <blockquote>, <strong>, <b>, <em>, <i>, <a href="...">, <hr>, <br>`;

/**
 * CSS variable names available in the app's theme.
 * Claude uses these in inline styles so the output is themeable.
 */
const CSS_VAR_REFERENCE = `
Available CSS custom properties (use these in inline style= attributes):
  --steady-teal: ${theme.teal} (primary brand color — links, accents, emphasis)
  --steady-teal-light: ${theme.tealLight}
  --steady-teal-dark: ${theme.tealDark}
  --steady-teal-bg: ${theme.tealBg} (light teal background for cards/callouts)
  --steady-sage: ${theme.sage} (success/completion green)
  --steady-sage-bg: ${theme.sageBg}
  --steady-rose: ${theme.rose} (warning/important accent)
  --steady-rose-bg: ${theme.roseBg}
  --steady-cream: ${theme.cream} (warm highlight background)
  --steady-cream-light: ${theme.creamLight}
  --steady-warm-50: ${theme.warm50} (lightest background)
  --steady-warm-100: ${theme.warm100} (borders, dividers)
  --steady-warm-200: ${theme.warm200} (subtle borders)
  --steady-warm-300: ${theme.warm300} (secondary text)
  --steady-warm-400: ${theme.warm400} (medium text)
  --steady-warm-500: ${theme.warm500} (primary text, near-black)
`;

function buildSystemPrompt(styleContext: string): string {
  return `You are a content formatter for a healthcare mobile app called Steady. Your job is to take raw clinician notes and transform them into clean, well-structured, visually styled HTML that renders beautifully in the app.

You are formatting content as ${STYLE_CONTEXTS[styleContext] || STYLE_CONTEXTS.general}.

THEME SYSTEM:
The app uses CSS custom properties for theming. You MUST use var() references in inline styles so the output adapts when the theme changes.
${CSS_VAR_REFERENCE}

HTML & STYLING RULES:
- Use these HTML tags: ${SUPPORTED_TAGS}
- You CAN also use <div> and <span> WITH inline style= attributes that reference the CSS variables above
- Do NOT use class attributes, external CSS, or hardcoded hex/rgb colors
- Always use var(--steady-*) for colors in style attributes
- Do NOT wrap the output in a code block or markdown
- Output ONLY the HTML, nothing else

DESIGN PATTERNS — use these to make content visually rich:
- Section headings: <h2 style="color: var(--steady-warm-500); border-bottom: 2px solid var(--steady-teal); padding-bottom: 4px;">
- Callout boxes: <div style="background: var(--steady-teal-bg); border-left: 3px solid var(--steady-teal); padding: 12px; border-radius: 8px; margin: 8px 0;">
- Tip/note boxes: <div style="background: var(--steady-cream); border-left: 3px solid var(--steady-rose); padding: 12px; border-radius: 8px; margin: 8px 0;">
- Important text: <span style="color: var(--steady-teal); font-weight: 600;">
- Warning text: <span style="color: var(--steady-rose); font-weight: 600;">
- Numbered steps: <div style="background: var(--steady-warm-50); padding: 12px; border-radius: 8px; margin: 6px 0;"><strong style="color: var(--steady-teal);">Step 1:</strong> ...</div>
- Separator with label: <div style="display: flex; align-items: center; gap: 8px; margin: 16px 0;"><hr style="flex: 1; border-color: var(--steady-warm-200);"><span style="color: var(--steady-warm-300); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Section</span><hr style="flex: 1; border-color: var(--steady-warm-200);"></div>

CONTENT GUIDELINES:
- Keep the content faithful to the original — do not add medical advice or change the meaning
- Make it scannable: short paragraphs, clear headings, bulleted lists where appropriate
- Use callout boxes for key takeaways, tips, or warnings
- Use numbered step boxes for sequential instructions
- If the content describes exercises, format each one with a heading, description, and any sets/reps as a list
- If the content describes meals or nutrition, organize by meal/category with clear structure
- Use <strong> for emphasis on key terms or instructions
- Use <blockquote> for quotes or important callouts (these get teal left-border styling automatically)
- Use <hr> to separate major sections`;
}

// POST /api/ai/style-content — Transform raw text into styled HTML
router.post("/style-content", async (req: Request, res: Response) => {
  try {
    const { rawContent } = req.body;
    const styleContext = "general";

    if (!rawContent || typeof rawContent !== "string" || rawContent.trim().length === 0) {
      res.status(400).json({ success: false, error: "rawContent is required" });
      return;
    }

    await assertNoPhi(rawContent, "style-content");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, error: "AI service not configured" });
      return;
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: buildSystemPrompt(styleContext),
      messages: [
        {
          role: "user",
          content: `Please format the following content into clean, beautifully styled HTML using the theme CSS variables:\n\n${rawContent}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const styledHtml = textBlock ? textBlock.text : "";

    res.json({ success: true, data: { styledHtml } });
  } catch (err) {
    handleAiError(err, res, "style content");
  }
});

// POST /api/ai/generate-tracker — Generate daily tracker fields from description
router.post("/generate-tracker", async (req: Request, res: Response) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      res.status(400).json({ success: false, error: "description is required" });
      return;
    }

    await assertNoPhi(description, "generate-tracker");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, error: "AI service not configured" });
      return;
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are a clinical tracker designer for Steady, a healthcare app for ADHD treatment. Generate daily tracker configurations from clinician descriptions.

Return ONLY valid JSON with this exact structure:
{
  "name": "<short tracker name, max 60 chars>",
  "description": "<1-2 sentence description for the participant>",
  "fields": [
    {
      "label": "<field label>",
      "fieldType": "SCALE" | "NUMBER" | "YES_NO" | "MULTI_CHECK" | "FREE_TEXT" | "TIME",
      "options": <null for YES_NO/FREE_TEXT/TIME/NUMBER, or {"min": N, "max": N, "minLabel": "...", "maxLabel": "..."} for SCALE, or {"choices": ["..."]} for MULTI_CHECK>,
      "sortOrder": <0-based index>,
      "isRequired": true
    }
  ]
}

Field type guidelines:
- SCALE: Rating scales (mood 1-10, pain 1-10, energy 1-5). Always include min, max, minLabel, maxLabel.
- NUMBER: Numeric values (hours slept, steps walked, glasses of water).
- YES_NO: Binary questions (took medication? exercised today?).
- MULTI_CHECK: Multiple-selection checkboxes (which symptoms today?, which coping skills used?).
- FREE_TEXT: Open text (notes, reflections, triggers).
- TIME: Time values (bedtime, wake time, medication time).

Design guidelines:
- Keep trackers focused: 4-8 fields max.
- Start with the most important metric.
- Use SCALE for subjective ratings, NUMBER for countable things.
- Include at least one FREE_TEXT for notes/reflections when appropriate.
- Use clinical best practices for the condition described.
- Write labels in plain, patient-friendly language.`,
      messages: [
        {
          role: "user",
          content: `Design a daily tracker for: ${description}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    let rawJson = textBlock?.text || "";
    rawJson = rawJson.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let result: any;
    try {
      result = JSON.parse(rawJson);
    } catch {
      logger.error("AI generate-tracker returned invalid JSON");
      res.status(500).json({ success: false, error: "AI returned invalid content. Try again." });
      return;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    handleAiError(err, res, "generate tracker");
  }
});

// POST /api/ai/generate-part — Generate structured part content from raw text
router.post("/generate-part", async (req: Request, res: Response) => {
  try {
    const { partType, rawInput } = req.body;

    if (!partType || typeof partType !== "string") {
      res.status(400).json({ success: false, error: "partType is required" });
      return;
    }
    if (!rawInput || typeof rawInput !== "string" || rawInput.trim().length === 0) {
      res.status(400).json({ success: false, error: "rawInput is required" });
      return;
    }

    await assertNoPhi(rawInput, "generate-part");

    const schema = PART_SCHEMAS[partType];
    if (!schema) {
      res.status(400).json({ success: false, error: `Unsupported part type: ${partType}` });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, error: "AI service not configured" });
      return;
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: GENERATE_PART_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a ${partType} part from the following input. Return ONLY valid JSON matching the schema.\n\nPart type: ${partType}\nSchema: ${schema}\n\nUser input:\n${rawInput}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    let rawJson = textBlock?.text || "";

    // Strip markdown code fences if present
    rawJson = rawJson.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let content: any;
    try {
      content = JSON.parse(rawJson);
    } catch {
      logger.error("AI generate-part returned invalid JSON");
      res.status(500).json({ success: false, error: "AI returned invalid content. Try again." });
      return;
    }

    // Also generate a suggested title
    let title: string | undefined;
    if (content._title) {
      title = content._title;
      delete content._title;
    }

    res.json({ success: true, data: { content, title } });
  } catch (err) {
    handleAiError(err, res, "generate part");
  }
});

const GENERATE_PART_SYSTEM_PROMPT = `You are a content generator for Steady, a clinical healthcare app for ADHD treatment. Clinicians give you rough notes and you generate structured JSON content for different part types.

CRITICAL RULES:
- Return ONLY valid JSON. No markdown, no explanation, no code fences.
- The JSON must match the schema provided exactly.
- Include a "_title" field with a suggested short title for the part (max 60 chars).
- Be thorough — generate complete, clinically appropriate content from the notes.
- If the input is sparse, expand it intelligently based on clinical best practices.
- Use warm, encouraging, patient-friendly language in all content.

For STYLED_CONTENT: generate styledHtml using these CSS variables in inline styles:
  var(--steady-teal) — primary accent, links
  var(--steady-teal-bg) — light teal callout background
  var(--steady-rose) — warning accent
  var(--steady-cream) — warm highlight background
  var(--steady-warm-50) — lightest background
  var(--steady-warm-500) — primary text
Use <h2>, <h3>, <p>, <ul>, <li>, <div> with inline styles for callout boxes, step boxes, and themed headings. Make it visually rich.

For HOMEWORK items, use EXACTLY these field names for each type:
- ACTION: { type: "ACTION", sortOrder: N, description: "what to do", subSteps: ["step1", "step2"], addToSteadySystem: false, dueDateOffsetDays: null }
- JOURNAL_PROMPT: { type: "JOURNAL_PROMPT", sortOrder: N, prompts: ["prompt 1", "prompt 2"], spaceSizeHint: "small"|"medium"|"large" }
- WORKSHEET: { type: "WORKSHEET", sortOrder: N, instructions: "what to fill in", columns: [{ label: "Col", description: "desc" }], rowCount: 5, tips: "optional" }
- CHOICE: { type: "CHOICE", sortOrder: N, description: "the question", options: [{ label: "A", detail: "optional" }] }
- RESOURCE_REVIEW: { type: "RESOURCE_REVIEW", sortOrder: N, resourceTitle: "title", resourceType: "handout"|"video"|"link"|"audio"|"pdf", resourceUrl: "" }
- RATING_SCALE: { type: "RATING_SCALE", sortOrder: N, description: "what to rate", min: 1, max: 10, minLabel: "Low", maxLabel: "High" }
- TIMER: { type: "TIMER", sortOrder: N, description: "what to do", durationSeconds: 300 } — MUST use durationSeconds (integer, seconds), NOT durationMinutes
- MOOD_CHECK: { type: "MOOD_CHECK", sortOrder: N, description: "optional prompt", moods: [{ emoji: "😊", label: "Great" }, { emoji: "😐", label: "Okay" }, { emoji: "😢", label: "Struggling" }], includeNote: false }
- HABIT_TRACKER: { type: "HABIT_TRACKER", sortOrder: N, description: "what habit to track", habitLabel: "Did you do X?" } — MUST use habitLabel, NOT habitDescription
- BRING_TO_SESSION: { type: "BRING_TO_SESSION", sortOrder: N, reminderText: "what to bring" }
- FREE_TEXT_NOTE: { type: "FREE_TEXT_NOTE", sortOrder: N, content: "the text" }
IMPORTANT: Do NOT add a "title" field to homework items — the item type and description are sufficient. Do NOT invent field names that aren't listed above.

For ASSESSMENT questions, use types: LIKERT (scale), MULTIPLE_CHOICE (options), FREE_TEXT (open), YES_NO.`;

const PART_SCHEMAS: Record<string, string> = {
  STYLED_CONTENT: `{ type: "STYLED_CONTENT", rawContent: "<plain text version>", styledHtml: "<styled HTML with CSS vars>" }`,
  VIDEO: `{ type: "VIDEO", url: "<youtube/vimeo/loom URL>", provider: "youtube"|"vimeo"|"loom", transcriptUrl?: "<optional>" }`,
  STRATEGY_CARDS: `{ type: "STRATEGY_CARDS", deckName: "<deck title>", cards: [{ title: "<card title>", body: "<card body text>", emoji: "<single emoji>" }] }`,
  JOURNAL_PROMPT: `{ type: "JOURNAL_PROMPT", prompts: ["<prompt 1>", "<prompt 2>", ...], spaceSizeHint: "small"|"medium"|"large" }`,
  CHECKLIST: `{ type: "CHECKLIST", items: [{ text: "<item text>", sortOrder: <number> }] }`,
  RESOURCE_LINK: `{ type: "RESOURCE_LINK", url: "<URL>", description: "<description>", resourceType?: "file"|"link"|"audio" }`,
  DIVIDER: `{ type: "DIVIDER", label: "<optional label text>" }`,
  HOMEWORK: `{ type: "HOMEWORK", dueTimingType: "BEFORE_NEXT_SESSION"|"SPECIFIC_DATE"|"DAYS_AFTER_UNLOCK", dueTimingValue: null, completionRule: "ALL"|"X_OF_Y", completionMinimum: null|<number>, reminderCadence: "DAILY"|"EVERY_OTHER_DAY"|"MID_WEEK", items: [{ type: "<item type>", sortOrder: <n>, ...type-specific fields }] }`,
  ASSESSMENT: `{ type: "ASSESSMENT", title: "<title>", instructions: "<instructions>", scoringEnabled: false, questions: [{ question: "<text>", type: "LIKERT"|"MULTIPLE_CHOICE"|"FREE_TEXT"|"YES_NO", options?: ["<opt>"], likertMin?: <n>, likertMax?: <n>, likertMinLabel?: "<label>", likertMaxLabel?: "<label>", required: true, sortOrder: <n> }] }`,
  INTAKE_FORM: `{ type: "INTAKE_FORM", title: "<title>", instructions: "<instructions>", sections: ["<section names>"], fields: [{ label: "<label>", type: "TEXT"|"TEXTAREA"|"SELECT"|"MULTI_SELECT"|"DATE"|"NUMBER"|"CHECKBOX", placeholder?: "<hint>", options?: ["<opt>"], required: true|false, section: "<section name>", sortOrder: <n> }] }`,
  SMART_GOALS: `{ type: "SMART_GOALS", instructions: "<instructions for the participant>", maxGoals: <number 1-5>, categories: ["DAILY_ROUTINE","WORK","RELATIONSHIPS","HEALTH","SELF_CARE","OTHER"], goals: [] }`,
  PDF: `{ type: "PDF", fileKey: "", url: "", fileName: "", description: "<description of what the PDF contains>" }`,
};

// POST /api/ai/parse-homework-pdf — Extract homework items from a PDF
router.post("/parse-homework-pdf", async (req: Request, res: Response) => {
  try {
    const { fileKey } = req.body;

    if (!fileKey || typeof fileKey !== "string") {
      res.status(400).json({ success: false, error: "fileKey is required" });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, error: "AI service not configured" });
      return;
    }

    // Download PDF from S3
    const pdfBuffer = await getFileBuffer(fileKey);
    const pdfBase64 = pdfBuffer.toString("base64");

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: `You are a clinical content parser for a healthcare app called Steady. Your job is to analyze PDF worksheets and homework assignments used by clinicians (typically CBT, DBT, or other therapeutic exercises) and convert them into structured homework items.

You MUST output ONLY a valid JSON array of homework items. No markdown, no explanation, no code fences — just the JSON array.

Each item must have a "type" field and a "sortOrder" field (0-indexed, sequential). Use these types:

1. ACTION — A task the participant should do. Fields:
   { "type": "ACTION", "sortOrder": N, "description": "what to do", "subSteps": ["step 1", "step 2"], "addToSteadySystem": false, "dueDateOffsetDays": null }
   Use when: the PDF describes a specific action, exercise, or activity to perform.

2. JOURNAL_PROMPT — Reflective writing prompts. Fields:
   { "type": "JOURNAL_PROMPT", "sortOrder": N, "prompts": ["prompt 1", "prompt 2"], "spaceSizeHint": "medium" }
   Use when: the PDF asks questions for reflection, self-examination, or journaling. Use "large" spaceSizeHint for prompts that need extended writing.

3. WORKSHEET — A structured table for tracking/recording. Fields:
   { "type": "WORKSHEET", "sortOrder": N, "instructions": "what to fill in", "columns": [{ "label": "Column Name", "description": "what goes here" }], "rowCount": 5, "tips": "optional tips" }
   Use when: the PDF has a table, grid, or fill-in-the-blank structure with repeated rows.

4. FREE_TEXT_NOTE — Informational text or instructions from the clinician. Fields:
   { "type": "FREE_TEXT_NOTE", "sortOrder": N, "content": "the text" }
   Use when: the PDF has instructional text, tips, explanations, or context that isn't an action or prompt. Good for section introductions, tips, and psychoeducation content.

5. BRING_TO_SESSION — Reminder to bring something to next session. Fields:
   { "type": "BRING_TO_SESSION", "sortOrder": N, "reminderText": "what to bring" }
   Use when: the PDF explicitly mentions bringing something to a session or discussing results with a therapist.

6. CHOICE — Multiple choice selection. Fields:
   { "type": "CHOICE", "sortOrder": N, "description": "the question", "options": [{ "label": "Option A", "detail": "optional detail" }, { "label": "Option B" }] }
   Use when: the PDF has a multiple-choice question or selection exercise.

GUIDELINES:
- Break the PDF into logical sections, each becoming one or more items.
- Use FREE_TEXT_NOTE for section titles, tips, and explanatory content — keep them concise.
- Preserve the clinical intent and language of the original.
- For numbered exercises with sub-questions, use ACTION for the main task and JOURNAL_PROMPT for the reflection questions, OR combine into a single JOURNAL_PROMPT if they're all reflective.
- For fill-in-the-blank sections with repeated structure, use WORKSHEET.
- If the PDF mentions reviewing results with a therapist, add a BRING_TO_SESSION item.
- Keep descriptions under 2000 characters. Keep prompts under 2000 characters each.
- Tips text should be under 2000 characters.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: "Parse this PDF into structured homework items. Output ONLY the JSON array.",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const rawJson = textBlock ? textBlock.text.trim() : "[]";

    // Parse and validate the JSON
    let items: unknown[];
    try {
      const parsed = JSON.parse(rawJson);
      if (!Array.isArray(parsed)) {
        throw new Error("Expected an array");
      }
      items = parsed;
    } catch {
      logger.error("AI returned invalid JSON for homework PDF parse");
      res.status(500).json({ success: false, error: "Failed to parse PDF content" });
      return;
    }

    // Re-index sortOrder to be sequential
    items = items.map((item: any, i: number) => ({ ...item, sortOrder: i }));

    res.json({ success: true, data: { items } });
  } catch (err) {
    handleAiError(err, res, "parse PDF");
  }
});

export default router;
