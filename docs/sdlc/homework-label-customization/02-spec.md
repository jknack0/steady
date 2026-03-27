# Homework Label Customization — Feature Specification

## Overview
Therapists are stuck with rigid system-defined homework item type labels (ACTION, RESOURCE_REVIEW, JOURNAL_PROMPT, BRING_TO_SESSION, FREE_TEXT_NOTE, CHOICE) that don't match their therapeutic modality or practice branding. This feature lets clinicians set custom default labels for each homework type in their settings, with the ability to override individual items. Custom labels are client-facing — participants see them on mobile.

**Label resolution order:** Part-level override → Clinician default → System default

## Functional Requirements

### FR-1: Clinician Default Label Settings
Clinicians can set custom display labels for each of the 6 homework item types in their settings page.

**Acceptance Criteria:**
- GIVEN a clinician on the Settings page
  WHEN they navigate to the Homework Labels section
  THEN they see all 6 homework types listed with their current labels (system defaults if never customized)

- GIVEN a clinician viewing the Homework Labels section
  WHEN they edit the label for "ACTION" to "Weekly Practice" and save
  THEN the custom label is persisted and shown as the current label for that type

- GIVEN a clinician with a custom label set
  WHEN they clear the label field and save
  THEN the label reverts to the system default for that type

- GIVEN a clinician who has never customized labels
  WHEN they view the Homework Labels section
  THEN all 6 types show their system default names

### FR-2: Retroactive Label Application
When a clinician changes their default label, existing homework items that haven't been individually overridden update to reflect the new default.

**Acceptance Criteria:**
- GIVEN a clinician with 5 existing "ACTION" homework items (none individually overridden)
  WHEN they set the default label for ACTION to "Weekly Practice"
  THEN all 5 items display "Weekly Practice" to both clinician and participant

- GIVEN a clinician with an existing "ACTION" item that was individually overridden to "Mindfulness Exercise"
  WHEN they change the default ACTION label to "Weekly Practice"
  THEN that item still displays "Mindfulness Exercise" (the override is preserved)

### FR-3: Part-Level Label Override
When creating or editing a homework item, clinicians can customize the display label for that specific item, overriding their default.

**Acceptance Criteria:**
- GIVEN a clinician creating a new homework item of type ACTION
  WHEN the item editor appears
  THEN the label field is pre-filled with their default label for ACTION (custom or system)

- GIVEN a clinician editing a homework item's label to "Mindfulness Exercise"
  WHEN they save the item
  THEN that item displays "Mindfulness Exercise" regardless of the clinician's default

- GIVEN a clinician with an overridden label on a homework item
  WHEN they click "Reset to default" or clear the label field
  THEN the label reverts to their current clinician default (or system default if none set)

### FR-4: Label Persistence on Default Removal
When a clinician removes a custom default, existing items that were using that default retain the last custom label.

**Acceptance Criteria:**
- GIVEN a clinician who set ACTION default to "Weekly Practice" and has 3 items using it
  WHEN they clear the ACTION default back to system default
  THEN those 3 existing items continue to display "Weekly Practice"

- GIVEN those same 3 items retaining "Weekly Practice"
  WHEN the clinician creates a NEW ACTION homework item
  THEN the new item uses the system default "ACTION" (since no clinician default exists anymore)

### FR-5: Participant-Facing Labels
Participants see the custom labels on mobile, not the system type names.

**Acceptance Criteria:**
- GIVEN a homework item with label "Weekly Practice" (whether from default or override)
  WHEN a participant views it in the mobile app
  THEN they see "Weekly Practice" as the item type label

- GIVEN a homework item with no custom label (system default)
  WHEN a participant views it in the mobile app
  THEN they see the system default label

### FR-6: Label Validation
Custom labels must be validated for length and content.

**Acceptance Criteria:**
- GIVEN a clinician entering a custom label
  WHEN the label exceeds 50 characters
  THEN the input is rejected with a validation error

- GIVEN a clinician entering a custom label
  WHEN the label is whitespace-only
  THEN it is treated as empty (falls back to default)

## Non-Functional Requirements

### NFR-1: Performance
- Loading clinician label defaults must add <50ms to settings page load
- Resolving display labels for homework items must not add perceptible latency to program/task views
- Label defaults should be fetched once and cached client-side via TanStack Query (invalidated on mutation)

### NFR-2: Security
- Only the owning clinician can read/write their label defaults (ownership check on API)
- Label values must be sanitized — no HTML/script injection in stored labels
- Audit logging applies to label default changes (standard Prisma audit middleware)
- Labels are not PHI, but the audit trail must still capture that a change was made (field name only, not values — per existing audit policy)

### NFR-3: Accessibility
- Label input fields must have proper `aria-label` attributes
- "Reset to default" button must be keyboard-accessible
- Settings section must be navigable via screen reader

## Scope

### In Scope
- Clinician-level default label settings for all 6 homework types
- Part-level label override on individual homework items
- Retroactive application of defaults to non-overridden items
- Label persistence when defaults are removed
- Participant-facing display of custom labels on mobile
- Reset-to-default UX (clear field + reset button)
- Label validation (50 char max, no whitespace-only)

### Out of Scope
- Practice-level label settings (shared across clinicians in a practice)
- Changing homework type behavior (only display labels change)
- Custom icons or colors per type
- Participant-side customization
- Bulk editing of labels across existing items
- Localization/translation of custom labels

## Dependencies
- Existing ClinicianConfig model (or extension thereof) for storing defaults
- Existing homework part editor UI for adding the label field
- Existing mobile part renderers for displaying custom labels

## Assumptions
- Participants are enrolled in one program at a time (no conflicting labels across programs)
- The 6 homework types are stable — no new types are being added concurrently
- Existing system default labels are acceptable as fallbacks (no need to change them)

## Glossary
- **System default**: The built-in label for a homework type (e.g., "ACTION", "RESOURCE_REVIEW")
- **Clinician default**: A custom label set by a clinician in settings, overriding the system default
- **Part-level override**: A custom label set on a specific homework item, overriding both clinician and system defaults
- **Label resolution order**: Part-level override → Clinician default → System default
