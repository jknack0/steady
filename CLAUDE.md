# STEADY with ADHD — Claude Code Guidelines

## Project Overview

HIPAA-compliant clinical platform for ADHD treatment. Turborepo monorepo with Next.js web app (clinician CAS), Expo mobile app (participant), Express API, Prisma + PostgreSQL, and shared types package.

## Architecture Principles

### Scale-First Decisions
- **Stateless API**: No in-memory sessions or caches. All state lives in PostgreSQL or Redis (when added). This lets us horizontally scale API instances behind a load balancer.
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
- **Connection pooling**: Use PgBouncer or Prisma's built-in connection pool. Never create ad-hoc PrismaClient instances — always use the singleton from `@steady/db`.
- **Separation of concerns**: Keep business logic in service functions (`packages/api/src/services/`), not in route handlers. Route handlers only parse input, call services, and format output.
- **Shared validation**: All Zod schemas live in `@steady/shared` so API and frontend validate identically. Never duplicate validation logic.
- **Background jobs**: Anything that takes >200ms (email, push notifications, PDF generation) goes in a job queue, not in the request path. Use BullMQ + Redis when we add async work.
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
- Auto-save with debounce (2s) for editor fields. Show save status indicator.
- All pages under `(dashboard)` route group share the sidebar layout.
- Prefer shadcn/ui components. When adding a new component, follow the existing pattern in `src/components/ui/`.
- Use `@dnd-kit` for all drag-and-drop.

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
- **API routes**: Integration tests that hit the Express app with supertest. Test happy path, validation errors, auth failures, ownership checks, and edge cases. One test file per route module (`programs.test.ts`, `modules.test.ts`, `parts.test.ts`).
- **Service functions**: Unit tests for business logic. Mock the database layer (Prisma) when testing pure logic. Use a real test database for integration tests.
- **Zod schemas**: Unit tests for every discriminated union variant. Test both valid and invalid payloads. These catch regressions when schemas change.
- **React components**: Test user-facing behavior, not implementation. Use React Testing Library. Focus on: does the form submit the right data? Does the error state show? Does the empty state render?
- **Hooks**: Test custom hooks with `renderHook`. Mock the API client, verify correct query keys and mutation behavior.

### Test Infrastructure
- Use Vitest as the test runner (fast, ESM-native, compatible with our TypeScript setup).
- API integration tests use a dedicated test database (`steady_adhd_test`) — never the dev database.
- Reset the test database between test suites with Prisma's `$transaction` + rollback or `migrate reset`.
- CI runs `turbo run test` — tests must pass before merge.
- Target >80% coverage on `packages/api` and `packages/shared`. Frontend coverage is secondary to API coverage.

### Test File Locations
- `packages/api/src/__tests__/` — API route + service tests
- `packages/shared/src/__tests__/` — Schema validation tests
- `apps/web/src/__tests__/` — Component and hook tests

## Zod Schema Conventions

All Zod schemas live in `packages/shared/src/schemas/`. Follow these rules:

### String bounds
Every `z.string()` field must have a `.max()` unless it's an enum or literal. Use these defaults:
- Titles/labels: `.max(200)`
- Descriptions/instructions: `.max(2000)`
- Body/content: `.max(50000)`
- Short identifiers (emoji, placeholder): `.max(10)` to `.max(200)`

### Conditional field validation
When a field's requirements depend on another field's value (e.g., LIKERT requires `likertMin`/`likertMax`, MULTIPLE_CHOICE requires `options`), use `.superRefine()`:
```typescript
const Schema = z.object({ ... }).superRefine((data, ctx) => {
  if (data.type === "MULTIPLE_CHOICE" && (!data.options || data.options.length < 2)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "...", path: ["options"] });
  }
});
```

### Discriminated unions and superRefine
Schemas that participate in `z.discriminatedUnion("type", [...])` **must remain `ZodObject`** — do NOT add `.superRefine()` directly to them, as it converts them to `ZodEffects` and breaks the discriminator. Instead, export a separate refined version:
```typescript
const BaseSchema = z.object({ type: z.literal("FOO"), ... }); // used in union
export const RefinedSchema = BaseSchema.superRefine(...);      // used for explicit validation
```

### Typed options over `z.any()`
Never use `z.any()` for structured data. Use `z.union([SchemaA, SchemaB, z.null()])` and validate which variant is required via `.superRefine()`.

## Code Style

- TypeScript strict mode everywhere. No `any` unless explicitly necessary (and add a comment explaining why).
- Prefer `interface` over `type` for object shapes. Use `type` for unions and intersections.
- Explicit return types on exported functions. Inferred return types are fine for internal/private functions.
- Error handling: Catch at the route handler level. Services should throw typed errors, route handlers convert to HTTP responses.
- No barrel exports deeper than one level — `index.ts` re-exports are fine at package root and one folder deep, but don't chain them.

## HIPAA Considerations

- **Logging**: Use `logger` from `packages/api/src/lib/logger.ts` for ALL logging. Never use `console.error/log/warn` directly — the logger strips PII from error objects (logs error name + message only, never full objects which may contain Prisma query results with patient data). Usage: `logger.error("Context description", err)`, `logger.info("Message")`, `logger.warn("Message", "detail")`.
- Never log PII (names, emails, health data) at INFO level. Only log IDs and operation names.
- Session timeout: 30 minutes of inactivity.
- All API communication over HTTPS in production.
- Audit trail: Log all data mutations (create, update, delete) with userId, timestamp, and resource type. (Implement via Prisma middleware when ready.)
- File storage: S3 bucket with encryption at rest, HTTPS-only access, no public URLs.

## Monorepo Structure

```
apps/web          → Next.js 14 clinician dashboard (port 3000)
apps/mobile       → Expo participant app
packages/api      → Express API server (port 4000)
packages/db       → Prisma schema + client singleton
packages/shared   → Zod schemas, TypeScript types, constants
```

## Common Commands

```bash
npm run dev              # Start all apps + packages in parallel
npm run build            # Production build all packages
npm run lint             # Lint all packages
npm run typecheck        # Type-check all packages
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:push          # Push schema changes to dev database
docker compose up -d     # Start PostgreSQL
```
