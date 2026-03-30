# STEADY with ADHD — Development Roadmap

**Detailed sprint-by-sprint plan with Claude Code prompts.**

---

## Tech Stack Decisions (Decide Before Sprint 1)

This roadmap assumes the following stack. Adjust prompts if you choose differently.

- **Mobile**: React Native (Expo) — iOS + Android from one codebase
- **Clinician Web App**: Next.js 14+ (App Router) + React
- **Backend API**: Node.js + Express (or Fastify) + TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Clerk or Auth0 (HIPAA-compliant tier)
- **Real-time**: Socket.io or Supabase Realtime
- **Push Notifications**: Expo Notifications (wraps FCM + APNs)
- **File Storage**: AWS S3 (HIPAA-eligible) + CloudFront CDN
- **Hosting**: AWS (HIPAA BAA available) or Render
- **Monorepo**: Turborepo with shared TypeScript types package

---

## Phase 1: Foundation (Months 1–4)

**Goal:** Clinician can build a program, participant can consume it and use the Steady System.

---

### Sprint 1 (Weeks 1–2): Project Scaffolding + Data Model

**What:** Monorepo setup, database schema, auth, and basic API skeleton.

**Claude Code Prompt 1.1 — Monorepo Init:**
```
Create a Turborepo monorepo for the STEADY with ADHD app with these packages:

1. apps/web — Next.js 14 app with App Router and TypeScript. This is the clinician dashboard and CAS. Use Tailwind CSS for styling. Add shadcn/ui as the component library.

2. apps/mobile — React Native app using Expo (SDK 50+). This is the participant app. Use NativeWind (Tailwind for RN) for styling.

3. packages/api — Express + TypeScript API server. Use Prisma as the ORM with PostgreSQL. Set up a basic health-check endpoint.

4. packages/shared — Shared TypeScript types and constants. Export types that both web and mobile will import.

5. packages/db — Prisma schema and client. This is where the data model lives.

Set up Turborepo pipeline with build, dev, lint, and typecheck tasks. Add a root docker-compose.yml with a PostgreSQL 16 container for local dev. Include a .env.example at the root.
```

**Claude Code Prompt 1.2 — Core Data Model:**
```
In packages/db, create the Prisma schema for STEADY with ADHD. Here's the data model:

USERS AND AUTH:
- User (id, email, passwordHash, role ENUM [CLINICIAN, PARTICIPANT, ADMIN], firstName, lastName, createdAt, updatedAt)
- ClinicianProfile (id, userId FK, practiceName, licenseType, bio, timezone)
- ParticipantProfile (id, userId FK, timezone, onboardingCompleted)

PROGRAMS AND CONTENT:
- Program (id, clinicianId FK, title, description, coverImageUrl, cadence ENUM [WEEKLY, BIWEEKLY, SELF_PACED], enrollmentMethod ENUM [INVITE, LINK, CODE], enrollmentCode nullable, sessionType ENUM [ONE_ON_ONE, GROUP, SELF_PACED], followUpCount INT default 0, isTemplate BOOLEAN default false, templateSourceId nullable self-ref, status ENUM [DRAFT, PUBLISHED, ARCHIVED], createdAt, updatedAt)

- Module (id, programId FK, title, subtitle, summary, estimatedMinutes, sortOrder INT, unlockRule ENUM [SEQUENTIAL, MANUAL, TIME_BASED], unlockDelayDays nullable, createdAt, updatedAt)

- Part — this is POLYMORPHIC. Use a single table with a discriminator:
  (id, moduleId FK, type ENUM [TEXT, VIDEO, STRATEGY_CARDS, JOURNAL_PROMPT, CHECKLIST, RESOURCE_LINK, DIVIDER, HOMEWORK, ASSESSMENT, INTAKE_FORM, SMART_GOALS], title, sortOrder INT, isRequired BOOLEAN default true, content JSON, createdAt, updatedAt)
  
  The `content` JSON field stores type-specific data. Examples:
  - TEXT: { body: "<rich text HTML>", sections: [...] }
  - VIDEO: { url: "https://...", provider: "youtube"|"vimeo"|"loom", transcriptUrl: null }
  - STRATEGY_CARDS: { deckName: "Memory Strategies", cards: [{ title: "...", body: "...", emoji: "🔔" }] }
  - JOURNAL_PROMPT: { prompts: ["question 1", "question 2"], spaceSizeHint: "medium" }
  - CHECKLIST: { items: [{ text: "Bring your Steady System", sortOrder: 0 }] }
  - RESOURCE_LINK: { url: "https://...", description: "..." }
  - DIVIDER: { label: "Section Header Text" }
  - HOMEWORK: { dueTimingType: "BEFORE_NEXT_SESSION"|"SPECIFIC_DATE"|"DAYS_AFTER_UNLOCK", dueTimingValue: null, completionRule: "ALL"|"X_OF_Y", completionMinimum: null, reminderCadence: "DAILY"|"EVERY_OTHER_DAY"|"MID_WEEK", items: [HomeworkItem] }
  
  HomeworkItem shape: { type: "ACTION"|"RESOURCE_REVIEW"|"JOURNAL_PROMPT"|"BRING_TO_SESSION"|"FREE_TEXT_NOTE"|"CHOICE", sortOrder: INT, ...type-specific fields }
  
  ACTION: { description, subSteps: [], addToSteadySystem: boolean, dueDateOffsetDays: null }
  RESOURCE_REVIEW: { resourceTitle, resourceType: "handout"|"video"|"link", resourceUrl }
  JOURNAL_PROMPT: { prompts: [], spaceSizeHint }
  BRING_TO_SESSION: { reminderText }
  FREE_TEXT_NOTE: { content: "<rich text>" }
  CHOICE: { description, options: [{ label, detail }] }

ENROLLMENT AND PROGRESS:
- Enrollment (id, participantId FK, programId FK, status ENUM [INVITED, ACTIVE, PAUSED, COMPLETED, DROPPED], currentModuleId FK nullable, enrolledAt, completedAt nullable)
- ModuleProgress (id, enrollmentId FK, moduleId FK, status ENUM [LOCKED, UNLOCKED, IN_PROGRESS, COMPLETED], unlockedAt, completedAt, customUnlock BOOLEAN default false)
- PartProgress (id, enrollmentId FK, partId FK, status ENUM [NOT_STARTED, IN_PROGRESS, COMPLETED], completedAt, responseData JSON nullable)
  - responseData stores participant responses:
    - CHECKLIST: { checkedItems: [0, 2, 3] }
    - JOURNAL_PROMPT: { responses: ["answer 1", "answer 2"] }
    - HOMEWORK: { items: [{ itemIndex: 0, completed: true, response: null }, { itemIndex: 1, completed: true, response: { selectedOption: 0 } }] }
    - ASSESSMENT: { answers: [{ questionIndex: 0, value: 2 }, ...], score: 45 }

STEADY SYSTEM:
- Task (id, participantId FK, title, description nullable, estimatedMinutes nullable, dueDate nullable, energyLevel ENUM [LOW, MEDIUM, HIGH] nullable, category nullable, isRecurring BOOLEAN, recurrenceRule JSON nullable, status ENUM [TODO, DONE, ARCHIVED], completedAt nullable, sourceType ENUM [MANUAL, HOMEWORK, CLINICIAN_PUSH, SESSION] nullable, sourceId nullable, sortOrder INT, createdAt, updatedAt)
- CalendarEvent (id, participantId FK, title, startTime, endTime, taskId FK nullable, eventType ENUM [TIME_BLOCK, SESSION, EXTERNAL_SYNC, CATCH_UP], color nullable, externalCalendarId nullable, createdAt, updatedAt)
- JournalEntry (id, participantId FK, entryDate DATE, promptPartId FK nullable, responses JSON nullable, freeformContent TEXT nullable, regulationScore INT nullable, isSharedWithClinician BOOLEAN default false, createdAt, updatedAt)

SESSIONS:
- Session (id, enrollmentId FK, scheduledAt, videoCallUrl nullable, status ENUM [SCHEDULED, COMPLETED, CANCELLED, NO_SHOW], clinicianNotes TEXT nullable, participantSummary TEXT nullable, moduleCompletedId FK nullable, createdAt, updatedAt)

NOTIFICATIONS:
- NotificationPreference (id, userId FK, category ENUM [MORNING_CHECKIN, HOMEWORK, SESSION, TASK, WEEKLY_REVIEW], enabled BOOLEAN, preferredTime TIME nullable, customSettings JSON nullable)

Add proper indexes: participantId on Task, enrollmentId on ModuleProgress and PartProgress, scheduledAt on Session. Add unique constraints: (enrollmentId, moduleId) on ModuleProgress, (enrollmentId, partId) on PartProgress, (participantId, entryDate) on JournalEntry.

Generate the migration with `npx prisma migrate dev --name init`.
```

**Claude Code Prompt 1.3 — Auth Setup:**
```
Set up authentication for the STEADY app using Clerk (or if you prefer a self-hosted approach, use better-auth with PostgreSQL adapter). Requirements:

1. In packages/api, create auth middleware that:
   - Validates JWT tokens from the auth provider
   - Extracts userId and role (CLINICIAN or PARTICIPANT) from the token
   - Attaches user context to the request object
   - Has a requireRole('CLINICIAN') middleware for clinician-only endpoints
   - Has a requireRole('PARTICIPANT') middleware for participant-only endpoints

2. In apps/web, set up the Clerk provider (or auth context) wrapping the Next.js app. Create a basic login/signup page at /auth with role selection (clinician vs participant).

3. In apps/mobile, set up the auth provider for Expo. Create a basic login/signup screen.

4. In packages/shared, export the User type and role enum so both apps can import them.

For now, the signup flow just creates the user — profile creation (ClinicianProfile, ParticipantProfile) will come later. Make sure the auth setup supports HIPAA requirements: session timeouts (30 min inactivity), secure token storage, and HTTPS-only cookies on web.
```

---

### Sprint 2 (Weeks 3–4): Clinician CAS — Program & Module Builder

**What:** Clinicians can create programs, add modules, and reorder them.

**Claude Code Prompt 2.1 — API: Program CRUD:**
```
In packages/api, create the program management API routes. All routes require CLINICIAN role.

POST /api/programs — Create a new program. Body: { title, description, cadence, enrollmentMethod, sessionType }. Auto-set clinicianId from auth context. Return the created program.

GET /api/programs — List all programs for the authenticated clinician. Include module count and enrollment count for each.

GET /api/programs/:id — Get a single program with all its modules (ordered by sortOrder) and basic enrollment stats (active count, completed count).

PUT /api/programs/:id — Update program settings (title, description, cadence, enrollmentMethod, sessionType, followUpCount, status). Validate ownership.

DELETE /api/programs/:id — Soft-delete (set status to ARCHIVED). Only if no active enrollments.

POST /api/programs/:id/clone — Clone a program (for template functionality). Deep-copy the program, all modules, and all parts. Set isTemplate=false on the clone, templateSourceId to the source. Return the new program.

Add input validation using zod for all request bodies. Create a shared zod schema in packages/shared that both API and frontend can use.
```

**Claude Code Prompt 2.2 — API: Module CRUD:**
```
In packages/api, create module management routes under /api/programs/:programId/modules. All routes require CLINICIAN role and ownership of the parent program.

POST /api/programs/:programId/modules — Create a module. Body: { title, subtitle, summary, estimatedMinutes, unlockRule }. Auto-set sortOrder to the next available position.

GET /api/programs/:programId/modules — List modules for a program, ordered by sortOrder. Include part count per module.

PUT /api/programs/:programId/modules/:id — Update module fields.

DELETE /api/programs/:programId/modules/:id — Delete module and cascade-delete all parts. Re-number sortOrder for remaining modules.

PUT /api/programs/:programId/modules/reorder — Reorder modules. Body: { moduleIds: [ordered array of IDs] }. Update sortOrder for all modules in one transaction.

Use a Prisma transaction for the reorder endpoint to ensure atomicity.
```

**Claude Code Prompt 2.3 — Web: CAS Layout and Program List:**
```
In apps/web, build the clinician CAS interface. 

1. Create the app layout at /app/(dashboard)/layout.tsx:
   - Left sidebar with navigation: "My Programs", "Participants", "Sessions", "Settings"
   - Top bar with clinician name and logout
   - Main content area
   - Use shadcn/ui Sidebar component

2. Create the Programs list page at /app/(dashboard)/programs/page.tsx:
   - Page title "My Programs" with a "Create Program" button
   - Grid of program cards showing: title, description, module count, active enrollment count, status badge (Draft/Published/Archived)
   - Click a card to navigate to /programs/[id]
   - "Create Program" opens a dialog (shadcn Dialog) with form: title (required), description (optional), cadence (select), session type (select)
   - On submit, call POST /api/programs and navigate to the new program's editor

3. Create the Program Editor page at /app/(dashboard)/programs/[id]/page.tsx:
   - Program header: editable title and description (inline edit, auto-save on blur)
   - Program settings panel (collapsible): cadence, enrollment method, session type, follow-up count, status toggle (Draft ↔ Published)
   - Module list: vertical list of module cards, each showing title, subtitle, estimated time, part count
   - "Add Module" button at the bottom of the list
   - Drag-and-drop reordering of modules using @dnd-kit/core (install it)
   - Click a module card to navigate to /programs/[id]/modules/[moduleId]

Use React Query (TanStack Query) for all data fetching. Set up the QueryClient provider in the dashboard layout.
```

---

### Sprint 3 (Weeks 5–6): CAS — Part Builder (Core Types)

**What:** Clinicians can add and edit parts inside modules.

**Claude Code Prompt 3.1 — API: Part CRUD:**
```
In packages/api, create part management routes under /api/programs/:programId/modules/:moduleId/parts.

POST .../parts — Create a part. Body: { type, title, isRequired, content }. Validate that `content` matches the expected shape for the given `type` using a zod discriminated union. Auto-set sortOrder.

GET .../parts — List parts for a module, ordered by sortOrder.

PUT .../parts/:id — Update a part's title, isRequired, or content. Validate content against type.

DELETE .../parts/:id — Delete a part. Re-number sortOrder.

PUT .../parts/reorder — Reorder parts. Body: { partIds: [ordered array] }.

Create a comprehensive zod discriminated union for part content validation in packages/shared:

PartContentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TEXT"), body: z.string(), sections: z.array(z.string()).optional() }),
  z.object({ type: z.literal("VIDEO"), url: z.string().url(), provider: z.enum(["youtube", "vimeo", "loom"]), transcriptUrl: z.string().url().optional() }),
  z.object({ type: z.literal("STRATEGY_CARDS"), deckName: z.string(), cards: z.array(z.object({ title: z.string(), body: z.string(), emoji: z.string().optional() })) }),
  z.object({ type: z.literal("JOURNAL_PROMPT"), prompts: z.array(z.string()).min(1), spaceSizeHint: z.enum(["small", "medium", "large"]).default("medium") }),
  z.object({ type: z.literal("CHECKLIST"), items: z.array(z.object({ text: z.string(), sortOrder: z.number() })) }),
  z.object({ type: z.literal("RESOURCE_LINK"), url: z.string().url(), description: z.string().optional() }),
  z.object({ type: z.literal("DIVIDER"), label: z.string() }),
  // HOMEWORK schema — include the full HomeworkItem discriminated union
  // ASSESSMENT, INTAKE_FORM, SMART_GOALS — stub these for Phase 2
])

Export these schemas from packages/shared.
```

**Claude Code Prompt 3.2 — Web: Module Editor with Part Builder:**
```
In apps/web, build the Module Editor at /app/(dashboard)/programs/[id]/modules/[moduleId]/page.tsx.

1. Module header: editable title, subtitle, summary, estimated time (inline edit, auto-save)

2. Module settings: unlock rule (Sequential/Manual/Time-based), if time-based show delay days input

3. Part list:
   - Vertical list of part cards, drag-and-drop reorderable with @dnd-kit
   - Each card shows: part type icon, title, required/optional badge, and an expand/collapse arrow
   - Expanding a card reveals the part editor (type-specific form — see below)
   - "Add Part" button that opens a dropdown menu with all available part types (icon + name for each)

4. Part editors by type (render inside the expanded card):

   TEXT: Rich text editor using Tiptap (install @tiptap/react @tiptap/starter-kit @tiptap/extension-image). Toolbar with heading, bold, italic, lists, image upload, callout block. Auto-save content on 2-second debounce.

   VIDEO: URL input field with auto-detection of provider (youtube/vimeo/loom based on URL pattern). Show video preview embed. Optional transcript URL field.

   STRATEGY_CARDS: 
   - Deck name input
   - List of cards, each with: title input, body textarea, emoji picker (use a simple emoji input or text field)
   - "Add Card" button
   - Cards reorderable via drag-and-drop
   - Delete card button (with confirmation)

   JOURNAL_PROMPT: 
   - List of prompt question inputs
   - "Add Prompt" button
   - Space size hint selector (small/medium/large)

   CHECKLIST:
   - List of checklist item text inputs
   - "Add Item" button
   - Reorderable

   RESOURCE_LINK:
   - URL input, description textarea

   DIVIDER:
   - Label text input

5. Each part card has a top-right menu (shadcn DropdownMenu): "Edit Title", "Toggle Required/Optional", "Duplicate", "Delete" (with confirmation dialog)

All edits auto-save via PUT to the API with a debounce. Show a small "Saving..." → "Saved" indicator.
```

---

### Sprint 4 (Weeks 7–8): CAS — Homework Builder

**What:** The rich homework sub-builder for Steady Work assignments.

**Claude Code Prompt 4.1 — Web: Homework Part Editor:**
```
In apps/web, build the Homework part editor. This is the most complex part type, rendered when a Part of type HOMEWORK is expanded in the Module Editor.

1. Homework-level settings (top of the editor):
   - Due timing: radio group — "Before next session" | "Specific date" (show date picker) | "X days after module unlock" (show number input)
   - Completion rule: radio — "All items required" | "X of Y" (show number input for minimum)
   - Reminder cadence: select — Daily | Every other day | Mid-week only

2. Homework item list:
   - Vertical list of homework items, drag-and-drop reorderable
   - "Add Item" button opens a dropdown with item types:
     - Action Item (icon: ✓)
     - Resource Review (icon: 📄)
     - Journal Prompt (icon: ✍️)
     - Bring-to-Session Reminder (icon: 🔔)
     - Free Text Note (icon: 📝)

   (Choice Item is Phase 2 — hide it or show as "Coming soon")

3. Item editors by type (rendered inline in the list):

   ACTION ITEM:
   - Description textarea (required)
   - Sub-steps: list of text inputs with "Add sub-step" button, reorderable
   - Checkbox: "Add to participant's Steady System as a task"
   - Optional: due date offset (number input, "days after module unlock")

   RESOURCE REVIEW:
   - Title input
   - Resource type: select (Handout / Video / Link)
   - If Handout: file upload button (PDF, images — store to S3, save URL)
   - If Video: URL input (same as Video part)
   - If Link: URL input

   JOURNAL PROMPT:
   - List of prompt question inputs with "Add prompt" button
   - Space size hint: select (Small / Medium / Large)

   BRING-TO-SESSION REMINDER:
   - Reminder text input (single line)

   FREE TEXT NOTE:
   - Rich text editor (same Tiptap instance as TEXT parts, but smaller)

4. Each item card has: drag handle, type icon and label, expand/collapse, delete button

5. Show a live "Participant Preview" panel on the right side (or toggle-able) that renders a read-only mock of what the participant will see for this homework. Strategy cards-style preview — just display the items in their participant-facing format. Use the same component structure that mobile will eventually use, but rendered as a web preview with mobile-like width (375px).

All changes auto-save via PUT to the parent Part's content field.
```

---

### Sprint 5 (Weeks 9–10): Participant API + Mobile Shell

**What:** Build the participant-facing API and the mobile app shell.

**Claude Code Prompt 5.1 — API: Enrollment and Program Delivery:**
```
In packages/api, create the participant-facing endpoints. All require PARTICIPANT role.

ENROLLMENT:
POST /api/enrollments/join — Join a program via invitation code. Body: { enrollmentCode }. Creates Enrollment, ModuleProgress for all modules (first module UNLOCKED, rest LOCKED based on unlock rules), and PartProgress for all parts in the first module (all NOT_STARTED).

GET /api/enrollments — List participant's enrollments with program title, status, current module, and overall progress percentage.

GET /api/enrollments/:id — Get enrollment detail with all modules and their statuses. For each module, include part count and completed part count.

MODULES AND PARTS:
GET /api/enrollments/:enrollmentId/modules/:moduleId — Get module detail with all parts (ordered). For each part, include the part content AND the participant's PartProgress (status, responseData). Only return if the module's ModuleProgress is UNLOCKED, IN_PROGRESS, or COMPLETED. Return 403 if LOCKED.

POST /api/enrollments/:enrollmentId/modules/:moduleId/parts/:partId/progress — Update part progress. Body: { status, responseData }. Validate responseData against the part type. When a required part is marked COMPLETED, check if all required parts in the module are done — if so, mark module as COMPLETED.

HOMEWORK SPECIFIC:
POST /api/enrollments/:enrollmentId/homework/:partId/items/:itemIndex/complete — Mark a specific homework item as complete. Update the responseData JSON for that part's PartProgress. If the homework item has addToSteadySystem=true and status is being set to complete for the first time, auto-create a Task for the participant with sourceType=HOMEWORK and sourceId=partId.

MODULE UNLOCK LOGIC:
Create a service function `checkAndUnlockNextModule(enrollmentId, completedModuleId)` that:
1. Finds the next module by sortOrder
2. If the next module's unlockRule is SEQUENTIAL and the current module is COMPLETED (AND the session for the current module is marked COMPLETED by clinician), set next module to UNLOCKED
3. If the next module's unlockRule is MANUAL, do nothing (clinician unlocks manually)
4. Create PartProgress entries for all parts in the newly unlocked module
```

**Claude Code Prompt 5.2 — Mobile: App Shell and Navigation:**
```
In apps/mobile, build the Expo app shell with bottom tab navigation.

1. Set up Expo Router (file-based routing) with these tabs:
   - Home (icon: house) — main dashboard
   - Tasks (icon: check-square) — Steady To-Do List
   - Calendar (icon: calendar) — Steady Calendar
   - Journal (icon: book-open) — Steady Journal
   - Program (icon: graduation-cap) — Module list and content

2. Create the Home screen (app/(tabs)/index.tsx):
   - Header: "Good [morning/afternoon/evening], [firstName]"
   - Section: "Today's Tasks" — list of tasks due today or overdue (from Task table)
   - Section: "Current Module" — card showing current module title, progress bar (X of Y parts complete), "Continue" button
   - Section: "Upcoming" — next session date/time with countdown, next homework due date
   - Floating Action Button (bottom-right): "+" for quick task capture — opens a bottom sheet with a text input and "Add Task" button

3. Set up TanStack Query (React Query) for data fetching in the mobile app. Create a shared API client in apps/mobile/src/api/client.ts that:
   - Uses the auth token from the auth provider
   - Points to the API base URL (configurable via env)
   - Handles 401s by redirecting to login

4. Create a shared color theme in apps/mobile/src/theme.ts:
   - Warm earth-tone palette: sage green (#8B9E81) as primary accent, warm amber (#D4A574) as secondary, cream (#F5F0E8) as background, charcoal (#2D2D2D) as text, soft gray (#E8E4DE) as borders
   - These match the "warm, calm, grounded" design principle from the PRD

5. Set up Expo Notifications for push notification handling (we'll wire up the backend later).
```

---

### Sprint 6 (Weeks 11–12): Mobile — Program Delivery

**What:** Participant can view modules and complete parts.

**Claude Code Prompt 6.1 — Mobile: Module List and Detail:**
```
In apps/mobile, build the Program tab screens.

1. Module List screen (app/(tabs)/program/index.tsx):
   - Fetch enrollments from GET /api/enrollments. For now, show the first active enrollment.
   - Vertical list of module cards, each showing:
     - Module number (1, 2, 3...)
     - Title and subtitle
     - Progress bar (completed parts / total required parts)
     - Status badge: 🔒 Locked (grayed out, not tappable) | ▶️ In Progress | ✅ Completed
   - Tap an unlocked or in-progress module to navigate to Module Detail

2. Module Detail screen (app/(tabs)/program/[moduleId].tsx):
   - Fetch from GET /api/enrollments/:enrollmentId/modules/:moduleId
   - Module title and summary at top
   - Vertical list of parts, rendered by type:

   TEXT part: Render rich HTML content using react-native-render-html. Support section breaks as swipeable pages (use a horizontal FlatList or PagerView for sections).

   VIDEO part: Embed using react-native-youtube-iframe for YouTube, or expo-video for direct URLs. Show playback speed control (0.75x, 1x, 1.25x, 1.5x, 2x). Mark as completed when >80% watched.

   STRATEGY_CARDS part: Horizontal swipeable card carousel using react-native-reanimated-carousel. Each card shows emoji (large, top), title (bold), body text. Cards have a soft cream/sage background with rounded corners. "Save" heart icon on each card — saves to a "My Strategies" collection accessible from the home screen.

   JOURNAL_PROMPT part: Show each prompt question with a multi-line TextInput below it. "Save" button at the bottom. On save, POST to the progress endpoint with responseData.

   CHECKLIST part: List of items with checkboxes. On check, update progress.

   RESOURCE_LINK part: Show title and description with a "View" button that opens the URL in the in-app browser (expo-web-browser).

   DIVIDER part: Horizontal line with centered label text.

   HOMEWORK part: This is the big one — see next prompt.

3. Part completion tracking: When a part is completed (video watched, checklist all checked, journal saved, etc.), call the progress endpoint. Show a small green checkmark on the part in the list. Update the module progress bar.
```

**Claude Code Prompt 6.2 — Mobile: Homework Delivery:**
```
In apps/mobile, build the Homework part renderer. This is rendered inside the Module Detail screen when the part type is HOMEWORK.

1. Homework header:
   - Title (e.g., "Module 1 — Steady Work")
   - Due date (calculated from dueTimingType): "Due before your next session on [date]" or "Due [date]"
   - Overall progress: "3 of 6 items complete" with a progress bar

2. Homework item list (vertical, scrollable within the module detail):

   ACTION ITEM:
   - Checkbox + description text
   - If sub-steps exist: indented sub-list with their own checkboxes
   - If addToSteadySystem is true and the item is checked: show a small tag "Added to your tasks ✓"
   - On check, call the homework item completion endpoint

   RESOURCE REVIEW:
   - Icon (📄 for handout, 🎬 for video, 🔗 for link) + title
   - "Review" button that opens the resource (in-app browser for links/handouts, video player for videos)
   - After opening, mark as "Reviewed" with a checkmark
   - Track: did they actually open it (call progress endpoint on open)

   JOURNAL PROMPT:
   - Each prompt question displayed with a TextInput below it
   - Space-size hint maps to TextInput height (small: 3 lines, medium: 6 lines, large: 10 lines)
   - "Save" button. On save, store responses in the PartProgress responseData AND create a JournalEntry for the participant with promptPartId linking back to this part.
   - Show "Saved ✓" after saving. Allow re-editing.

   BRING-TO-SESSION REMINDER:
   - Reminder icon (🔔) + reminder text
   - No interaction needed — it's informational
   - This text will also appear in session reminders (wired up in a later sprint)

   FREE TEXT NOTE:
   - Read-only rendered rich text from the clinician
   - Visually distinct: slightly different background color, maybe a left border accent
   - No interaction needed

3. Completion detection:
   - If completionRule is ALL: all items (except FREE_TEXT_NOTE and BRING_TO_SESSION which are informational) must be completed
   - Mark the HOMEWORK part as COMPLETED when the rule is met
   - Show a satisfying completion state — the progress bar fills, maybe a small confetti animation or color change

4. "Remind me" button at the bottom: adds this homework to the participant's task list as a single task "Complete Module X Steady Work" with the due date.
```

---

### Sprint 7 (Weeks 13–14): Mobile — Steady System (To-Do + Calendar)

**What:** The participant's core daily-use tools.

**Claude Code Prompt 7.1 — API: Task CRUD:**
```
In packages/api, create the task management endpoints for the Steady System to-do list.

POST /api/tasks — Create a task. Body: { title, description?, estimatedMinutes?, dueDate?, energyLevel?, category?, isRecurring?, recurrenceRule? }. Set participantId from auth. Set sourceType=MANUAL.

GET /api/tasks — List tasks for the participant. Query params:
  - status: "TODO" | "DONE" | "ALL" (default TODO)
  - dueDate: specific date (for "today's tasks")
  - dueBefore: date (for overdue tasks — dueDate < today AND status=TODO)
  - category: filter by category
  - sort: "dueDate" | "sortOrder" | "createdAt" (default sortOrder)
  Include a computed field `isOverdue` (dueDate < today AND status=TODO).

PUT /api/tasks/:id — Update any task fields. Validate ownership.

PUT /api/tasks/:id/complete — Mark a task as DONE. Set completedAt. Return the updated task.

PUT /api/tasks/:id/uncomplete — Mark a task back as TODO (for undo). Clear completedAt. Must be called within 60 seconds of completion (enforce server-side).

DELETE /api/tasks/:id — Soft-delete (set status to ARCHIVED).

PUT /api/tasks/reorder — Reorder tasks. Body: { taskIds: [ordered array] }.

POST /api/tasks/:id/promote-to-calendar — Create a CalendarEvent from a task. Body: { startTime, endTime }. Set taskId on the event.

RECURRING TASKS:
Create a background job (or cron) that runs daily:
- Find all recurring tasks where status=DONE and recurrenceRule matches today
- Create a new TODO task copying the title, description, category, energyLevel from the original
- RecurrenceRule JSON shape: { frequency: "DAILY"|"WEEKLY"|"MONTHLY"|"CUSTOM", daysOfWeek?: [0-6], dayOfMonth?: number, interval?: number }
```

**Claude Code Prompt 7.2 — Mobile: To-Do List Screen:**
```
In apps/mobile, build the Tasks tab (app/(tabs)/tasks/index.tsx).

1. Header: "Tasks" with a filter toggle (Today / All / Overdue)

2. Task list using a SectionList:
   - Section: "Overdue" (if any) — tasks with isOverdue=true, shown with a warm amber left border (not red — non-shaming). Header text: "These are waiting for you" (not "Overdue" or "Late")
   - Section: "Today" — tasks due today
   - Section: "Upcoming" — tasks due in the future, grouped by date
   - Section: "No due date" — tasks without a due date

3. Each task row:
   - Left: circular checkbox (empty for TODO, filled sage green with checkmark for DONE)
   - Center: task title. Below it in smaller gray text: due date (if set), estimated time (if set), energy dot (green/amber/red for low/med/high)
   - Right: chevron for task detail (or swipe actions)
   - If task has sourceType=HOMEWORK: small tag "From Module X"
   
   Tapping the checkbox:
   - Immediately mark as complete with optimistic UI update
   - Play a subtle scale-up animation on the checkbox
   - Show a bottom snackbar: "Task completed! [Undo]" for 10 seconds
   - On undo, call PUT /api/tasks/:id/uncomplete

4. Swipe actions (using react-native-gesture-handler Swipeable):
   - Swipe right: complete
   - Swipe left: reveal "Schedule" (promote to calendar) and "Delete" buttons

5. Floating Action Button (same as home screen):
   - Tap opens a bottom sheet with:
     - Auto-focused TextInput for task title
     - Keyboard appears immediately
     - Below the input: optional quick-add buttons for due date (Today / Tomorrow / Next Week / Pick date) and energy level (Low / Med / High)
     - "Add Task" button (also submittable via keyboard return key)
   - Target: capture a task in under 3 seconds (title only, return key to submit)

6. Pull-to-refresh to re-fetch tasks.
```

**Claude Code Prompt 7.3 — Mobile: Calendar Screen:**
```
In apps/mobile, build the Calendar tab (app/(tabs)/calendar/index.tsx).

1. Use react-native-calendars (install it) for the calendar component, but default to a DAY view showing time blocks, not the month view.

2. Day view (default):
   - Top: date selector strip (horizontal scrollable dates, today highlighted)
   - Below: vertical time grid from 6 AM to 11 PM (scrollable)
   - Time blocks rendered as colored rectangles on the grid:
     - SESSION events: sage green background with "Session with [clinician name]" and time
     - TIME_BLOCK events: the event's color or default amber
     - Tasks promoted to calendar: show task title in the block
     - CATCH_UP blocks: distinct pattern (hatched or dotted border)
   - Empty time slots are tappable: tap to create a new event or schedule a task at that time

3. "Schedule a task" flow:
   - Tap an empty time slot → bottom sheet slides up showing:
     - The selected time range (editable)
     - "Pick a task" — searchable list of unscheduled tasks (TODO status, no CalendarEvent linked)
     - Or "New event" — create a fresh calendar event with title and time
   - Selecting a task calls POST /api/tasks/:id/promote-to-calendar

4. Session blocks:
   - Sessions auto-appear on the calendar (fetch from GET /api/sessions for the participant's enrollment)
   - Session blocks show: time, "Session with [clinician name]", video call link button
   - Tapping a session block shows a card with: session details, pre-session checklist (if any bring-to-session reminders exist for the current module), and "Join Call" button

5. Week view toggle: button to switch between Day and Week view. Week view shows a condensed 7-column grid with colored blocks (no text, just visual density indicator). Tap a day in week view to switch to that day's day view.

6. Bottom of day view: "Unscheduled tasks" collapsed section showing count of tasks with a due date of today that aren't on the calendar yet. Expand to see them and quickly drag/assign to time slots.
```

---

### Sprint 8 (Weeks 15–16): Mobile — Journal + Clinician Dashboard Basics

**What:** Journaling and the minimum clinician dashboard.

**Claude Code Prompt 8.1 — API: Journal Endpoints:**
```
In packages/api, create journal endpoints.

POST /api/journal — Create a journal entry. Body: { entryDate, promptPartId?, responses?, freeformContent?, regulationScore? }. Unique constraint on (participantId, entryDate) — if an entry already exists for that date, update it instead (upsert behavior).

GET /api/journal — List journal entries for the participant. Query params: startDate, endDate, limit (default 30). Order by entryDate DESC.

GET /api/journal/:date — Get a specific day's journal entry.

PUT /api/journal/:id/share — Toggle isSharedWithClinician. Body: { shared: boolean }.

GET /api/journal/stats — Return journaling stats: { totalEntries, currentStreak, longestStreak, entriesThisWeek, averageRegulationScore (last 7 days) }. Streak calculation: count consecutive days with an entry, but forgive 1 missed day per 7-day window (the "steady, not perfect" rule). Implement this as: streak breaks only after 2 consecutive missed days.
```

**Claude Code Prompt 8.2 — Mobile: Journal Screen:**
```
In apps/mobile, build the Journal tab (app/(tabs)/journal/index.tsx).

1. Default view: today's entry (or the most recent if today doesn't exist yet)

2. Entry view:
   - Date header with left/right arrows to navigate days
   - If a clinician-authored prompt exists for today (from homework JournalPromptItems that are active):
     - Show "Today's Prompt" section with each prompt question
     - TextInput below each question
     - "Save Responses" button
   - Below prompts (or if no prompts): "Free Write" section
     - Large multi-line TextInput with placeholder "What's on your mind?"
     - Auto-saves on 3-second debounce after typing stops
   - Regulation check-in (bottom of entry):
     - "How regulated do you feel?" 
     - Row of 5 emoji buttons: 😫 (1) 😕 (2) 😐 (3) 🙂 (4) 😌 (5)
     - Tapping one highlights it and saves the score
   - "Share with clinician" toggle at the very bottom (default off)

3. Journal history: swipe left on the date header or tap a "History" button to see a list of past entries. Each shows: date, first few words of freeform content, regulation emoji, prompt response indicator (if prompts were answered).

4. Visual touches:
   - Journal has a warmer, creamier background than the other tabs (like writing on paper)
   - Subtle serif font for journal text (or at least the freeform section) to feel more personal
   - The regulation emoji row should feel tactile — slight scale-up on press

5. Journal streak indicator at the top of the tab: "🔥 5-day streak" or "Write today to keep your streak!" (warm, encouraging, never punishing)
```

**Claude Code Prompt 8.3 — Web: Clinician Dashboard — Participants:**
```
In apps/web, build the clinician dashboard participant views.

1. Participant List page (/app/(dashboard)/participants/page.tsx):
   - Table using shadcn Table component
   - Columns: Name, Program, Current Module, Homework Status (badge: Complete/Partial/Not Started), Last Active, Status Indicator
   - Status indicator: green dot (on-track: homework ≥80% complete, active in last 48h), amber dot (behind: homework <80% or inactive 3+ days), red dot (needs attention: homework not started or inactive 7+ days)
   - Search/filter by program
   - Click a row to go to participant detail

2. Participant Detail page (/app/(dashboard)/participants/[id]/page.tsx):
   - Left column (2/3 width):
     - Current enrollment: program name, enrolled date, current module
     - Module progress: vertical timeline showing each module with status (locked/unlocked/in-progress/completed) and completion percentage
     - Homework detail for current module: expandable section showing each homework item and its completion status. For journal prompt items, show the participant's responses (if shared). For choice items, show their selection. For action items, show checked/unchecked.
     - Session history: list of past sessions with dates, notes preview, and tasks assigned
   - Right column (1/3 width):
     - Quick actions: "Unlock Next Module", "Push a Task", "Schedule Session"
     - Intended outcomes (if set): list of SMART goals
     - Recent journal entries (if shared): last 3 entries with regulation score
   
3. Enrollment management:
   - On the Programs detail page, add an "Enrollments" tab
   - "Invite Participant" button: generates an invitation link or code
   - List of enrollments: participant name, status, enrolled date, current module
   - Actions per enrollment: Pause, Drop, Reset module progress
```

---

### Sprint 9 (Weeks 17–18): Sessions + Notifications + Template Seeding

**What:** Session management, push notifications, and the starter template.

**Claude Code Prompt 9.1 — API: Session Management:**
```
In packages/api, create session management endpoints.

CLINICIAN ENDPOINTS (require CLINICIAN role):
POST /api/sessions — Create a session. Body: { enrollmentId, scheduledAt, videoCallUrl? }. Create a CalendarEvent for the participant with eventType=SESSION.

GET /api/sessions — List sessions for the clinician. Query params: startDate, endDate, enrollmentId?. Include participant name and program title.

PUT /api/sessions/:id — Update session (reschedule, add/change video link).

PUT /api/sessions/:id/complete — Mark session as completed. Body: { clinicianNotes?, modulesCompleted?: [moduleId] }. If modulesCompleted is provided, mark those modules as COMPLETED and trigger the unlock check for the next module. This is the critical "unlock gate" — the clinician confirming the session happened and the module is done.

PARTICIPANT ENDPOINTS (require PARTICIPANT role):
GET /api/sessions/upcoming — Get the participant's next scheduled session with enrollment context.

GET /api/sessions/history — List past sessions with dates and any shared notes.
```

**Claude Code Prompt 9.2 — Push Notifications System:**
```
In packages/api, build the notification scheduling system.

1. Create a NotificationService class in packages/api/src/services/notifications.ts:

   - scheduleSessionReminders(sessionId): Schedule 3 notifications for a session (24h, 1h, 10min before). Store scheduled notification IDs.
   
   - scheduleHomeworkReminder(enrollmentId, partId): Based on the homework's reminderCadence, schedule recurring reminders. Check PartProgress — only send if homework is not yet COMPLETED.
   
   - scheduleMorningCheckin(participantId): Daily notification at the participant's preferred time. Body: "Good morning! Ready to check your Steady System?" (or similar warm copy from a pool of 5-7 rotating messages).
   
   - scheduleWeeklyReview(participantId): Weekly notification at preferred day/time. Body: "Time for your weekly review. How did this week go?"
   
   - sendTaskReminder(taskId): Send a reminder for a specific task based on its due date.

2. Notification copy — create a file packages/api/src/services/notificationCopy.ts with warm, non-judgmental message templates:
   - Morning check-in: ["Good morning! Your Steady System is ready when you are.", "Rise and steady! Let's see what today holds.", "New day, new chance to stay steady. Check your tasks?"]
   - Homework reminders: ["Your Steady Work is waiting — even a few minutes counts.", "Small progress is still progress. Ready to work on your homework?", "Your clinician will love to see your progress. Ready to tackle some Steady Work?"]
   - Session reminders: ["Session in [time]! Find a quiet space and have your Steady System ready.", "Quick heads-up: you have a session [time]. Got your headphones?"]
   - Weekly review: ["Sunday review time! What went well this week? What needs adjusting?", "Weekly check-in: how steady were you this week?"]

3. Use a job queue (BullMQ with Redis, or a simple pg-boss with PostgreSQL) to schedule and execute notifications. Jobs:
   - send-notification: takes { userId, title, body, data } and sends via Expo Push Notifications API
   - Scheduled jobs for recurring notifications (morning check-in, weekly review)
   - Session reminder jobs scheduled when a session is created

4. API endpoint for notification preferences:
   PUT /api/notifications/preferences — Body: { category, enabled, preferredTime? }
   GET /api/notifications/preferences — Return all preferences for the user
```

**Claude Code Prompt 9.3 — Starter Template Seed:**
```
In packages/db, create a seed script (prisma/seed.ts) that populates the "STEADY with ADHD — Standard 7-Week" template program.

Create a template program with isTemplate=true and the following structure. I'll detail Module 1 fully — follow the same pattern for Modules 2-7 using the content from the program document.

MODULE 1: "Intro, Assessment, and Intended Outcomes"
  subtitle: "What are you struggling with? How will we steady it?"
  estimatedMinutes: 45
  unlockRule: SEQUENTIAL
  
  Parts (in order):
  1. TEXT: "Welcome to STEADY with ADHD"
     body: Rich text covering the program structure (7 meetings, 6 modules + 1 wrap-up), weekly format (video, steady work, 1:1 meeting), and participant commitments (eliminate distractions, attend from private space, clear clutter, use headphones, laptop access, 1 hour/week steady work, bring steady system).

  2. ASSESSMENT: "STEADY Assessment"
     content: { questions: [
       { text: "I like to be doing active and exciting things", type: "LIKERT", scale: { min: 0, max: 3, labels: { 0: "Not at all, never", 1: "Just a little, once in a while", 2: "Pretty much, often", 3: "Very much, very frequently" } } },
       { text: "I make careless mistakes", type: "LIKERT", scale: ... },
       // ... all 24 items from the assessment
       { text: "I have trouble getting started on tasks", type: "LIKERT", scale: ... }
     ]}

  3. INTAKE_FORM: "ADHD History"
     content: { questions: [
       { text: "History of ADHD Symptoms", type: "FREE_TEXT" },
       { text: "Current medication?", type: "FREE_TEXT" },
       { text: "Current therapy?", type: "FREE_TEXT" },
       { text: "Current systems in place?", type: "FREE_TEXT" },
       { text: "What treatment have you tried?", type: "FREE_TEXT" },
       { text: "Relationship problems?", type: "FREE_TEXT" },
       { text: "Other mental health diagnoses?", type: "FREE_TEXT" },
       { text: "Current ADHD knowledge level?", type: "FREE_TEXT" },
       { text: "Barriers to success?", type: "FREE_TEXT" },
       { text: "What would steady look like for you?", type: "FREE_TEXT" }
     ]}

  4. SMART_GOALS: "Intended Outcomes"
     content: { goalCount: 3, prompts: { S: "What specific challenges do you want to address?", M: "How will you measure progress?", A: "Is this achievable in 7 weeks?", R: "Why does this matter to you now?", T: "What's your target timeline?" } }

  5. TEXT: "Memory and ADHD"
     body: Content covering prospective memory and working memory, why capture is essential, the Pre-Steady System concept.

  6. STRATEGY_CARDS: "Memory Strategies"
     content: { deckName: "Memory Strategies", cards: [
       { title: "Do it now or write it down", body: "If a task takes less than 2 minutes, do it immediately. Otherwise, write it in your Steady System.", emoji: "✍️" },
       { title: "Alarms are your friend", body: "You'll forget, don't pretend. Set alarms for anything time-sensitive.", emoji: "⏰" },
       { title: "Speak aloud the steps", body: "So you don't forget what's next. Verbalize your plan before starting.", emoji: "🗣️" },
       { title: "Give it a spot or lose it a lot", body: "Keys, wallet, phone — everything has a home. Always return items to their designated spot.", emoji: "📍" },
       { title: "Put the thing in the way", body: "So the thing you will take. Need to remember something? Put it physically in your path.", emoji: "🚧" },
       { title: "If the response you'll forget, mark as unread", body: "Emails and texts you need to respond to later — mark them unread so they stay visible.", emoji: "📩" }
     ]}

  7. HOMEWORK: "Module 1 — Steady Work"
     content: {
       dueTimingType: "BEFORE_NEXT_SESSION",
       completionRule: "ALL",
       reminderCadence: "EVERY_OTHER_DAY",
       items: [
         { type: "FREE_TEXT_NOTE", sortOrder: 0, content: "Build your STEADY SYSTEM. Choose one system that includes a calendar, to-do list, and journal." },
         { type: "CHOICE", sortOrder: 1, description: "Choose your Steady System format", options: [
           { label: "Paper Planner", detail: "Use any planner that includes a calendar, to-do list, and journal space. Examples: Anecdote, Erin Condren, Laurel Denise, Papier. Part of your calendar system can include a whiteboard placed somewhere visible." },
           { label: "Digital/Tech", detail: "Use any system that includes a calendar, to-do list, and journal. Make sure it syncs across devices. Mac: Fantastical, Notes, iCalendar. Android: Google Calendar, Proton Calendar." },
           { label: "This App", detail: "Use the STEADY app's built-in Steady System (Tasks, Calendar, and Journal tabs)." }
         ]},
         { type: "ACTION", sortOrder: 2, description: "Set up your chosen Steady System", addToSteadySystem: true, subSteps: ["Choose your system (paper or digital)", "Acquire or download it", "Set it up with calendar, to-do, and journal sections"] },
         { type: "RESOURCE_REVIEW", sortOrder: 3, resourceTitle: "Memory Handouts", resourceType: "handout", resourceUrl: "" },
         { type: "RESOURCE_REVIEW", sortOrder: 4, resourceTitle: "Module 1 Video Lesson", resourceType: "video", resourceUrl: "" },
         { type: "JOURNAL_PROMPT", sortOrder: 5, prompts: [
           "How confident are you (1–10) that the STEADY system will help you make meaningful changes? Why that number?",
           "What are your thoughts about journaling? Have you tried it before? What was that experience like?",
           "Did we address your specific needs in your intended outcomes? Was there anything we missed?",
           "Once you set up your STEADY SYSTEM, where will you keep it so you actually use it?"
         ], spaceSizeHint: "large" },
         { type: "BRING_TO_SESSION", sortOrder: 6, reminderText: "Bring your STEADY SYSTEM so we can begin using it together." }
       ]
     }

For Modules 2-7, follow the same structure using the content from the program slides. Focus on getting the skeleton right — titles, part types, strategy cards, and homework structures. Video URLs and handout URLs can be left empty (clinicians will fill these in when they clone the template).

Also create a "Blank Program" template with isTemplate=true, 0 modules, and default settings.

Run the seed with: npx prisma db seed
```

---

### Sprint 10 (Weeks 19–20): Integration, Testing, and Pilot Prep

**What:** Wire everything together, add the program progress bar, and prepare for pilot.

**Claude Code Prompt 10.1 — Mobile: Home Screen Integration:**
```
In apps/mobile, update the Home screen to pull real data and tie everything together.

1. Fetch participant data on mount:
   - GET /api/enrollments (active enrollment)
   - GET /api/tasks?dueBefore=today (overdue) + GET /api/tasks?dueDate=today (today's tasks)
   - GET /api/sessions/upcoming (next session)
   - GET /api/journal/stats (streak)

2. Render sections:
   - Greeting: "Good [timeOfDay], [firstName]"
   - Regulation quick check-in: if no entry for today, show the 5-emoji row right at the top. "How are you feeling?" Tapping saves and dismisses.
   - Program progress card: module X of Y, overall percentage bar, "Continue" button → navigates to current module
   - Today's tasks: compact list (max 5 shown, "See all" link). Each with checkbox for quick completion.
   - Overdue tasks: if any, amber-bordered section with "These are waiting for you" header
   - Upcoming: next session (countdown), next homework due (countdown)
   - Journal streak: "🔥 X-day streak" or "Write today to continue your streak"

3. Floating Action Button:
   - Quick task capture (same bottom sheet as Tasks tab)
   - Available on all screens via a global overlay

4. Pull-to-refresh on the entire home screen.

5. Program progress bar component (reusable — used on home screen and module list):
   - Takes: completedModules, totalModules, currentModulePartsCompleted, currentModuleTotalParts
   - Shows: segmented progress bar where each segment is a module. Completed modules are filled sage green, current module is partially filled, locked modules are gray.
```

**Claude Code Prompt 10.2 — Session Flow and Module Unlock:**
```
In apps/web, build the session completion flow that gates module progression.

1. On the Participant Detail page, add a "Sessions" tab:
   - List of scheduled/completed sessions with date, status, and notes
   - "Schedule Session" button: opens a dialog with date/time picker, optional video call URL input. Creates the session and triggers push notification scheduling.

2. For each scheduled session, show a "Complete Session" button (only visible on/after the scheduled date):
   - Opens a dialog with:
     - Clinician notes textarea (private by default)
     - Checkbox: "Share these notes with participant?" 
     - Dropdown: "Module completed in this session" — lists all in-progress modules for this enrollment
     - "Tasks assigned" — quick text inputs to create tasks that get pushed to the participant's to-do list (sourceType=SESSION)
     - "Complete Session" button
   - On submit: calls PUT /api/sessions/:id/complete which:
     - Marks session as COMPLETED
     - Marks selected module as COMPLETED  
     - Calls checkAndUnlockNextModule()
     - Creates any assigned tasks for the participant
     - The participant's app will reflect the new module unlock on next data fetch

3. Add a "Quick Unlock" button on the participant's module timeline:
   - Allows the clinician to manually unlock a module without completing a session (for the Module unlock override feature)
   - Calls a dedicated endpoint: PUT /api/enrollments/:id/modules/:moduleId/unlock

4. Test the full loop: clinician creates session → participant sees it on calendar → session happens → clinician marks complete → next module unlocks → participant sees new module available.
```

**Claude Code Prompt 10.3 — End-to-End Smoke Tests:**
```
Create an end-to-end test suite for the critical path. Use Vitest for API tests and Detox (or Maestro) for mobile tests.

API integration tests (packages/api/__tests__/):

1. test_full_program_lifecycle.ts:
   - Create a clinician user
   - Create a program with 3 modules, each with 2 parts (1 text, 1 homework)
   - Publish the program
   - Create a participant user
   - Enroll participant in the program
   - Verify: module 1 is UNLOCKED, modules 2-3 are LOCKED
   - Complete all parts in module 1
   - Create and complete a session marking module 1 done
   - Verify: module 2 is now UNLOCKED
   - Complete module 2, session, verify module 3 unlocks

2. test_homework_completion.ts:
   - Create a homework part with: 1 action item (addToSteadySystem=true), 1 journal prompt, 1 resource review
   - Enroll a participant
   - Complete the action item → verify a Task was auto-created with sourceType=HOMEWORK
   - Complete the journal prompt → verify a JournalEntry was created
   - Mark resource as reviewed
   - Verify the homework part status is COMPLETED

3. test_task_crud.ts:
   - Create, update, complete, uncomplete, delete tasks
   - Test overdue detection
   - Test promote-to-calendar

4. test_journal.ts:
   - Create entries, upsert behavior, streak calculation
   - Test the "forgive 1 miss per week" streak logic

5. test_notifications.ts:
   - Schedule session → verify 3 reminder jobs created
   - Complete homework → verify reminders cancelled
```

---

## Phase 2: Intelligence (Months 5–7)

**Goal:** Assessments, tracking, calendar sync, accountability, per-participant customization.

---

### Sprint 11 (Weeks 21–22): Assessment Builder + Delivery

**Claude Code Prompt 11.1:**
```
Build the Assessment system end-to-end.

CAS (apps/web):
1. In the Module Editor, when adding a part of type ASSESSMENT, show the Assessment Builder:
   - Assessment title and instructions inputs
   - Question list (drag-and-drop reorderable):
     - Each question: text input, answer type dropdown (Likert / Multiple Choice / Free Text / Yes-No)
     - If Likert: min/max inputs, label inputs for each scale point (e.g., 0="Not at all", 3="Very frequently")
     - If Multiple Choice: list of option inputs with "Add option" button
     - Optional: scoring weight input per question
   - Scoring section: auto-calculate (sum or average toggle), severity thresholds (e.g., 0-24 Low, 25-48 Moderate, 49-72 High)
   - Reassessment flag: "Re-administer at Module [dropdown]"

API (packages/api):
2. GET /api/enrollments/:id/assessments — List assessments for the enrollment with scores and dates taken.
3. When a reassessment is triggered (participant reaches the flagged module), auto-create a new PartProgress for the reassessment with a reference to the original assessment PartProgress for comparison.

Mobile (apps/mobile):
4. Assessment renderer in Module Detail:
   - Each question rendered with its appropriate input (slider for Likert, radio buttons for MC, TextInput for free text, toggle for yes/no)
   - "Submit Assessment" button at the bottom
   - After submission: show score with severity label and a brief interpretation
   - If this is a reassessment: show a comparison view — "Your Score: Initial [X] → Now [Y]" with a simple bar chart showing the change

Clinician Dashboard (apps/web):
5. On Participant Detail, show assessment results: scores, severity, and pre/post comparison chart if reassessment exists.
```

---

### Sprint 12 (Weeks 23–24): Pattern Tracker + Regulation Check-In

**Claude Code Prompt 12.1:**
```
Build the participant tracking and insights system.

API (packages/api):
1. Create a stats aggregation service (packages/api/src/services/stats.ts):
   - getTaskCompletionRate(participantId, startDate, endDate): completed / total tasks created in range
   - getTimeEstimationAccuracy(participantId, startDate, endDate): for tasks with both estimatedMinutes and actual duration tracked, return average (actual/estimated) ratio
   - getJournalingConsistency(participantId, startDate, endDate): days with entries / total days in range
   - getHomeworkCompletionRate(enrollmentId): for each module's homework, % of items completed
   - getRegulationTrend(participantId, startDate, endDate): array of { date, score } for chart rendering
   - getSystemCheckinAdherence(participantId, startDate, endDate): days where they opened the app / total days

2. GET /api/stats/participant — Return all stats for the authenticated participant, defaulting to last 4 weeks. Accept startDate/endDate query params.

3. GET /api/stats/participant/:participantId (clinician-only) — Same stats but for a specific participant.

Mobile (apps/mobile):
4. Create an Insights screen accessible from the Home screen (card: "View your patterns"):
   - Task completion: bar chart (last 4 weeks), each bar = 1 week
   - Regulation trend: line chart (last 28 days)
   - Journaling consistency: calendar heatmap (days with entries colored, days without empty)
   - Homework completion: per-module progress bars
   - Use react-native-chart-kit or victory-native for charts
   - All charts use the app's muted earth tone palette

5. Update the daily regulation check-in:
   - If no regulation score recorded today, show the emoji row on the Home screen prominently
   - After recording, show a small "Recorded ✓" confirmation
   - Track time estimation: when completing a task that had an estimatedMinutes value, show a quick prompt: "How long did this actually take? [number input] minutes". Save as task metadata.

Clinician Dashboard (apps/web):
6. On Participant Detail, add a "Patterns" tab:
   - Same charts as the participant sees, plus:
   - Table of "Homework barriers" aggregated from Steady Work Reviews (once those are built)
   - Highlight concerning trends: task completion dropping, regulation scores trending down, journaling stopped
```

---

### Sprint 13 (Weeks 25–26): Calendar Sync + Accountability Partners

**Claude Code Prompt 13.1:**
```
Build external calendar sync. Start with Google Calendar (highest adoption).

1. Set up Google Calendar API integration:
   - Add Google OAuth2 flow: clinician or participant connects their Google account
   - Store refresh tokens securely (encrypted in DB)
   - Create a CalendarSync model: (id, userId, provider ENUM [GOOGLE, APPLE, OUTLOOK], externalCalendarId, syncEnabled, lastSyncAt)

2. Sync logic (packages/api/src/services/calendarSync.ts):
   - Pull: Fetch events from Google Calendar for the next 30 days. Create/update CalendarEvent records with eventType=EXTERNAL_SYNC and externalCalendarId.
   - Push: When a CalendarEvent is created in the app (sessions, time blocks), create it in Google Calendar too.
   - Sync runs: on-demand (when participant opens calendar tab) + every 15 minutes via background job for active users.
   - Handle conflicts: external calendar is source of truth for external events; app is source of truth for app-created events.

3. Mobile: Add a "Connect Calendar" button in Settings → Calendar Sync. OAuth flow opens in the browser, redirects back to the app. Once connected, external events appear on the calendar in a distinct color (light gray) with a small Google icon.

4. Apple Calendar and Outlook: stub the provider enum but don't implement yet — add a "Coming soon" label in the UI.
```

**Claude Code Prompt 13.2:**
```
Build the Accountability Partner system.

Database:
1. Create AccountabilityPartner model: (id, participantId FK, partnerName, partnerEmail, inviteCode UNIQUE, inviteStatus ENUM [PENDING, ACCEPTED, REVOKED], createdAt)
2. Create PartnerWeeklySummary model: (id, partnerId FK, weekStartDate, tasksCompleted INT, totalTasks INT, journalEntries INT, nextSessionDate nullable, sentAt)

API:
3. POST /api/partners/invite — Body: { partnerName, partnerEmail }. Generate unique invite code. Send invite email with a link to a simple web page.
4. GET /api/partners — List accountability partners for the participant.
5. DELETE /api/partners/:id — Revoke partner access.
6. GET /api/partners/summary/:inviteCode — Public endpoint (no auth required, just the code). Returns the latest PartnerWeeklySummary for this partner. Only return aggregate data: tasks completed count, journal entry count, next session date. NEVER return task content, journal content, or clinical data.

7. Background job: generateWeeklySummaries — runs every Sunday evening:
   - For each active accountability partner, aggregate the participant's week:
     - Tasks completed vs total
     - Journal entries count
     - Next session date
   - Create a PartnerWeeklySummary record
   - Send a summary email to the partner

Mobile:
8. Settings → Accountability Partners:
   - "Invite a Partner" button: name and email inputs
   - List of partners with status (Pending/Active) and "Remove" button
   - Note: "Your partner will see a weekly summary of your activity. They will never see your task details, journal entries, or session content."
```

---

### Sprint 14 (Weeks 27–28): Steady Work Review + Session Prep + Per-Participant Customization

**Claude Code Prompt 14.1:**
```
Build the Steady Work Review system and clinician session preparation view.

CAS (apps/web):
1. Add a "Steady Work Review" configuration to the Program settings:
   - Toggle: Enable Steady Work Review (default on)
   - Review questions: editable list of questions with "Add question" button
   - Default questions (clinician can edit):
     - "What did you complete this week?"
     - "What worked well? Why?"
     - "What didn't work? What got in the way?"
     - "How much time did you spend on Steady Work?"
   - Barrier diagnostic checklist: editable list of checkable options
   - Defaults: "Wasn't written down", "Wasn't scheduled", "Activation stalled", "Time estimation failed", "The future didn't feel real", "Steps were unclear", "Prospective memory broke down", "Depended on someone else", "Forgot"

Database:
2. Create SteadyWorkReview model: (id, enrollmentId, moduleId, responses JSON, barriers JSON array of strings, submittedAt)

API:
3. POST /api/enrollments/:id/reviews — Submit a review. Body: { moduleId, responses: { questionIndex: answer }, barriers: ["Wasn't scheduled", "Activation stalled"] }
4. GET /api/enrollments/:id/reviews — List reviews for an enrollment.

Mobile:
5. Trigger: 24 hours before a scheduled session, show a notification "Time to complete your Steady Work Review for tomorrow's session."
6. Review screen: accessed from notification or from the Session Detail card on the calendar
   - Each review question with a TextInput
   - Barrier checklist: multi-select checkboxes
   - "Submit Review" button
   - After submit: "Great — your clinician will see this before your session."

Clinician Session Prep (apps/web):
7. On Participant Detail, add a "Prepare for Session" button that opens a full-screen prep view:
   - Left panel: Latest Steady Work Review (if submitted) — responses and barriers highlighted
   - Center panel: Homework status for current module — item-by-item detail
   - Right panel: Quick stats since last session (tasks completed, journal entries, regulation trend mini-chart), clinician's private notes from last session, participant's intended outcomes
   - Bottom: "Session Notes" textarea for the upcoming session (pre-saved as draft)
```

**Claude Code Prompt 14.2:**
```
Build per-participant homework customization.

CAS (apps/web):
1. On the Participant Detail page, add a "Customize" tab:
   - Shows the participant's current module and its homework
   - Homework items displayed in their order with toggle switches:
     - "Include" toggle (default on) — if toggled off, this item is hidden from this participant
     - "Add item" button at the bottom — same item type picker as the main Homework Builder, but this item is stored as a per-participant override
   - Supplemental resources: "Add Resource" button — title, URL, description. Stored as a per-participant attachment to the module.

Database:
2. Create EnrollmentOverride model: (id, enrollmentId, moduleId, partId nullable, overrideType ENUM [HIDE_HOMEWORK_ITEM, ADD_HOMEWORK_ITEM, ADD_RESOURCE, CLINICIAN_NOTE], overrideData JSON, createdAt)
   - HIDE_HOMEWORK_ITEM: { itemIndex: number }
   - ADD_HOMEWORK_ITEM: { item: HomeworkItem, afterIndex: number }
   - ADD_RESOURCE: { title, url, description }
   - CLINICIAN_NOTE: { content: string }

API:
3. POST /api/enrollments/:id/overrides — Create an override.
4. GET /api/enrollments/:id/overrides — List overrides for an enrollment.
5. DELETE /api/enrollments/:id/overrides/:overrideId — Remove an override.

6. Update the module/part delivery endpoint to merge overrides:
   - When fetching a HOMEWORK part for a participant, apply overrides:
     - Filter out items at indexes in HIDE_HOMEWORK_ITEM overrides
     - Insert items from ADD_HOMEWORK_ITEM overrides at the specified position
   - When fetching a module for a participant, append ADD_RESOURCE overrides as additional RESOURCE_LINK parts
   - Attach CLINICIAN_NOTE overrides as visible notes in the module (render as a highlighted callout)
```

---

## Phase 3: Polish and Scale (Months 8–10)

---

### Sprint 15 (Weeks 29–30): Gamification + Voice + Smart Notifications

**Claude Code Prompt 15.1:**
```
Build the gamification layer and voice capture.

Completion Animations (mobile):
1. Create a CompletionAnimation component using react-native-reanimated:
   - On task check-off: the checkbox does a spring scale-up (1.0 → 1.3 → 1.0), fills with sage green, shows a checkmark with a draw-on animation
   - Trigger Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) from expo-haptics
   - The task row fades slightly (opacity 0.6) and slides down in the list after 1 second

2. Streaks:
   - On the Home screen, show streak badges for: journaling, system check-in (opened app), homework
   - Streak logic (in the stats service): consecutive days with activity, but forgive 1 gap day per 7-day window
   - Visual: flame emoji + count + "day streak" label. If streak is 0, show encouraging text instead of 0.
   - Milestone popups: at 7, 14, 21, 30 days — show a brief celebratory bottom sheet "🎉 14-day journal streak! Steadiness looks good on you."

3. Module milestone celebrations:
   - When a module is marked COMPLETED, show a full-screen celebration overlay for 3 seconds:
     - Module title "Module 3 Complete ✓"
     - Brief clinician-authored message (if set in CAS) or default: "Great work staying steady!"
     - Confetti animation using react-native-confetti-cannon

Voice Capture (mobile):
4. Install expo-speech-recognition or react-native-voice
5. Long-press the FAB → activate voice recording → transcribe → populate the task title input
6. On the Journal screen, add a microphone button next to the TextInput → voice-to-text into the journal entry
7. Show a visual indicator while recording (pulsing red dot)

Smart Notification Escalation (API):
8. Track notification dismissals in the database: NotificationDismissal (id, userId, category, dismissedAt)
9. In the notification service, before sending a recurring reminder:
   - Count dismissals for this category in the last 7 days
   - If ≥ 3: change the notification body to a diagnostic prompt:
     - Instead of "Ready to check your tasks?" → "Seems like checking in has been hard this week. What's getting in the way?"
   - Reset the counter when the participant engages (opens the relevant screen)
```

---

### Sprint 16 (Weeks 31–32): Maintenance Phase + Unsteadiness Detector

**Claude Code Prompt 16.1:**
```
Build the post-program maintenance features.

CAS (apps/web):
1. In Program Settings, add a "Maintenance Phase" section:
   - Toggle: Enable maintenance phase (default on)
   - Follow-up session count (number input, default 2)
   - Follow-up timing: "First follow-up [X] weeks after program completion, second [Y] weeks after first" (two number inputs)
   - Content access: toggle "Participants can access program content after completion" (default on)
   - Maintenance journal prompts: list of prompt questions delivered on a cadence
   - Prompt cadence: Weekly / Biweekly / Monthly
   - Unsteadiness detector sensitivity: "Alert participant after [X] days of low engagement" (number input, default 3)

API:
2. When an enrollment status is set to COMPLETED:
   - If maintenance is enabled, schedule follow-up sessions
   - Begin delivering maintenance journal prompts on the configured cadence
   - Start the unsteadiness monitoring background job

3. Unsteadiness detector (background job, runs daily):
   - For each participant in maintenance phase, check the last N days (clinician-configured):
     - Task completion: did they complete any tasks?
     - Journal: did they write any entries?
     - App opens: did they open the app at all?
   - If ALL three are inactive for N consecutive days:
     - Send a notification: "It looks like your Steady System could use some attention. Here's your re-steady plan."
     - Link the notification to the participant's maintenance plan (if they created one in Module 7)

Mobile:
4. Maintenance plan creation (part of Module 7 homework):
   - A special part type or homework item where the participant writes their plan:
     - "How will I know if I'm becoming unsteady?" — TextInput
     - "What will I do to re-steady?" — TextInput
     - "Who is my accountability partner?" — TextInput
   - This plan is stored and referenced by the unsteadiness detector notifications

5. After program completion, the app continues to function normally:
   - Steady System (tasks, calendar, journal) fully available
   - Program tab shows completed program with all content accessible
   - Home screen adapts: no "current module" card, instead shows "Maintenance mode" with streak and pattern summary
   - Follow-up sessions appear on the calendar when scheduled by clinician
```

---

### Sprint 17 (Weeks 33–34): Multi-Clinician + Bulk Actions

**Claude Code Prompt 17.1:**
```
Build multi-clinician practice support and bulk actions.

Database:
1. Create Practice model: (id, name, ownerId FK to User, createdAt)
2. Create PracticeMembership model: (id, practiceId FK, clinicianId FK, role ENUM [OWNER, CLINICIAN], joinedAt)
3. Add practiceId nullable FK to Program — programs can belong to a practice for sharing.

API:
4. POST /api/practices — Create a practice (becomes owner). Body: { name }.
5. POST /api/practices/:id/invite — Invite a clinician by email. Creates a PracticeMembership with a pending status.
6. GET /api/practices/:id/members — List clinicians in the practice.
7. Practice-scoped program sharing: Programs with a practiceId are visible to all practice members as clonable templates. Each clinician's enrollments are still private to them unless the owner views the practice-wide dashboard.

8. Practice owner dashboard:
   - GET /api/practices/:id/stats — Aggregate across all clinicians: total active participants, total programs, completion rates.
   - GET /api/practices/:id/participants — All participants across all clinicians (owner only).

Bulk Actions (apps/web):
9. On the Participant List page, add checkboxes for multi-select:
   - Selected count shown in a floating action bar at the bottom
   - Actions: "Unlock Next Module" (for all selected), "Send Nudge" (custom push notification text), "Push Task" (task title — creates the same task for all selected participants)
   - Confirmation dialog before executing bulk actions
```

---

### Sprint 18 (Weeks 35–36): Content Versioning + Offline + Polish

**Claude Code Prompt 18.1:**
```
Build content versioning and offline support.

Content Versioning (packages/api):
1. Create ContentVersion model: (id, partId FK, versionNumber INT, content JSON, createdAt, createdBy FK)
2. Intercept Part updates: before updating content, save the current content as a new ContentVersion. Increment versionNumber.
3. GET /api/parts/:id/versions — List version history for a part.
4. POST /api/parts/:id/versions/:versionId/restore — Restore a specific version (creates a new version with the old content).
5. "Push to active participants" flow:
   - When a clinician edits a published program, show a banner: "You're editing a program with [N] active participants. Changes will apply to new enrollments only."
   - "Push to active participants" button: updates the Part content for all active enrollments' PartProgress (resets NOT_STARTED if the part content changed significantly).

Offline Support (apps/mobile):
6. Install @tanstack/react-query with AsyncStorage persistence:
   - Configure React Query to persist cached data to AsyncStorage
   - Stale time: 5 minutes for frequently changing data (tasks, journal), 1 hour for program content
   - Module text content, strategy cards, and homework structure are cached aggressively (they rarely change)
   
7. Optimistic mutations for task operations:
   - Creating a task: add to cache immediately, sync to server in background
   - Completing a task: mark as done in cache immediately, sync when online
   - If sync fails (offline): queue the mutation and retry when connectivity resumes
   - Use a simple offline mutation queue stored in AsyncStorage

8. Show an offline indicator in the app header when no connectivity detected.
```

---

## Phase 4: Expansion (Months 11+)

These sprints are less detailed — scope them based on learnings from the pilot.

### Sprint 19+: Template Marketplace

**Claude Code Prompt (Starter):**
```
Build the template marketplace foundation:
1. Program model additions: isPublished BOOLEAN (for marketplace), price DECIMAL nullable, description, previewImages
2. GET /api/marketplace — Public listing of published templates with preview, clinician author, and price
3. POST /api/marketplace/:programId/purchase — Clone the template for the purchasing clinician. Handle payment via Stripe.
4. Review/approval queue: admin endpoint to approve templates before they go live.
5. Web UI: "Marketplace" tab in the CAS sidebar, browse/search/filter templates, purchase flow.
```

### Sprint 20+: Self-Guided Tier

**Claude Code Prompt (Starter):**
```
Build self-guided program support:
1. Program setting: selfGuidedEnabled BOOLEAN, selfGuidedPrice DECIMAL
2. Self-guided enrollment: participant purchases directly (no clinician invite). No sessions.
3. Module unlock changes: in self-guided mode, modules unlock based on time (cadence) or part completion only — no session gate.
4. Remove session-dependent features from the participant UI when in self-guided mode.
5. Self-guided participants still get the Steady System, notifications, and tracking — just no clinician dashboard visibility.
```

### Sprint 21+: AI-Powered Features

**Claude Code Prompt (Starter):**
```
Build AI-assisted features using the Anthropic API (Claude):
1. Smart journal prompts: After a participant completes a regulation check-in with a low score, generate a personalized journal prompt based on their recent patterns. Call Claude API with context: recent regulation scores, barriers from Steady Work Reviews, and current module. Generate a warm, non-judgmental prompt.
2. Content quality assistant: In the CAS, offer a "Review my content" button for clinicians. Send the module content to Claude and get suggestions for clarity, ADHD-friendly formatting (shorter paragraphs, more action items, less wall-of-text), and tone (warm, non-judgmental).
3. Weekly insight summary: Generate a natural-language summary of the participant's week for the clinician session prep view. "This week, [name] completed 8 of 12 tasks, journaled 4 times, and reported feeling regulated most days. They flagged 'activation stalled' as a barrier in their review."
```

---

## Quick Reference: Sprint Summary

| Sprint | Weeks | Focus | Key Deliverable |
|--------|-------|-------|-----------------|
| 1 | 1–2 | Scaffolding | Monorepo, data model, auth |
| 2 | 3–4 | CAS: Programs & Modules | Clinician can create programs and modules |
| 3 | 5–6 | CAS: Parts | All core part types editable |
| 4 | 7–8 | CAS: Homework | Full homework builder with all item types |
| 5 | 9–10 | Participant API + Mobile shell | Enrollment, progress tracking, app navigation |
| 6 | 11–12 | Mobile: Program delivery | Participants can view modules and complete parts |
| 7 | 13–14 | Mobile: Steady System | To-do list and calendar functional |
| 8 | 15–16 | Mobile: Journal + Dashboard | Journaling and basic clinician dashboard |
| 9 | 17–18 | Sessions + Notifications + Template | Session flow, push notifications, starter template |
| 10 | 19–20 | Integration + Testing | Home screen wired up, E2E tests, pilot-ready |
| 11 | 21–22 | Assessments | Assessment builder + delivery + scoring |
| 12 | 23–24 | Tracking + Insights | Pattern tracker, charts, regulation trends |
| 13 | 25–26 | Calendar sync + Partners | Google Calendar, accountability partners |
| 14 | 27–28 | Reviews + Prep + Customization | Steady Work Review, session prep, per-participant overrides |
| 15 | 29–30 | Gamification + Voice + Smart notifs | Animations, streaks, voice capture, escalation |
| 16 | 31–32 | Maintenance phase | Unsteadiness detector, post-program features |
| 17 | 33–34 | Multi-clinician + Bulk | Practice support, bulk actions |
| 18 | 35–36 | Versioning + Offline + Polish | Content versioning, offline-first, final polish |
