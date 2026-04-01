# Client Program Builder -- Architecture

## System Boundaries

**Packages touched:**

| Package | Role |
|---------|------|
| `packages/shared` | New Zod schema for the `create-for-client` request |
| `packages/api` | New endpoint `POST /api/programs/for-client`, minor query change in `GET /api/programs/client-programs` |
| `apps/web` | Modified `CreateProgramDialog`, new client picker component, new React Query hook |

**Unchanged:**

- `packages/db` -- No Prisma schema migration required. The `Program.templateSourceId` column already exists as a nullable self-referencing foreign key. The self-referencing pattern is a data convention, not a schema change.
- Existing assignment flow (`POST /api/programs/:id/assign`) -- untouched.
- Existing promote flow (`POST /api/programs/:id/promote`) -- untouched.
- Existing clone flow -- untouched.
- Mobile apps -- out of scope.

## Data Model

No schema migration is needed. The architecture relies on an existing column with a new convention:

**Self-referencing `templateSourceId` pattern:** When a program is created via "Create for Client," its `templateSourceId` is set to its own `id`. This distinguishes it from:
- Template programs: `isTemplate: true`, `templateSourceId` is null or points to another program.
- Assignment-created client programs: `isTemplate: false`, `templateSourceId` points to a *different* program (the source template).
- Builder-created client programs: `isTemplate: false`, `templateSourceId` points to *itself*.

The self-reference is set in a two-step operation within a single transaction: (1) create the program, (2) update `templateSourceId` to the newly created program's `id`.

**Existing query implications:** The `GET /api/programs` (My Programs) endpoint already excludes client programs using `NOT: { isTemplate: false, templateSourceId: { not: null } }`. Since builder-created programs have `isTemplate: false` and `templateSourceId: not null` (self-referencing), they are correctly excluded from My Programs with no changes needed.

## API Design

### New Endpoint: POST /api/programs/for-client

**Middleware chain:** `authenticate` -> `requireRole("CLINICIAN")` -> `validate(CreateProgramForClientSchema)`

**Request shape:**
```
POST /api/programs/for-client
Content-Type: application/json

{
  "title": "Anxiety Management for Jane",
  "clientId": "cuid_of_user"
}
```

`clientId` is the `User.id` (not `ParticipantProfile.id`), consistent with how `ClinicianClient.clientId` references `User.id`.

**Response shape (201):**
```json
{
  "success": true,
  "data": {
    "program": {
      "id": "new_program_cuid",
      "title": "Anxiety Management for Jane",
      "status": "PUBLISHED",
      "isTemplate": false,
      "templateSourceId": "new_program_cuid"
    },
    "enrollment": {
      "id": "enrollment_cuid",
      "participantId": "participant_profile_cuid",
      "programId": "new_program_cuid",
      "status": "ACTIVE"
    }
  }
}
```

**Error codes:**

| Code | Condition |
|------|-----------|
| 400 | Zod validation failure (missing title, missing clientId) |
| 401 | Not authenticated |
| 403 | clientId does not belong to clinician's clients, or client is DISCHARGED |
| 500 | Unexpected database error |

### Modified Endpoint: GET /api/programs/client-programs

No code changes required. The existing query filter (`isTemplate: false, templateSourceId: { not: null }`) already matches self-referencing programs.

## Transaction Flow

**Step 1 -- Ownership verification (pre-transaction):**
```
ClinicianClient lookup WHERE clinicianId AND clientId AND status != 'DISCHARGED'
INCLUDE client -> participantProfile
```
If not found, return 403.

**Step 2 -- Prisma $transaction (atomic):**

2a. Create program (`isTemplate: false`, `status: "PUBLISHED"`, default cadence/method/sessionType)

2b. Update `templateSourceId` to self-reference (program.id)

2c. Create one empty module ("Module 1", sortOrder: 0)

2d. Create active enrollment (participantId from resolved profile, programId, status: "ACTIVE")

**Step 3 -- Return response.**

## Frontend Architecture

### CreateProgramDialog Changes

The `View` type changes from `"templates" | "blank"` to `"templates" | "blank" | "for-client"`.

A new card "Create for Client" is added to the initial view. When selected, the dialog renders a title input and a `ClientPicker` component. Submit calls `useCreateProgramForClient`, then redirects to the program editor.

Dialog `reset()` clears all client state on close/unmount (compliance control 5).

### New Component: ClientPicker

Location: `apps/web/src/components/client-picker.tsx`

Controlled component: `value: string | null`, `onChange: (clientId: string) => void`.

Calls `GET /api/clinician/clients` via `useClinicianClients()` hook. Data loaded once, filtered client-side. Renders a searchable dropdown with:
- Text input for filtering by name
- List of active clients (name + email)
- "Add New Client" option with inline form (first name, last name, email)

Inline creation calls existing `POST /api/clinician/clients` endpoint. On success, auto-selects new client and invalidates query.

### New Hooks

**`useClinicianClients`** in `use-clinician-participants.ts`:
```typescript
export function useClinicianClients() {
  return useQuery({
    queryKey: ["clinician-clients"],
    queryFn: () => api.get("/api/clinician/clients"),
  });
}
```

**`useCreateProgramForClient`** in `use-programs.ts`:
```typescript
export function useCreateProgramForClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; clientId: string }) =>
      api.post("/api/programs/for-client", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-programs"] });
    },
  });
}
```

## Zod Schema

Added to `packages/shared/src/schemas/program.ts`:

```typescript
export const CreateProgramForClientSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  clientId: z.string().min(1, "Client is required"),
});

export type CreateProgramForClientInput = z.infer<typeof CreateProgramForClientSchema>;
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `packages/shared/src/schemas/program.ts` | Modify | Add `CreateProgramForClientSchema` and type export |
| `packages/api/src/routes/programs.ts` | Modify | Add `POST /api/programs/for-client` route handler |
| `apps/web/src/app/(dashboard)/programs/create-program-dialog.tsx` | Modify | Add "for-client" view with title input and client picker |
| `apps/web/src/components/client-picker.tsx` | Create | New client picker component |
| `apps/web/src/hooks/use-programs.ts` | Modify | Add `useCreateProgramForClient` hook |
| `apps/web/src/hooks/use-clinician-participants.ts` | Modify | Add `useClinicianClients` hook, update cache invalidation |

## Compliance Controls Integration

| Control | How Addressed |
|---------|---------------|
| 1. Ownership verification | ClinicianClient lookup before transaction, 403 if not found |
| 2. Zod input validation | `CreateProgramForClientSchema` via `validate()` middleware |
| 3. No PHI in logs | `logger.error()` with operation name only, no titles/names/emails |
| 4. Transaction atomicity | All 4 DB operations in single `prisma.$transaction()` |
| 5. No client-side PHI persistence | React `useState` only, cleared on dialog close, no localStorage |
| 6. Clinician-scoped queries | Existing `clinicianId` filter on client-programs endpoint preserved |
