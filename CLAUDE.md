# STEADY with ADHD — Claude Code Guidelines

## Project Overview

HIPAA-compliant clinical platform for ADHD treatment. Turborepo monorepo with Next.js 15 web app (clinician CAS), Expo 54 mobile app (participant), Express API with pg-boss job queue, Prisma + PostgreSQL, and shared Zod validation package.

**Tech stack**: React 19, TypeScript strict, TanStack Query, Tailwind CSS / NativeWind, JWT auth (cookie-based), S3 file storage, AWS deployment.

**Database env vars** (in `.env`):
- `DATABASE_URL` — local dev (localhost:5432)
- `DATABASE_URL_DEV` — Railway dev/staging database (legacy, migrating off)
- `DATABASE_URL_PROD` — Railway production database (legacy, migrating off)

## Monorepo Structure

```
apps/web          → Next.js 15 clinician dashboard (port 3000)
apps/mobile       → Expo 54 participant app (React Native 0.81)
packages/api      → Express 4 API server (port 4000)
packages/db       → Prisma schema + client singleton + audit middleware
packages/shared   → Zod schemas, TypeScript types, constants, theme
```

## Architecture Principles

### Scale-First Decisions
- **Stateless API**: No in-memory sessions or caches. All state lives in PostgreSQL. Horizontally scalable behind a load balancer.
- **Database indexes**: Always add indexes for foreign keys used in WHERE clauses and any column used for filtering/sorting. Check query plans for N+1s before merging.
- **Pagination**: Every list endpoint MUST be bounded. Never call `findMany` without a `take` parameter.
  - **Unbounded-growth lists** (programs, enrollments, participants, sessions) use cursor-based pagination:
    ```typescript
    const { cursor, limit = "50" } = req.query;
    const take = Math.min(parseInt(limit as string) || 50, 100);
    const items = await prisma.model.findMany({
      where: { ... },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    });
    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    res.json({ success: true, data, cursor: hasMore ? data[data.length - 1].id : null });
    ```
  - **Bounded lists** (modules per program, parts per module, trackers per program) use a `take` cap (e.g., `take: 200`).
  - **Naturally tiny lists** (notification preferences, hardcoded templates) are exempt.
- **Dependency pinning**: All dependencies use **exact versions** (no `^` or `~`). The `.npmrc` has `save-exact=true`. This prevents version drift across environments (Windows, WSL, Docker, Railway, Vercel). When adding a dependency, use `npm install <pkg>` — it will auto-pin. Never use `^` ranges for critical packages (Prisma, React, Express, LiveKit).
- **Connection pooling**: Never create ad-hoc PrismaClient instances — always use the singleton from `@steady/db`.
- **Separation of concerns**: Business logic in service functions (`packages/api/src/services/`), not route handlers. Route handlers only parse input, call services, and format output.
- **Shared validation**: All Zod schemas live in `@steady/shared` so API and frontend validate identically. Never duplicate validation logic.
- **Background jobs**: Anything >200ms (push notifications, RTM monitoring, superbill generation) goes through pg-boss job queue, not in the request path. Workers start alongside the API server.
- **File uploads**: Never store files locally. Use pre-signed S3 URLs for upload/download. API never touches the file bytes.
- **Environment separation**: All environment-specific values come from env vars. Never hardcode URLs, secrets, or feature flags.

### Soft Deletes — MANDATORY
- **Never hard-delete records.** All deletes must be soft deletes using a `deletedAt DateTime?` field.
- Set `deletedAt: new Date()` instead of calling `prisma.model.delete()`.
- All queries must filter with `deletedAt: null` to exclude soft-deleted records.
- This applies to all models — clinical data, appointments, enrollments, billing records, etc.
- HIPAA requires audit trails and data retention; hard deletes destroy evidence.

### API Design
- RESTful with consistent response shape: `{ success: boolean, data?: T, error?: string }`
- All mutations require authentication. Use `authenticate` + `requireRole()` middleware.
- Always verify resource ownership (clinician owns program, participant owns enrollment, etc.) — never trust client-provided IDs alone.
- Use Prisma transactions for any operation that touches multiple rows atomically.
- Return 404 for missing resources, 403 for ownership violations, 409 for conflict states (e.g., archiving program with active enrollments).

### Frontend Patterns
- Use TanStack Query for all server state. No `useState` for data that comes from the API.
- Invalidate related queries on mutation success — don't manually update cache.
- Auto-save with debounce (2s) for editor fields. Show save status indicator (`use-autosave` hook).
- All pages under `(dashboard)` route group share the sidebar layout.
- Prefer shadcn/ui + Radix UI components. Follow existing patterns in `src/components/ui/`.
- Use `@dnd-kit` for all drag-and-drop.
- Recharts for data visualization, Tiptap for rich text editing.

### Mobile Patterns
- Expo Router for file-based navigation with `(auth)` and `(app)` route groups.
- NativeWind (Tailwind on React Native) for styling.
- Expo Secure Store for token persistence (not localStorage).
- 5-tab layout: Programs, Tasks, Calendar, Journal, Settings.
- Part renderers in `components/part-renderers.tsx` handle all 12 content types.

## Authentication & Authorization

### JWT + Cookie-Based Auth
- **Access token**: 30-minute JWT signed with `JWT_SECRET`. Payload: `{ userId, role, clinicianProfileId?, participantProfileId? }`.
- **Refresh token**: 7-day cryptographic token (48 bytes base64url) stored in `RefreshToken` table with family tracking.
- **Token rotation**: On refresh, old token is revoked and new one issued in the same family. Reuse of a revoked token → entire family revoked (breach detection).
- **Cookie storage (web)**: Both tokens stored as `httpOnly` cookies. Access token at `path: /`, refresh token at `path: /api/auth` (tighter scope). `secure: true` in production, `sameSite: none` for cross-origin.
- **Mobile storage**: Expo Secure Store for tokens, sent via `Authorization: Bearer` header.
- **Auto-refresh**: Web (`lib/api-client.ts`) and mobile (`lib/api.ts`) silently retry on 401 by calling `/api/auth/refresh`. All web requests use `credentials: "include"` for cookie transport.
- **Auth middleware**: `authenticate` reads cookie or Bearer header → verifies JWT → attaches `AuthUser` (userId, role, profileIds) → calls `runWithAuditUser()` for HIPAA audit context.
- **Role-based access**: `requireRole("CLINICIAN")`, `requireRole("PARTICIPANT")`, `requireRole("ADMIN")`.
- **Rate limiting**: Login 5/15min, register 3/hr, refresh 30/15min.
- **Password hashing**: bcrypt with 12 salt rounds.

## Audit & HIPAA Compliance

### Audit Logging (Implemented)
- Prisma middleware in `packages/db/src/audit-middleware.ts` automatically logs all CREATE/UPDATE/DELETE mutations to `audit_logs` table.
- Uses `AsyncLocalStorage` for audit context — call `runWithAuditUser(userId, fn)` to set context, no parameter threading needed.
- Logs only: user ID, action, resource type, resource ID, changed field names. **Never** logs values or PII.
- Fire-and-forget (non-blocking).

### Logging
- Use `logger` from `packages/api/src/lib/logger.ts` for ALL logging. **Never use `console.error/log/warn` directly.**
- Logger strips PII from error objects (logs error name + message only, never full objects which may contain Prisma query results with patient data).
- Usage: `logger.error("Context description", err)`, `logger.info("Message")`, `logger.warn("Message", "detail")`.
- Never log PII (names, emails, health data) at INFO level. Only log IDs and operation names.
- Stack traces only in non-production.

### Data Security
- Session timeout: 30 minutes of inactivity.
- All API communication over HTTPS in production.
- File storage: S3 bucket with encryption at rest, HTTPS-only access, no public URLs.
- No in-memory state — stateless API for horizontal scaling.

## API Routes & Services

### Routes (`packages/api/src/routes/` — 20 modules)
`auth` · `programs` · `modules` · `parts` · `enrollments` · `participant` · `tasks` · `calendar` · `journal` · `notifications` · `ai` · `stats` · `clinician` · `sessions` · `admin` · `practice` · `uploads` · `daily-trackers` · `rtm` · `config`

### Services (`packages/api/src/services/` — 15 modules)
`assignment` · `clinician` · `participant` · `sessions` · `rtm` · `rtm-notifications` · `notifications` · `config` · `s3` · `tracker-templates` · `homework-instances` · `notification-copy` · `stats` · `superbill` · `queue`

### Key Patterns
- pg-boss queue (`services/queue.ts`) runs notification and RTM workers on server start.
- Push notifications via Expo Server SDK, queued through pg-boss.
- S3 presigned URLs generated in `services/s3.ts` — API never touches file bytes.
- Homework recurrence handled by `services/homework-instances.ts`.

## Program System

### Three Program Types
Programs are distinguished by `isTemplate` and `templateSourceId`:

| Type | `isTemplate` | `templateSourceId` | Where it shows | Created via |
|------|-------------|-------------------|----------------|-------------|
| **My Programs** | `false` | `null` | My Programs tab | Create from scratch, cloned from prod |
| **Client Programs** (assigned) | `false` | Points to source template | Client Programs tab | `POST /api/programs/:id/assign` |
| **Client Programs** (blank) | `false` | Self-referencing (own ID) | Client Programs tab | `POST /api/programs/for-client` |
| **System Templates** | `true` | `null` | Template Library tab | Seeded by system@steady.app |

### Query Logic
- **My Programs list**: `NOT { isTemplate: false, templateSourceId: { not: null } }` — excludes all client copies
- **Client Programs list**: `isTemplate: false, templateSourceId: { not: null }` — includes both assigned and blank-created
- **Template Library**: `isTemplate: true, clinicianId: systemProfileId`

### Self-Referencing `templateSourceId` Pattern
When a blank program is created for a client via `POST /api/programs/for-client`, its `templateSourceId` is set to its own `id` in a two-step transaction (create → update). This marks it as a client program without requiring a source template.

### Program Endpoints (`packages/api/src/routes/programs.ts`)
| Endpoint | Purpose |
|----------|---------|
| `GET /api/programs` | List My Programs (excludes client copies) |
| `GET /api/programs/templates` | List system templates (owned by system@steady.app) |
| `GET /api/programs/client-programs` | List client programs with enrolled client name |
| `POST /api/programs` | Create blank My Program template |
| `POST /api/programs/for-client` | Create blank client program (self-ref templateSourceId + module + enrollment in transaction) |
| `POST /api/programs/:id/assign` | Deep-copy template to client with module/part exclusions |
| `POST /api/programs/:id/assign/append` | Append modules from template to existing client program |
| `POST /api/programs/:id/clone` | Clone a program (templates or own programs) |
| `POST /api/programs/:id/promote` | Promote client program to My Programs template (structure only) |
| `GET /api/programs/:id` | Get single program with modules |
| `GET /api/programs/:id/preview` | Full program with all parts |
| `PUT /api/programs/:id` | Update program metadata |
| `DELETE /api/programs/:id` | Archive program |

### Assignment Service (`packages/api/src/services/assignment.ts`)
- `assignProgram()`: Deep-copies template → client program + enrollment. Verifies ownership via `ClinicianClient`. Supports `excludedModuleIds`/`excludedPartIds` for content customization.
- `appendModules()`: Appends modules from template to existing client program. Deduplicates daily trackers by name. Offsets sortOrder to avoid collisions.
- Both require the source program to be PUBLISHED and either owned by the clinician or a system template.

### Frontend — Programs Page (`apps/web/src/app/(dashboard)/programs/page.tsx`)
Three tabs with URL-based routing (`?tab=client-programs`, `?tab=templates`, default: `my-programs`):
- **My Programs**: Clinician's base programs. Cards with module count + "Assign to Client" button.
- **Client Programs**: Assigned/created-for-client programs. Shows client name + enrollment status.
- **Template Library**: System templates with "Use Template" + "Assign to Client" buttons.

### Create Program Dialog (`apps/web/src/app/(dashboard)/programs/create-program-dialog.tsx`)
Three-view state machine:
- **Templates view** (default): Template cards + two action cards ("Start from Scratch", "Create for Client")
- **Blank view**: Form for new My Program template (title, description, cadence, session type)
- **For-client view**: Title + client picker. Supports `preselectedClient` prop to skip picker (used from client detail page).

### Client Picker (`apps/web/src/components/client-picker.tsx`)
Searchable dropdown of clinician's clients with inline "Add New Client" form (firstName, lastName, email). Uses `useClinicianClients()` hook. Client-side filtering only (HIPAA: no server-side search across clients).

### Program Hooks (`apps/web/src/hooks/use-programs.ts`)
`usePrograms` · `useProgram` · `useCreateProgram` · `useUpdateProgram` · `useDeleteProgram` · `useCloneProgram` · `useTemplates` · `useClientPrograms` · `useCreateProgramForClient`

### Client Detail Page Integration
The participant detail page (`apps/web/src/app/(dashboard)/participants/[id]/page.tsx`) has:
- **"Create Program" button** in both enrolled and not-enrolled states — opens `CreateProgramDialog` with `preselectedClient` set
- **Clickable program title** on enrollment card — links to `/programs/:id` for editing the client's program copy

## Content System

### 12 Part Types
`TEXT` · `VIDEO` · `STRATEGY_CARDS` · `JOURNAL_PROMPT` · `CHECKLIST` · `RESOURCE_LINK` · `DIVIDER` · `HOMEWORK` · `ASSESSMENT` · `INTAKE_FORM` · `SMART_GOALS` · `STYLED_CONTENT`

- Web has dedicated editors in `apps/web/src/components/part-editors/` (one per type).
- Mobile has renderers in `apps/mobile/components/part-renderers.tsx`.
- Schemas use discriminated unions on `type` field in `packages/shared/src/schemas/part.ts`.

### Homework System
- 6 homework item types: `ACTION`, `RESOURCE_REVIEW`, `JOURNAL_PROMPT`, `BRING_TO_SESSION`, `FREE_TEXT_NOTE`, `CHOICE`.
- `HomeworkInstance` model handles recurrence with due dates and completion tracking.

## RTM (Remote Therapeutic Monitoring)

- `RtmEnrollment`: Clinician enrolls participant, tracks monitoring type (CBT/MSK/Respiratory), consent, diagnosis codes.
- `RtmEngagementEvent`: Tracks participant engagement (tracker completed, homework done, app opened, etc.).
- `RtmBillingPeriod`: 30-day billing cycles with engagement day counts, clinician time logs, billing tier determination.
- `RtmClinicianTimeLog`: Activity-level time tracking for billing.
- Superbill generation for insurance billing.
- Web dashboard at `/rtm` with enrollment detail and superbill views.

## Database (Prisma — `packages/db`)

### Key Model Groups
- **Auth & Profiles**: User, ClinicianProfile, ParticipantProfile
- **Multi-tenant**: Practice, PracticeMembership
- **Content**: Program, Module, Part (12 types)
- **Enrollment**: Enrollment, ModuleProgress, PartProgress
- **Activity**: Task, CalendarEvent, JournalEntry, Session
- **Trackers**: DailyTracker, DailyTrackerField, DailyTrackerEntry
- **Homework**: HomeworkInstance
- **RTM**: RtmEnrollment, RtmEngagementEvent, RtmBillingPeriod, RtmClinicianTimeLog
- **Billing**: ClinicianBillingProfile
- **Config**: ClinicianConfig, ClientConfig, ClinicianClient
- **Notifications**: NotificationPreference
- **Audit**: AuditLog

## Test-Driven Development

### TDD Workflow — MANDATORY
1. **Write tests first** for any new feature, endpoint, or business logic function.
2. Run the failing test to confirm it fails for the right reason.
3. Write the minimum code to make it pass.
4. Refactor with confidence the tests are green.
5. Never skip step 1 — if you're writing implementation code without a test, stop and write the test first.
6. **After writing any code**, run the relevant test suite (`npm run test` or target the specific package) before considering the task complete.
7. **Every new API route** must have a corresponding test file in `packages/api/src/__tests__/`. Every new Zod schema must have tests in `packages/shared/src/__tests__/`.
8. **Coverage gate**: `packages/api` and `packages/shared` must maintain >80% line coverage. Run `npx vitest run --coverage` to check before submitting work.

### What to Test
- **API routes**: Integration tests with supertest against the Express app. Test happy path, validation errors, auth failures, ownership checks, edge cases. One test file per route module.
- **Service functions**: Unit tests for business logic. Mock Prisma for pure logic tests.
- **Zod schemas**: Unit tests for every discriminated union variant. Test valid and invalid payloads. **When modifying a schema, always test round-trip preservation** — parse real/existing DB data through the schema and verify no fields are stripped or corrupted. The `validate` middleware uses `schema.parse()` which strips unknown fields and injects defaults.
- **React components**: React Testing Library — test user behavior, not implementation.
- **Hooks**: `renderHook` with mocked API client.

### Critical Rules for Schema Changes
- **Never use `replace_all` on Zod schema fields** — the same field name (e.g., `sortOrder`) may appear in multiple unrelated schemas. Target each schema individually.
- **Test with realistic DB payloads** — existing data may use different field names or values than what the schema expects. Always verify the schema accepts actual production data shapes.
- **Never put React Query hooks inside list-rendered components** — call hooks in the parent and pass data as props. Hooks in list items cause re-render storms that break autosave.
- **Field names MUST match across the full stack** — Zod schema, service function, route handler, and client (mobile + web) must all use the same field names. The `validate` middleware runs `schema.parse()` which silently strips unrecognized fields, so a field name mismatch (e.g., schema says `code` but client sends `inviteCode`) will fail at runtime with a misleading "Required" error. When writing or modifying a schema, always check the client code to verify the field names match what's actually sent.

### Test Infrastructure
- Vitest (API: node environment, Web: jsdom environment).
- API tests use dedicated test database (`steady_adhd_test`).
- Test helpers in `packages/api/src/__tests__/helpers.ts`: `createTestToken`, `authHeader`, `participantAuthHeader`, `mockProgram`, `mockModule`, `mockPart`.
- CI runs `turbo run test` — tests must pass before merge.
- Target >80% coverage on `packages/api` and `packages/shared`. Frontend coverage is secondary.

### Test File Locations
- `packages/api/src/__tests__/` — API route + service tests (20+ test files)
- `packages/shared/src/__tests__/` — Schema validation tests
- `apps/web/src/__tests__/` — Component and hook tests

## Zod Schema Conventions

All Zod schemas live in `packages/shared/src/schemas/` (12 schema files: auth, program, module, part, enrollment, daily-tracker, rtm, config, stats, invitation, assignment).

### String bounds
Every `z.string()` field must have a `.max()` unless it's an enum or literal:
- Titles/labels: `.max(200)`
- Descriptions/instructions: `.max(2000)`
- Body/content: `.max(50000)`
- Short identifiers (emoji, placeholder): `.max(10)` to `.max(200)`

### Conditional field validation
Use `.superRefine()` for cross-field dependencies:
```typescript
const Schema = z.object({ ... }).superRefine((data, ctx) => {
  if (data.type === "MULTIPLE_CHOICE" && (!data.options || data.options.length < 2)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "...", path: ["options"] });
  }
});
```

### Discriminated unions and superRefine
Schemas in `z.discriminatedUnion("type", [...])` **must remain `ZodObject`** — do NOT add `.superRefine()` directly (converts to `ZodEffects`, breaks discriminator). Export a separate refined version:
```typescript
const BaseSchema = z.object({ type: z.literal("FOO"), ... }); // used in union
export const RefinedSchema = BaseSchema.superRefine(...);      // used for explicit validation
```

### Typed options over `z.any()`
Never use `z.any()` for structured data. Use `z.union([SchemaA, SchemaB, z.null()])` and validate via `.superRefine()`.

## Code Style

- TypeScript strict mode everywhere. No `any` unless explicitly necessary (add a comment explaining why).
- Prefer `interface` over `type` for object shapes. Use `type` for unions and intersections.
- Explicit return types on exported functions. Inferred return types fine for internal functions.
- Error handling: Catch at the route handler level. Services throw typed errors, route handlers convert to HTTP responses.
- No barrel exports deeper than one level — `index.ts` re-exports fine at package root and one folder deep, don't chain them.

## Deployment & Infrastructure

### AWS Architecture (Primary)

```
                    ┌─────────────────────────────────────────────┐
                    │              Route 53 DNS                    │
                    │  steadymentalhealth.com → Amplify            │
                    │  dev-api.steadymentalhealth.com → Dev EC2    │
                    │  live-kit.steadymentalhealth.com → LK EC2   │
                    └──────┬──────────────┬──────────────┬────────┘
                           │              │              │
              ┌────────────▼──┐  ┌────────▼──────┐  ┌──▼──────────┐
              │  AWS Amplify   │  │  EC2 (Prod)   │  │  EC2 (LK)   │
              │  Next.js 15   │  │  API :4000    │  │  LiveKit    │
              │  SSR + Static │  │  PM2 managed  │  │  :7880/7881 │
              │  CloudFront   │  │  Node 20      │  │  Caddy SSL  │
              └───────────────┘  └───────┬───────┘  └─────────────┘
                                         │
                                ┌────────▼────────┐
                                │  RDS PostgreSQL  │
                                │  steady-db       │
                                │  us-east-2       │
                                └─────────────────┘
```

### Production Environment
- **Web (Amplify)**: Next.js 15 SSR deployed via AWS Amplify Hosting. `amplify.yml` configures monorepo build. Standalone output with custom `.amplify-hosting` deploy manifest for WEB_COMPUTE. Auto-deploys from `dev` branch.
- **API (EC2 — `18.190.203.20`)**: Express API on port 4000, managed by PM2. Node 20. Connects to RDS over SSL (`sslmode=no-verify`).
- **Database (RDS)**: PostgreSQL on `steady-db.cx28s2yuw4sb.us-east-2.rds.amazonaws.com:5432`. Database name: `steady-db`.
- **LiveKit (EC2 — `3.12.134.63`)**: LiveKit server on port 7880/7881, Caddy for SSL termination at `live-kit.steadymentalhealth.com`. UDP 50000-60000 for WebRTC media.

### Dev Environment
- **All-in-one EC2 (`3.151.218.205`)**: PostgreSQL + API + LiveKit on a single instance.
  - PostgreSQL local on port 5432, database: `steady_adhd`, user: `steady`
  - API on port 4000 via PM2
  - LiveKit on port 7880 via systemd
  - Seeded from production RDS data

### Legacy (Migrating Off)
- **Railway**: Previously hosted API + PostgreSQL. Database URLs in `.env` as `DATABASE_URL_DEV` and `DATABASE_URL_PROD` — being replaced by AWS.
- **Vercel**: Previously hosted web frontend — replaced by AWS Amplify.

### EC2 Deployment Process
To deploy API changes to an EC2 instance:
```bash
ssh -i ~/.ssh/steady-key.pem ubuntu@<EC2_IP>
cd ~/steady
git pull origin dev
npx prisma generate --schema=packages/db/prisma/schema.prisma
npx turbo run build --filter=@steady/api
pm2 restart steady-api
```

### Amplify Build Process
Amplify auto-deploys on push to `dev`. The build:
1. `npm ci` from monorepo root
2. `prisma generate` for Prisma client
3. Build `@steady/shared` → `@steady/db` → `next build`
4. Post-build generates `.amplify-hosting/` with `deploy-manifest.json` for SSR compute
5. Deploys to CloudFront + Lambda@Edge

### Environment Variables (Production EC2)
```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:<pass>@steady-db.<id>.us-east-2.rds.amazonaws.com:5432/steady-db?sslmode=no-verify
JWT_SECRET=<secret>
REFRESH_SECRET=<secret>
FIELD_ENCRYPTION_KEY=<32-byte-base64>
ANTHROPIC_API_KEY=<key>
CORS_ORIGINS=https://steadymentalhealth.com,https://www.steadymentalhealth.com,https://dily9t72o38yr.amplifyapp.com,https://dev.steadymentalhealth.com
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=wss://live-kit.steadymentalhealth.com
ADMIN_SYNC_SOURCE_EMAIL=kevin.barr@steady.com
```

### Environment Variables (Amplify)
```
NEXT_PUBLIC_API_URL=https://api.steadymentalhealth.com  # or EC2 IP:4000
```

## Common Commands

```bash
npm run dev              # Start all apps + packages in parallel
npm run build            # Production build all packages
npm run lint             # Lint all packages
npm run typecheck        # Type-check all packages
npm run test             # Run tests in all packages
npm run format           # Format with Prettier
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:push          # Push schema changes to dev database
docker compose up -d     # Start local PostgreSQL + LiveKit (dev only)
```
