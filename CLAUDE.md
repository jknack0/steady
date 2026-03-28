# STEADY with ADHD — Claude Code Guidelines

## Project Overview

HIPAA-compliant clinical platform for ADHD treatment. Turborepo monorepo with Next.js 16 web app (clinician CAS), Expo 54 mobile app (participant), Express API with pg-boss job queue, Prisma + PostgreSQL, and shared Zod validation package.

**Tech stack**: React 19, TypeScript strict, TanStack Query, Tailwind CSS / NativeWind, JWT auth, S3 file storage, Railway deployment.

## Monorepo Structure

```
apps/web          → Next.js 16 clinician dashboard (port 3000)
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
- **Connection pooling**: Never create ad-hoc PrismaClient instances — always use the singleton from `@steady/db`.
- **Separation of concerns**: Business logic in service functions (`packages/api/src/services/`), not route handlers. Route handlers only parse input, call services, and format output.
- **Shared validation**: All Zod schemas live in `@steady/shared` so API and frontend validate identically. Never duplicate validation logic.
- **Background jobs**: Anything >200ms (push notifications, RTM monitoring, superbill generation) goes through pg-boss job queue, not in the request path. Workers start alongside the API server.
- **File uploads**: Never store files locally. Use pre-signed S3 URLs for upload/download. API never touches the file bytes.
- **Environment separation**: All environment-specific values come from env vars. Never hardcode URLs, secrets, or feature flags.

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

- **JWT flow**: 30-minute access token + 7-day refresh token.
- **Auto-refresh**: Both web (`lib/api-client.ts`) and mobile (`lib/api.ts`) silently retry on 401 with refresh token.
- **Token storage**: Web uses localStorage, mobile uses Expo Secure Store.
- **Auth middleware**: `authenticate` verifies JWT → attaches `AuthUser` (userId, role, profileIds) → calls `runWithAuditUser()` for audit context.
- **Role-based access**: `requireRole("CLINICIAN")`, `requireRole("PARTICIPANT")`, `requireRole("ADMIN")`.

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

### Services (`packages/api/src/services/` — 14 modules)
`clinician` · `participant` · `sessions` · `rtm` · `rtm-notifications` · `notifications` · `config` · `s3` · `tracker-templates` · `homework-instances` · `notification-copy` · `stats` · `superbill` · `queue`

### Key Patterns
- pg-boss queue (`services/queue.ts`) runs notification and RTM workers on server start.
- Push notifications via Expo Server SDK, queued through pg-boss.
- S3 presigned URLs generated in `services/s3.ts` — API never touches file bytes.
- Homework recurrence handled by `services/homework-instances.ts`.

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
- `packages/api/src/__tests__/` — API route + service tests (19 test files)
- `packages/shared/src/__tests__/` — Schema validation tests
- `apps/web/src/__tests__/` — Component and hook tests

## Zod Schema Conventions

All Zod schemas live in `packages/shared/src/schemas/` (10 schema files: auth, program, module, part, enrollment, daily-tracker, rtm, config, stats).

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

## Deployment

- **Docker**: Multi-stage `Dockerfile.api` (node:20-slim), runs `prisma db push` on startup via `docker-entrypoint.sh`.
- **Railway**: Configured in `railway.toml` — health check at `/health`, 120s timeout, restart on failure (max 3).
- **PostgreSQL**: Docker Compose with PostgreSQL 16 for local dev (port 5432, db: `steady_adhd`).

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
docker compose up -d     # Start PostgreSQL
```
