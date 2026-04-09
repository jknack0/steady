# Feelings Wheel Check-in — Feature Spec

## Overview

Add a `FEELINGS_WHEEL` field type to the existing Daily Tracker system, allowing participants to select up to 3 emotions from Willcox's 7-core feelings wheel taxonomy (with secondary and tertiary tiers) as part of their daily check-in. On the clinician side, a new dashboard widget and trends integration visualize emotion frequency and patterns over configurable time ranges.

## User Stories

### Clinician Stories
- As a clinician, I want to add a Feelings Wheel field to a participant's daily tracker so that I can collect structured emotion data between sessions.
- As a clinician, I want to view emotion frequency and trends over time on the dashboard so that I can identify emotional patterns and inform treatment planning.
- As a clinician, I want to see which specific emotions (at any tier depth) a participant selects most frequently so that I can surface nuanced emotional states in session.
- As a clinician, I want to filter emotion trend data by date range so that I can compare emotional patterns across treatment phases.

### Participant Stories
- As a participant, I want to quickly tap a core emotion on an interactive wheel and submit my check-in in under 10 seconds so that the process feels lightweight and I stay consistent.
- As a participant, I want to optionally drill deeper into secondary and tertiary emotions so that I can more precisely capture how I feel on reflective days.
- As a participant, I want to select up to 3 emotions per check-in so that I can express mixed emotional states.
- As a participant, I want to see my selected emotions summarized before submitting so that I can confirm my choices.

## Taxonomy

The complete Willcox 7-core feelings wheel, organized into 3 tiers:

### Happy
- **Playful**: Aroused, Cheeky
- **Content**: Free, Joyful
- **Interested**: Curious, Inquisitive
- **Proud**: Successful, Confident
- **Accepted**: Respected, Valued
- **Powerful**: Courageous, Creative
- **Peaceful**: Loving, Thankful
- **Trusting**: Sensitive, Intimate
- **Optimistic**: Hopeful, Inspired

### Sad
- **Lonely**: Isolated, Abandoned
- **Vulnerable**: Victimized, Fragile
- **Despair**: Grief, Powerless
- **Guilty**: Ashamed, Remorseful
- **Depressed**: Inferior, Empty
- **Hurt**: Embarrassed, Disappointed

### Angry
- **Let Down**: Betrayed, Resentful
- **Humiliated**: Disrespected, Ridiculed
- **Bitter**: Indignant, Violated
- **Mad**: Furious, Jealous
- **Aggressive**: Provoked, Hostile
- **Frustrated**: Infuriated, Annoyed
- **Distant**: Withdrawn, Numb
- **Critical**: Skeptical, Dismissive

### Fearful
- **Scared**: Helpless, Frightened
- **Anxious**: Overwhelmed, Worried
- **Insecure**: Inadequate, Inferior
- **Weak**: Worthless, Insignificant
- **Rejected**: Excluded, Persecuted
- **Threatened**: Nervous, Exposed

### Disgusted
- **Disapproving**: Judgmental, Embarrassed
- **Disappointed**: Appalled, Revolted
- **Awful**: Nauseated, Detestable
- **Repelled**: Hesitant, Horrified

### Surprised
- **Startled**: Shocked, Dismayed
- **Confused**: Disillusioned, Perplexed
- **Amazed**: Astonished, Awe
- **Excited**: Eager, Energetic

### Bad
- **Bored**: Indifferent, Apathetic
- **Busy**: Pressured, Rushed
- **Stressed**: Overwhelmed, Out of Control
- **Tired**: Sleepy, Unfocused

**Total**: 7 core, ~53 secondary, ~106 tertiary emotions. Stored as a static constant in `@steady/shared`.

## Requirements

### R1: FEELINGS_WHEEL Field Type in Prisma and Zod
**Description:** Add `FEELINGS_WHEEL` to the `TrackerFieldType` enum and Zod schemas.
**Acceptance Criteria:**
- [ ] `TrackerFieldType` Prisma enum includes `FEELINGS_WHEEL`
- [ ] `TrackerFieldTypeEnum` Zod enum includes `FEELINGS_WHEEL`
- [ ] New `FeelingWheelOptionsSchema`: `{ maxSelections: z.number().int().min(1).max(5).default(3) }`
- [ ] `CreateTrackerFieldSchema` superRefine validates FEELINGS_WHEEL options
- [ ] Existing field types unaffected (regression tests pass)
- [ ] Database migration applies cleanly

### R2: Feelings Wheel Taxonomy Constant
**Description:** Ship the complete Willcox taxonomy as a typed constant in `@steady/shared`.
**Acceptance Criteria:**
- [ ] `FEELINGS_WHEEL_TAXONOMY` exported from `packages/shared/src/constants/feelings-wheel.ts`
- [ ] Structure: `Array<{ id, label, color, children: Array<{ id, label, children: Array<{ id, label }> }> }>`
- [ ] Stable kebab-case IDs (e.g., `"happy"`, `"happy-playful"`, `"happy-playful-aroused"`)
- [ ] Helper functions: `getEmotionById()`, `getEmotionTier()`, `getCoreEmotion()`, `getEmotionLabel()`
- [ ] Re-exported from package index

### R3: Response Storage Format
**Description:** Define how feelings wheel selections are stored in `DailyTrackerEntry.responses`.
**Acceptance Criteria:**
- [ ] Response value is `string[]` of emotion IDs
- [ ] Array length validated against field's `maxSelections` at service layer
- [ ] Each emotion ID validated against taxonomy constant
- [ ] Empty array acceptable if field not required

### R4: Tracker Template with Feelings Wheel
**Description:** Add a preset template including a Feelings Wheel field.
**Acceptance Criteria:**
- [ ] New `"feelings-check-in"` template in `tracker-templates.ts`
- [ ] Template cloneable via existing endpoint
- [ ] Appears in template picker on web

### R5: API Trends Endpoint — Emotion Aggregation
**Description:** Extend `GET /api/daily-trackers/:id/trends` for `FEELINGS_WHEEL` fields.
**Acceptance Criteria:**
- [ ] Response includes `emotionTrends` keyed by field ID
- [ ] Contains: `frequencies`, `byDate`, `topEmotions` (top 10)
- [ ] Existing date range filtering applies
- [ ] Existing trend data unaffected

### R6: Clinician Dashboard Widget — Emotion Trends
**Description:** New dashboard widget for emotion frequency and patterns.
**Acceptance Criteria:**
- [ ] `emotion_trends` widget in `WIDGET_REGISTRY`, `page: "client_overview"`, `requiresModule: "daily_tracker"`
- [ ] Settings: `{ daysBack: z.number().int().min(7).max(90).default(30) }`
- [ ] Horizontal bar chart, color-coded by core emotion
- [ ] Empty state when no FEELINGS_WHEEL field exists

### R7: Mobile Feelings Wheel Field Renderer
**Description:** Interactive feelings wheel component for mobile tracker form.
**Acceptance Criteria:**
- [ ] 7 core emotions as tappable colored segments/buttons
- [ ] Drill-down for tier 2 → tier 3
- [ ] Selected emotions as removable chips
- [ ] Client-side max selection enforcement
- [ ] Haptic feedback, edit mode support, accessibility

### R8: Web Clinician Tracker Field Editor
**Description:** Allow clinicians to add/configure a Feelings Wheel field on web.
**Acceptance Criteria:**
- [ ] `FEELINGS_WHEEL` in field type dropdown
- [ ] `maxSelections` config input (1-5, default 3)
- [ ] Preview shows 7 core emotions read-only

### R9: Web Clinician Data View — Emotion Entries
**Description:** Render feelings wheel responses as colored emotion chips.
**Acceptance Criteria:**
- [ ] Color-coded chips with emotion label
- [ ] Tier depth visible
- [ ] Tooltip with full path on click

### R10: RTM Engagement Event
**Description:** Verify feelings wheel completion counts as RTM engagement.
**Acceptance Criteria:**
- [ ] Existing mechanism handles this automatically
- [ ] Verified with a test

## Data Model Changes
1. `TrackerFieldType` enum — Add `FEELINGS_WHEEL`
2. `DailyTrackerField.options` (Json?) — Stores `{ maxSelections: number }` for FEELINGS_WHEEL
3. `DailyTrackerEntry.responses` (Json) — Value is `string[]` for FEELINGS_WHEEL
4. No new tables or columns required

## API Changes
| Endpoint | Change |
|---|---|
| `POST /api/daily-trackers` | `FEELINGS_WHEEL` now valid |
| `PUT /api/daily-trackers/:id` | Same |
| `POST /api/daily-trackers/from-template` | New template uses existing flow |
| `GET /api/daily-trackers/templates` | Returns new template |
| `POST /api/participant/daily-trackers/:id/entries` | Service-layer validation |
| `GET /api/daily-trackers/:id/trends` | Extended with `emotionTrends` |

## Scope Boundaries
### In Scope
- FEELINGS_WHEEL field type (Prisma, Zod, templates)
- Static Willcox 7-core taxonomy in @steady/shared
- Mobile interactive drill-down renderer
- Web field editor, data view, and dashboard widget
- Trends API extension
- RTM engagement tracking (automatic)

### Out of Scope
- Custom emotion taxonomies
- Intensity/severity rating
- AI pattern detection or alerts
- Standalone emotion module
- Multiple check-ins per day
- Localization of emotion labels
- Cross-client aggregate analytics

## Dependencies
- Existing Daily Tracker system
- Dashboard widget system (WIDGET_REGISTRY)
- Recharts (visualization)
- expo-haptics (mobile feedback)
- RTM engagement tracking

## Risks
1. Taxonomy size on mobile — mitigated by drill-down UX
2. Schema migration — test on staging first
3. Response validation backward compatibility — validate only FEELINGS_WHEEL fields
4. Taxonomy versioning — append-only, never remove IDs
5. Trends query performance — monitor for large date ranges
6. Mobile UX complexity — user test during UX phase
