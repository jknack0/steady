# STEADY with ADHD

A HIPAA-compliant clinical platform for delivering structured treatment programs to patients. Originally built for ADHD therapy, the platform is designed to work across any discipline where a clinician assigns between-session work to patients — physical therapy, nutrition counseling, cardiology, and more.

Clinicians build programs in a web-based CAS (Clinical Authoring System). Patients consume programs, complete homework, and manage their daily routines through a mobile app.

## Architecture

Turborepo monorepo with four packages:

```
apps/web          → Next.js 14 clinician dashboard (port 3000)
apps/mobile       → Expo React Native participant app
packages/api      → Express + TypeScript API server (port 4000)
packages/db       → Prisma schema + client singleton (PostgreSQL)
packages/shared   → Zod schemas, TypeScript types, constants
```

### Key Tech

- **Frontend:** Next.js 14 (App Router), TanStack Query, shadcn/ui, @dnd-kit for drag-and-drop, Tiptap rich text editor
- **Mobile:** Expo (React Native), Expo Router, TanStack Query, Expo Notifications
- **API:** Express, JWT auth, Zod validation, role-based access (CLINICIAN / PARTICIPANT / ADMIN)
- **Database:** PostgreSQL via Prisma ORM
- **Notifications:** Expo Push Notifications + pg-boss job queue

## Core Concepts

**Program** — A treatment plan created by a clinician for a specific patient. Contains modules.

**Module** — A unit of work between sessions (typically one week). Contains parts. Modules unlock sequentially as the clinician marks sessions complete.

**Part** — A piece of content within a module. 11 types supported:
- TEXT, VIDEO, STRATEGY_CARDS, JOURNAL_PROMPT, CHECKLIST, RESOURCE_LINK, DIVIDER, HOMEWORK, ASSESSMENT, INTAKE_FORM, SMART_GOALS

**Enrollment** — Links a participant to a program. Tracks progress through modules and parts.

**Steady System** — The participant's daily tools: task list, calendar, and journal. These work independently of any program.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- npm

### Setup

```bash
# Clone and install
git clone <repo-url>
cd steady
npm install

# Start PostgreSQL
docker compose up -d

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Push schema and seed
npm run db:generate
npm run db:push
cd packages/db && npx prisma db seed && cd ../..

# Start dev servers
npm run dev
```

### Common Commands

```bash
npm run dev              # Start all apps + packages in parallel
npm run build            # Production build
npm run lint             # Lint all packages
npm run typecheck        # Type-check all packages
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:push          # Push schema changes to dev database
docker compose up -d     # Start PostgreSQL
```

## Demo Accounts

The seed script creates six clinician accounts across different specialties, each with realistic patient programs and homework. All accounts are accessible at the web dashboard.

### Admin

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@admin.com | Admin1 | Clinician | Platform admin. Owns the "Steady with ADHD" template program (9 modules). |

### Test Participant

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| test@test.com | Test1 | Participant | Enrolled in the admin's Steady with ADHD program. |

---

### Jo Rivera, LCSW — ADHD Therapist

**Email:** jo@jo.com | **Password:** Jo1

Rivera ADHD Therapy. Jo is a licensed clinical social worker specializing in ADHD treatment for adults. Each program is a client, each module is a week between therapy sessions.

| Program (Client) | Description | Modules |
|-------------------|-------------|---------|
| **Sarah M.** | 20yo college junior. Diagnosed at 18. Focus issues, procrastination, test anxiety. On Adderall 20mg XR. | 4 weeks: Study environment & focus baseline → Breaking down assignments → Test prep & anxiety → Building a weekly routine |
| **David K.** | 34yo software engineer. Diagnosed 2 years ago. Emotional reactivity, task-switching, chronic lateness. On Vyvanse 40mg. | 4 weeks: Mapping triggers & patterns → The Pause Protocol → Deep work blocks & context-switching → Morning routine & lateness |
| **Marcus T.** | 41yo freelance graphic designer. Diagnosed 3 months ago after daughter's diagnosis. No medication. Inconsistent work output, missed deadlines, household overwhelm. | 4 weeks: Understanding your diagnosis → Taming the home environment → Freelance workflow & client deadlines → Daily rhythm & medication discussion |

---

### Jim Kowalski, DPT — Physical Therapist

**Email:** jim@jim.com | **Password:** Jim1

Kowalski Physical Therapy. Jim treats orthopedic patients with progressive exercise programs. Homework includes specific exercises with sets, reps, and form cues.

| Program (Client) | Description | Modules |
|-------------------|-------------|---------|
| **Rachel S.** | 28yo recreational soccer player. 6 weeks post-op ACL reconstruction (patellar tendon autograft). Goals: return to soccer in 9 months. | 4 weeks: Swelling control & quad activation → ROM progression & gait training → Strengthening phase → Agility & sport-specific prep |
| **Tom D.** | 52yo office worker. Chronic low back pain for 3 years, worse after prolonged sitting. Mild disc degeneration L4-L5. Sedentary. | 4 weeks: Pain education & baseline movement → Core stability & desk ergonomics → Loading & functional strength → Independence & long-term plan |
| **Linda W.** | 61yo retired teacher. Frozen shoulder (adhesive capsulitis) right side, thawing phase. Goals: reach overhead, sleep without pain, return to gardening. | 4 weeks: Gentle mobility & pain management → Active ROM & light resistance → Functional tasks & strength building → Return to activities & maintenance |

---

### Maya Chen, RDN, CDCES — Registered Dietitian

**Email:** maya@maya.com | **Password:** Maya1

Nourish Nutrition Counseling. Maya is a registered dietitian and certified diabetes care & education specialist. Programs focus on food logging, meal planning, and behavior change.

| Program (Client) | Description | Modules |
|-------------------|-------------|---------|
| **Angela R.** | 45yo paralegal. Newly diagnosed Type 2 diabetes, A1C 8.2%. On metformin. Eats fast food 4-5x/week, skips breakfast. | 4 weeks: Understanding carbs & blood sugar → Meal planning & prep basics → Eating out & social situations → Fine-tuning & long-term habits |
| **Kevin P.** | 33yo software developer. IBS-D diagnosed 2 years ago. Bloating, urgency, anxiety about eating before meetings. | 4 weeks: Symptom baseline & food-mood connection → Low-FODMAP elimination → FODMAP reintroduction phase 1 → Personalized diet & eating confidence |
| **Diane M.** | 48yo HR manager. 3 months post-gastric sleeve. Struggling with protein intake (40g/day, goal 80g), dumping syndrome, emotional eating. | 2 weeks: Protein priority & eating mechanics → Emotional eating & mindful habits |

---

### Dr. Priya Patel, MD, FACC — Cardiologist

**Email:** priya@priya.com | **Password:** Priya1

HeartWell Cardiology. Priya manages cardiac patients with programs combining medication adherence, lifestyle modification, and exercise progression.

| Program (Client) | Description | Modules |
|-------------------|-------------|---------|
| **Robert H.** | 58yo construction foreman. 8 weeks post-MI with stent (LAD). EF 45%. Completed Phase II cardiac rehab. 20-year smoker, quit at MI. BMI 31. | 4 weeks: Understanding your heart & medications → Heart-healthy eating & cholesterol → Exercise progression & return to work → Work clearance & long-term prevention |
| **Maria G.** | 67yo retired principal. Stage 2 hypertension (avg 158/95), resistant to adding 3rd medication. On lisinopril + amlodipine. High sodium diet, sedentary. Family history of stroke. | 2 weeks: BP monitoring & sodium awareness → DASH diet & movement |

## Project Structure

```
apps/
  web/
    src/
      app/(dashboard)/          → Dashboard pages (programs, participants, sessions, settings)
      components/               → Part editors, enrollment section, save indicator, etc.
      hooks/                    → TanStack Query hooks (usePrograms, useModules, useParts, etc.)
      lib/                      → API client, utilities
  mobile/
    app/
      (auth)/                   → Login, register screens
      (app)/(tabs)/             → Programs, tasks, calendar, journal, settings
      (app)/program/            → Program detail, part viewer
    lib/                        → API client, auth context

packages/
  api/
    src/
      routes/                   → auth, programs, modules, parts, enrollments, participant, tasks, calendar, journal, notifications
      services/                 → notifications, queue, notification copy
      middleware/               → auth, validate, errorHandler
  db/
    prisma/
      schema.prisma             → Full data model
      seed.ts                   → Demo data for all clinicians
  shared/
    src/
      schemas/                  → Zod schemas for all entities
      types/                    → TypeScript type exports
```

## HIPAA Considerations

- No PII logged at INFO level (IDs and operation names only)
- 30-minute session timeout
- All API communication over HTTPS in production
- Audit trail planned via Prisma middleware
- File storage via pre-signed S3 URLs (no public URLs, encryption at rest)

## License

Proprietary. All rights reserved.
