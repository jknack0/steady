import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireRole("CLINICIAN"));

const STYLE_CONTEXTS: Record<string, string> = {
  general: "a healthcare professional providing patient education materials",
  exercise: "a physical therapist giving exercise instructions and movement guidance",
  nutrition: "a nutritionist providing dietary guidance and meal planning",
  mental_health: "a mental health professional providing therapeutic guidance and coping strategies",
  education: "a clinical educator providing learning materials for patients",
};

const SUPPORTED_TAGS = `<p>, <h1>, <h2>, <h3>, <h4>, <h5>, <h6>, <ul>, <ol>, <li>, <blockquote>, <strong>, <b>, <em>, <i>, <a href="...">, <hr>, <br>`;

function buildSystemPrompt(styleContext: string): string {
  return `You are a content formatter for a healthcare mobile app. Your job is to take raw clinician notes and transform them into clean, well-structured HTML that renders beautifully in the app.

You are formatting content as ${STYLE_CONTEXTS[styleContext] || STYLE_CONTEXTS.general}.

IMPORTANT CONSTRAINTS:
- Only use these HTML tags: ${SUPPORTED_TAGS}
- Do NOT use inline styles, classes, divs, spans, tables, or images
- Do NOT wrap the output in a code block or markdown
- Output ONLY the HTML, nothing else
- Use semantic headings (h2, h3) to organize sections
- Use <strong> for emphasis on key terms or instructions
- Use <ul>/<ol> for lists of items, steps, or options
- Use <blockquote> for important callouts, tips, or warnings
- Use <hr> to separate major sections
- Keep the content faithful to the original — do not add medical advice or change the meaning
- Make it scannable: short paragraphs, clear headings, bulleted lists where appropriate
- If the content describes exercises, format each one with a heading, description, and any sets/reps as a list
- If the content describes meals or nutrition, organize by meal/category with clear structure`;
}

// POST /api/ai/style-content — Transform raw text into styled HTML
router.post("/style-content", async (req: Request, res: Response) => {
  try {
    const { rawContent, styleContext = "general" } = req.body;

    if (!rawContent || typeof rawContent !== "string" || rawContent.trim().length === 0) {
      res.status(400).json({ success: false, error: "rawContent is required" });
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
      max_tokens: 4096,
      system: buildSystemPrompt(styleContext),
      messages: [
        {
          role: "user",
          content: `Please format the following content into clean, structured HTML:\n\n${rawContent}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const styledHtml = textBlock ? textBlock.text : "";

    res.json({ success: true, data: { styledHtml } });
  } catch (err) {
    console.error("AI style-content error:", err);
    res.status(500).json({ success: false, error: "Failed to style content" });
  }
});

export default router;
