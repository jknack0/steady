# Plan: STYLED_CONTENT Part Type

## Overview
New part type where clinicians input raw content (notes, instructions, etc.) and hit a button to have Claude API transform it into themed, styled HTML that renders beautifully on mobile using the existing custom HTML parser.

## Architecture

**Flow:**
1. Clinician types raw content in a textarea
2. Clicks "Style it" → API call to `/api/ai/style-content`
3. API sends raw text + theme tokens to Claude API → returns styled HTML
4. Styled HTML stored in part content alongside raw text
5. Mobile renders via existing `part-renderers.tsx` HTML parser
6. Web shows a preview of the styled output

## Changes by Layer

### 1. Prisma Schema (`packages/db/prisma/schema.prisma`)
- Add `STYLED_CONTENT` to the `PartType` enum
- Run `db:generate` + `db:push`

### 2. Shared Schemas (`packages/shared/src/schemas/part.ts`)
- Add `StyledContentSchema`:
  ```
  {
    type: "STYLED_CONTENT",
    rawContent: string,        // clinician's original input
    styledHtml: string,        // Claude-generated HTML
    styleContext?: string       // optional hint: "exercise program", "nutrition guide", etc.
  }
  ```
- Add to `PartContentSchema` discriminated union
- Add to `PartTypeEnum`

### 3. API — New AI Endpoint (`packages/api/src/routes/ai.ts`)
- `POST /api/ai/style-content`
  - Auth required (clinician only)
  - Body: `{ rawContent: string, styleContext?: string }`
  - Calls Claude API with a system prompt containing the mobile theme tokens (colors, fonts, spacing) and instructions to produce clean semantic HTML
  - Returns `{ styledHtml: string }`
- System prompt will include:
  - The app's color palette (teal `#5B8A8A`, sage `#8FAE8B`, cream `#F5ECD7`, warm grays)
  - Font guidance (Plus Jakarta Sans)
  - Supported HTML tags (what the mobile parser handles): `<p>`, `<h1>`-`<h6>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`, `<strong>`, `<em>`, `<a>`, `<hr>`
  - Content type context if provided (e.g., "format as physical therapy exercises")
- Register route in `packages/api/src/index.ts`

### 4. Web Editor (`apps/web/src/components/part-editors/styled-content-editor.tsx`)
- Left side: `<textarea>` for raw content input + optional "Content type" dropdown (exercise, nutrition, general, etc.)
- "Style with AI" button → calls `/api/ai/style-content`
- Right side / below: HTML preview panel (rendered with `dangerouslySetInnerHTML` + scoped styles matching the mobile theme)
- "Regenerate" button to re-style after edits
- Loading state while Claude processes
- Calls `onChange` with updated `{ rawContent, styledHtml, styleContext }`

### 5. Wire Up Web (`apps/web`)
- `part-card.tsx`: Add `STYLED_CONTENT` case to `renderEditor` switch
- Module page: Add default content for `STYLED_CONTENT`
- Part type config: Add label, icon, description

### 6. Mobile Renderer (`apps/mobile/components/part-renderers.tsx`)
- Add `StyledContentRenderer` — simply feeds `styledHtml` through the existing `parseHtmlToBlocks` → `RichTextContent` pipeline
- Add case to the part type switch in `lib/program-components.tsx`

### 7. API Hook (`apps/web/src/hooks/`)
- Add `useStyleContent` mutation hook that calls `/api/ai/style-content`

## Implementation Order
1. Prisma enum + generate
2. Shared Zod schema
3. API AI endpoint
4. Web hook
5. Web editor component
6. Wire up web (part-card, module page, config)
7. Mobile renderer

## Dependencies
- `@anthropic-ai/bedrock-sdk` installed in `packages/api`
- AWS credentials with `bedrock:InvokeModel` permission (IAM instance role in prod/dev, `~/.aws/credentials` or `AWS_*` env vars locally)

## What the Mobile Parser Already Supports
The existing HTML parser in `part-renderers.tsx` handles: `<p>`, `<h1>`-`<h6>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`, `<br>`, `<hr>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<a>`. Claude's system prompt will be constrained to only emit these tags so the output renders perfectly without any parser changes.
