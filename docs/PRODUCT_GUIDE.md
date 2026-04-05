# Steady with ADHD — Product Guide

A HIPAA-compliant clinical platform for therapists and healthcare providers to build structured treatment programs for their patients.

## Overview

Steady has two sides:
- **Web App (Clinician Dashboard)** — Where therapists build programs, manage clients, and preview content
- **Mobile App (Participant)** — Where patients work through their assigned programs

---

## Architecture

```mermaid
graph TB
    subgraph "Clinician"
        WEB[Web App<br/>Next.js]
    end
    subgraph "Participant"
        MOB[Mobile App<br/>Expo / React Native]
    end
    subgraph "Backend"
        API[Express API<br/>Port 4000]
        DB[(PostgreSQL)]
        AI[Claude API<br/>Content Styling]
    end
    WEB --> API
    MOB --> API
    API --> DB
    API --> AI
```

---

## Demo Accounts

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | `admin@admin.com` | `Admin1` | Full access clinician |
| Clinician | `jo@jo.com` | `Jo1` | Therapist with 3 ADHD clients |
| Clinician | `jim@jim.com` | `Jim1` | Physical therapist with 3 clients |
| Participant | `test@test.com` | `Test1` | Enrolled in the demo program |

---

## Web App — Clinician Dashboard

### Programs List

The main dashboard shows all programs the clinician has created. Each program represents a treatment plan for a specific client.

<!-- Screenshot: /programs page showing program cards -->

```
┌─────────────────────────────────────────────┐
│  My Programs                          [+ New]│
├─────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐   │
│  │ Sarah M. — CBT for ADHD   published │   │
│  │ 8 modules · 3 enrolled              │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ David K. — Executive Function  draft │   │
│  │ 6 modules · 1 enrolled              │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Program Editor

Each program contains modules (sessions/weeks) and each module contains parts (content blocks).

<!-- Screenshot: /programs/[id] page -->

```
┌─────────────────────────────────────────────────┐
│ ← Back to Programs                              │
│                                                 │
│ Sarah M. — CBT for ADHD  [published] [Preview]  │
│ Weekly cognitive behavioral therapy program      │
│                                                 │
│ ▼ Settings                                      │
│   Cadence: Weekly · Enrollment: Invite Only     │
│                                                 │
│ ═══ Modules ════════════════════════════════    │
│ ⠿ Week 1: Introduction & Baseline        4 pts │
│ ⠿ Week 2: Understanding Your ADHD        6 pts │
│ ⠿ Week 3: Time Management Strategies     5 pts │
│ ⠿ Week 4: Organization Systems           7 pts │
│                                    [+ Module]   │
│                                                 │
│ ═══ Enrollments ═══════════════════════════     │
│ Sarah M. · Active · Module 2                    │
└─────────────────────────────────────────────────┘
```

### Module Editor

Modules contain an ordered list of parts. Each part is a different content type that the participant interacts with.

<!-- Screenshot: /programs/[id]/modules/[moduleId] page -->

```
┌──────────────────────────────────────────────────┐
│ ← Back to Program                     [Preview]  │
│                                                  │
│ Week 1: Introduction & Baseline                  │
│ Getting started with your ADHD journey           │
│                                                  │
│ ┌─ 📄 Text ──────────────────── [Reading] ───┐  │
│ │  Welcome to Your Program                    │  │
│ │  [Rich text editor with formatting toolbar] │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
│ ┌─ 🎯 SMART Goals ────────── [SMART Goals] ──┐  │
│ │  Set your first therapy goals               │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
│ ┌─ ✅ Checklist ──────────── [Checklist] ─────┐  │
│ │  Pre-session preparation                    │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
│                              [+ Add Part ▼]      │
└──────────────────────────────────────────────────┘
```

### Part Types

Steady supports 12 content types:

| Type | Icon | Purpose |
|------|------|---------|
| **Text** | 📄 | Rich formatted content (WYSIWYG editor) |
| **Video** | 🎬 | Embedded YouTube, Vimeo, or Loom videos |
| **Strategy Cards** | 🃏 | Swipeable card deck with tips/strategies |
| **Journal Prompt** | 📖 | Reflective writing prompts with response areas |
| **Checklist** | ✅ | Trackable to-do items with progress bar |
| **Resource Link** | 🔗 | External resource with description |
| **Divider** | ➖ | Visual section separator |
| **Homework** | 📋 | Multi-item assignments (actions, reviews, choices) |
| **Assessment** | ❓ | Surveys with Likert, multiple choice, yes/no, free text |
| **Intake Form** | 📝 | Structured forms with sections and field types |
| **SMART Goals** | 🎯 | Goal-setting framework (Specific, Measurable, etc.) |
| **Styled Content** | ✨ | AI-formatted content using the app's theme |

### Styled Content (AI-Powered)

The Styled Content part type lets clinicians paste raw notes and have Claude AI format them into beautifully styled HTML that matches the app's theme.

```mermaid
sequenceDiagram
    participant C as Clinician
    participant W as Web Editor
    participant A as API
    participant AI as Claude API

    C->>W: Paste raw content
    C->>W: Click "Style with AI"
    W->>A: POST /api/ai/style-content
    A->>AI: Raw content + theme CSS vars
    AI->>A: Styled HTML with var(--steady-*)
    A->>W: { styledHtml }
    W->>C: Preview rendered content
```

**How it works:**
1. Add a "Styled Content" part to any module
2. Paste or type your content (bullet points, notes, instructions — anything)
3. Click **Style with AI**
4. Claude formats it with headings, callout boxes, numbered steps — all using the app's theme colors
5. Toggle **Preview** to see how it looks
6. The styled HTML uses CSS variables (`var(--steady-teal)`, `var(--steady-cream)`, etc.) so changing the theme updates everything

### Program Preview

Preview how participants will see the program on their mobile device — without leaving the editor.

<!-- Screenshot: Preview modal with phone mockup -->

```
┌──────────────────────────────────────────┐
│              ┌─────────────┐             │
│              │   9:41    🔋│             │
│              │             │             │
│              │ Sarah M.    │             │
│              │ Weekly      │             │
│              │             │             │
│              │ ┌─────────┐ │             │
│              │ │▶ Week 1 │ │             │
│  dark        │ │ ━━━ 0/4 │ │  dark      │
│  backdrop    │ └─────────┘ │  backdrop   │
│  (click to   │ ┌─────────┐ │  (click to  │
│   close)     │ │🔒Week 2 │ │   close)   │
│              │ └─────────┘ │             │
│              │             │             │
│              │   ━━━━━━    │             │
│              └─────────────┘             │
└──────────────────────────────────────────┘
```

**Access Preview from:**
- **Program page** → Preview button (top right)
- **Module editor** → Preview button (top right)
- **Part card** → Three-dot menu → Preview (opens directly to that part)

**Inside the preview:**
- Click any part to see its full mobile rendering
- "Back" button returns to the module list
- Shows "Mark as Complete" button (visual only)
- Phone scales proportionally to fit any screen size

---

## Mobile App — Participant Experience

### Program Flow

```mermaid
graph LR
    A[Programs List] --> B[Program Detail]
    B --> C[Module List]
    C --> D[Part Detail]
    D --> E[Complete Part]
    E --> C
    C --> F[Module Complete]
    F --> G[Next Module Unlocks]
```

### Module States

| State | Visual | Description |
|-------|--------|-------------|
| **Current** | Blue border + "Current" badge | Active module, parts accessible |
| **Unlocked** | Play icon | Available but not started |
| **Locked** | Lock icon, 40% opacity | Sequential unlock — complete previous first |
| **Completed** | Green check | All required parts done |

### Part Rendering

Each part type has a themed mobile renderer:

- **Text / Styled Content** — Rich HTML with themed headings, links, blockquotes
- **Video** — Teal play button + "Watch Video" CTA
- **Strategy Cards** — Swipeable carousel with dot indicators and chevron navigation
- **Journal Prompt** — Prompts with text input areas (small/medium/large)
- **Checklist** — Progress bar + checkboxes with green completion indicators
- **Resource Link** — Card with teal icon, description, and "Open" button
- **Homework** — Cream-colored cards with type badges, substeps, and choice options
- **Assessment** — Question cards with Likert scales, radio buttons, yes/no pills
- **Intake Form** — Sectioned forms with teal dividers and various field types
- **SMART Goals** — Warm background cards with goal framework fields

---

## Theme System

All colors are defined as CSS custom properties and shared across web, mobile, and AI output:

```
Brand Colors:
  --steady-teal:       #5B8A8A  (primary — links, buttons, accents)
  --steady-teal-bg:    #E3EDED  (light teal background)
  --steady-sage:       #8FAE8B  (success/completion)
  --steady-sage-bg:    #E8F0E7  (light green background)
  --steady-rose:       #D4A0A0  (warnings, required indicators)
  --steady-cream:      #F5ECD7  (warm highlight background)
  --steady-sky:        #89B4C8  (current/active indicator)

Neutral Scale:
  --steady-warm-50:    #F7F5F2  (page background)
  --steady-warm-100:   #F0EDE8  (borders, dividers)
  --steady-warm-200:   #D4D0CB  (input borders)
  --steady-warm-300:   #8A8A8A  (secondary text)
  --steady-warm-400:   #5A5A5A  (medium text)
  --steady-warm-500:   #2D2D2D  (primary text)
```

**Single source of truth:** `packages/shared/src/theme.ts`

To re-theme the app, update the values in:
1. `packages/shared/src/theme.ts` (mobile + API)
2. `apps/web/src/app/globals.css` (web CSS variables)
3. `apps/web/tailwind.config.ts` + `apps/mobile/tailwind.config.js` (Tailwind utilities)

---

## Data Model

```mermaid
erDiagram
    CLINICIAN ||--o{ PROGRAM : creates
    PROGRAM ||--o{ MODULE : contains
    MODULE ||--o{ PART : contains
    PROGRAM ||--o{ ENROLLMENT : has
    PARTICIPANT ||--o{ ENROLLMENT : enrolled_in
    ENROLLMENT ||--o{ PART_PROGRESS : tracks
    PART ||--o{ PART_PROGRESS : tracked_by

    PROGRAM {
        string title
        string description
        enum cadence
        enum status
    }
    MODULE {
        string title
        int sortOrder
        enum unlockRule
    }
    PART {
        enum type
        string title
        json content
        bool isRequired
        int sortOrder
    }
    ENROLLMENT {
        enum status
        string currentModuleId
    }
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/register` | Register |
| `GET` | `/api/programs` | List clinician's programs |
| `GET` | `/api/programs/:id` | Get program with modules |
| `GET` | `/api/programs/:id/preview` | Get program with all parts (for preview) |
| `POST` | `/api/programs` | Create program |
| `PUT` | `/api/programs/:id` | Update program |
| `GET` | `/api/programs/:id/modules` | List modules |
| `POST` | `/api/programs/:id/modules` | Create module |
| `GET` | `/api/.../parts` | List parts for a module |
| `POST` | `/api/.../parts` | Create part |
| `PUT` | `/api/.../parts/:id` | Update part |
| `PUT` | `/api/.../parts/reorder` | Reorder parts |
| `POST` | `/api/ai/style-content` | AI-style raw content |
| `GET` | `/api/participant/programs/:enrollmentId` | Get enrolled program (mobile) |
| `POST` | `/api/participant/progress/part/:partId` | Mark part complete (mobile) |

---

## Getting Started

```bash
# Start the database
docker compose up -d

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed demo data
cd packages/db && npx prisma db seed

# Start all apps
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Mobile: Expo Go app (scan QR code from terminal)

### Environment Variables

```env
# packages/api/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/steady_adhd
JWT_SECRET=your-secret-here
ANTHROPIC_API_KEY=sk-ant-...  # Required for Styled Content AI

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Monorepo Structure

```
apps/
  web/              → Next.js 14 clinician dashboard (port 3000)
  mobile/           → Expo React Native participant app

packages/
  api/              → Express API server (port 4000)
  db/               → Prisma schema + client singleton
  shared/           → Zod schemas, TypeScript types, theme constants
```
