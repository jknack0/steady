# Test Plan: Homework Item Type Label Customization

**Feature Spec:** `docs/specs/homework-label-customization.md`
**Status: READY**

## Overview

Covers the homework item type label customization feature — clinicians can rename the display labels of the 6 homework item types (ACTION, RESOURCE_REVIEW, JOURNAL_PROMPT, BRING_TO_SESSION, FREE_TEXT_NOTE, CHOICE). Labels stored per-clinician in `ClinicianConfig.homeworkItemLabels` (nullable JSON), flow to participants via resolved config with defaults merged.

---

## 1. Shared Schema Tests

**File:** `packages/shared/src/__tests__/config-schema.test.ts` (extend existing)

### 1.1 HomeworkItemLabelsSchema

| ID | Scenario | Input | Expected | Priority |
|----|----------|-------|----------|----------|
| SCH-001 | Accepts a single valid type-label pair | `{ ACTION: "Steady Work" }` | `success: true` | P0 |
| SCH-002 | Accepts all 6 valid type-label pairs | Full record with all 6 types | `success: true` | P0 |
| SCH-003 | Accepts a partial subset (3 of 6 types) | `{ ACTION: "Do It", CHOICE: "Pick One", JOURNAL_PROMPT: "Reflect" }` | `success: true` | P0 |
| SCH-004 | Rejects an invalid homework item type key | `{ INVALID_TYPE: "Label" }` | `success: false` | P0 |
| SCH-005 | Rejects a label exceeding 50 characters | `{ ACTION: "a".repeat(51) }` | `success: false` | P0 |
| SCH-006 | Accepts a label at exactly 50 characters | `{ ACTION: "a".repeat(50) }` | `success: true` | P1 |
| SCH-007 | Rejects a whitespace-only label | `{ ACTION: "   " }` | `success: false` (trim + min(1)) | P0 |
| SCH-008 | Trims whitespace from labels | `{ ACTION: "  Steady Work  " }` | Parsed value: `"Steady Work"` | P0 |
| SCH-009 | Rejects an empty string label | `{ ACTION: "" }` | `success: false` | P0 |
| SCH-010 | Accepts empty object (clears all custom labels) | `{}` | `success: true` | P0 |
| SCH-011 | Accepts label with special characters | `{ ACTION: "Action Item (v2) & More!" }` | `success: true` | P1 |
| SCH-012 | Accepts a single-character label | `{ ACTION: "A" }` | `success: true` | P1 |
| SCH-013 | Rejects numeric value for label | `{ ACTION: 123 }` | `success: false` | P1 |
| SCH-014 | Rejects null value for label | `{ ACTION: null }` | `success: false` | P1 |

### 1.2 SaveClinicianConfigSchema with homeworkItemLabels

| ID | Scenario | Input | Expected | Priority |
|----|----------|-------|----------|----------|
| SCH-020 | Accepts valid config without homeworkItemLabels | Existing valid config, no field | `success: true` | P0 |
| SCH-021 | Accepts valid config with homeworkItemLabels | Valid config + `{ ACTION: "Steady Work" }` | `success: true` | P0 |
| SCH-022 | Accepts valid config with empty object | Valid config + `homeworkItemLabels: {}` | `success: true` | P0 |
| SCH-023 | Rejects config with invalid key | Valid config + `{ BOGUS: "x" }` | `success: false` | P0 |
| SCH-024 | Rejects config with label too long | Valid config + `{ ACTION: "a".repeat(51) }` | `success: false` | P0 |

---

## 2. API Integration Tests

**File:** `packages/api/src/__tests__/config.test.ts` (extend existing)

### 2.1 PUT /api/config — Saving homeworkItemLabels

| ID | Scenario | Request Body | Expected | Priority |
|----|----------|-------------|----------|----------|
| INT-001 | Saves config with homeworkItemLabels | Valid config + `{ ACTION: "Steady Work", CHOICE: "Pick One" }` | 200, upsert called with labels in create and update | P0 |
| INT-002 | Saves config without homeworkItemLabels (preserves existing) | Valid config, no field | 200, labels NOT in upsert data | P0 |
| INT-003 | Saves config with empty homeworkItemLabels | Valid config + `homeworkItemLabels: {}` | 200, upsert with `{}` | P0 |
| INT-004 | Rejects invalid type key | `homeworkItemLabels: { NOPE: "Bad" }` | 400 | P0 |
| INT-005 | Rejects label exceeding 50 chars | `homeworkItemLabels: { ACTION: "a".repeat(51) }` | 400 | P0 |
| INT-006 | Rejects whitespace-only label | `homeworkItemLabels: { ACTION: "   " }` | 400 | P0 |
| INT-007 | Requires authentication | No auth header | 401 | P0 |
| INT-008 | Requires CLINICIAN role | `participantAuthHeader()` | 403 | P1 |

### 2.2 GET /api/participant/config — Resolved config

| ID | Scenario | Mock Data | Expected | Priority |
|----|----------|-----------|----------|----------|
| INT-010 | Returns all 6 defaults when no custom labels | `homeworkItemLabels: null` | All 6 types with default values | P0 |
| INT-011 | Merges custom labels over defaults | `{ ACTION: "Steady Work", CHOICE: "Pick One" }` | Custom values override, others default | P0 |
| INT-012 | Returns all defaults when empty object | `homeworkItemLabels: {}` | All 6 defaults | P0 |
| INT-013 | All 6 types always present in response | Any config | Exactly 6 keys | P0 |
| INT-014 | No active enrollment returns 404 | null enrollment | 404 | P0 |
| INT-015 | Requires PARTICIPANT role | clinician token | 403 | P1 |

### 2.3 GET /api/config — Clinician config read

| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| INT-020 | Returns config including homeworkItemLabels | Field present | P1 |
| INT-021 | Returns null when never set | `homeworkItemLabels: null` | P1 |

---

## 3. Shared Constants Tests

**File:** `packages/shared/src/__tests__/config-schema.test.ts`

| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| CONST-001 | DEFAULT_HOMEWORK_ITEM_LABELS has exactly 6 entries | 6 keys | P0 |
| CONST-002 | All 6 homework item type keys present | Keys match expected set | P0 |
| CONST-003 | All default labels are non-empty strings | Every value is string with length > 0 | P1 |

---

## 4. Frontend Tests (Web)

### 4.1 Settings Page — Homework Labels Card

**File:** `apps/web/src/__tests__/homework-labels-settings.test.tsx` (new)

| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| FE-001 | Renders 6 label input fields | 6 inputs with default placeholders | P0 |
| FE-002 | Displays existing custom labels | ACTION input has "Steady Work" value | P0 |
| FE-003 | Clearing input removes custom label | Mutation omits cleared field | P0 |
| FE-004 | Typing custom label updates state | Input value changes | P0 |
| FE-005 | Enforces maxLength=50 | Input capped at 50 chars | P1 |

### 4.2 Homework Editor — Custom Labels in Type Picker

**File:** `apps/web/src/__tests__/homework-editor-labels.test.tsx` (new)

| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| FE-010 | Type picker shows defaults when no custom labels | Default labels visible | P0 |
| FE-011 | Type picker shows custom labels when configured | "Steady Work" instead of "Action Item" | P0 |
| FE-012 | All 6 options rendered regardless of config | 6 type options | P1 |

---

## 5. Edge Cases

| ID | Edge Case | Where to Test | Expected | Priority |
|----|-----------|---------------|----------|----------|
| EDGE-001 | Clear single label (was custom, now empty) | API, Frontend | Default applies | P0 |
| EDGE-002 | Never saved any config | API | All defaults | P0 |
| EDGE-003 | Explicit `{}` saved | API, Schema | All defaults | P0 |
| EDGE-004 | Config saved without field | API | Existing labels preserved | P0 |
| EDGE-005 | Label exactly 1 character | Schema | Valid | P1 |
| EDGE-006 | Label exactly 50 characters | Schema | Valid | P1 |
| EDGE-007 | Label 51 characters | Schema | Rejected | P0 |
| EDGE-008 | Label with emoji | Schema | Valid if within limit | P2 |

---

## 6. Test File Organization

| Test Type | File Location | Status |
|-----------|--------------|--------|
| Schema validation | `packages/shared/src/__tests__/config-schema.test.ts` | Extend existing |
| API integration | `packages/api/src/__tests__/config.test.ts` | Extend existing |
| Settings UI | `apps/web/src/__tests__/homework-labels-settings.test.tsx` | New |
| Homework editor labels | `apps/web/src/__tests__/homework-editor-labels.test.tsx` | New |

## 7. Implementation Order

1. **Schema tests first** (SCH-*) — define the contract, fastest to write/run
2. **API integration tests** (INT-*) — exercise full request pipeline
3. **Frontend tests** (FE-*) — depend on stable API contract

Within each group: P0 first, then P1. P2 optional.

## 8. Notes

- `DEFAULT_HOMEWORK_ITEM_LABELS` is single source of truth — import from `@steady/shared` in all tests
- When `homeworkItemLabels` absent from PUT body, service must NOT overwrite existing with null
- Existing test helpers (`createTestToken`, `authHeader`, etc.) are sufficient — no new helpers needed
