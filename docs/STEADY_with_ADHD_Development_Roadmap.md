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

## Sprint Status Tracker

> Last updated: 2026-04-05

### Completed Sprints

| Sprint | Name | Status | Deferred Items |
|--------|------|--------|---------------|
| 1-10 | Core Platform | ✅ SHIPPED | Foundation: auth, programs, modules, 12 part types, enrollments, tasks, calendar, journal, notifications, sessions, stats |
| 11 | Assessment Builder | ✅ SHIPPED | Assessment part type, editor, mobile renderer, reassessment comparison |
| 12 | Pattern Tracker + Regulation Check-In | ✅ SHIPPED | Stats service, mobile insights, clinician patterns tab |
| 14 | Steady Work Review + Session Prep | ✅ SHIPPED | Deferred: 24h notification trigger, override merge into participant delivery |
| 15 | Gamification + Voice + Smart Notifications | ✅ SHIPPED | Deferred: expo-speech-recognition install, voice capture implementation |
| 19 | Appointment Scheduling (Clinician Calendar) | ✅ SHIPPED | Full clinician web calendar + participant mobile appointments |

### Features Shipped Outside Original Roadmap

| Feature | Description |
|---------|-------------|
| Clinician Patient Invitations | Invite flow with encrypted codes |
| Program Template Cloning | Deep-copy templates with module/part exclusions |
| Program Flow Redesign | Two-tab layout, status gate removal |
| Client Program Builder | Create blank programs for specific clients |
| Calendar Views (Mobile) | Day/week/month views for participant calendar events |
| Feelings Wheel Check-In | Emotion wheel as daily tracker type |
| Homework Label Customization | Custom labels on homework items |
| PHI Detection Engine | Python sidecar service for AI endpoint guardrails |
| HIPAA Tier 1/2/3 Fixes | Zod validation, Docker non-root, field encryption, inactivity timeout, soft deletes |
| JWT Cookie Migration | httpOnly cookies replacing localStorage tokens |
| Demo Provisioning | Instant demo accounts with cloned admin data |
| Landing Page + Waitlist | Marketing page with waitlist signup |

### Remaining Sprints

| Sprint | Name | Status |
|--------|------|--------|
| 13 | Calendar Sync + Accountability Partners | ⏳ NOT STARTED — requires Google OAuth |
| 16 | Maintenance Phase + Unsteadiness Detector | ⏳ NOT STARTED |
| 17 | Multi-Clinician + Bulk Actions | ⏳ NOT STARTED |
| 18 | Content Versioning + Offline + Polish | ⏳ NOT STARTED |
| 19+ | Template Marketplace | ⏳ NOT STARTED |
| 20+ | Self-Guided Tier | ⏳ NOT STARTED |
| 21+ | AI-Powered Features | ⏳ NOT STARTED |

---

## Remaining Sprint Details

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
