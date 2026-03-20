import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { authenticate, requireRole } from "../middleware/auth";
import { theme } from "@steady/shared";

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
    console.error("AI style-content error:", err);
    res.status(500).json({ success: false, error: "Failed to style content" });
  }
});

export default router;
