# Homework Label Customization — Concept

## Problem Statement
Therapists on the platform are stuck with system-defined homework item type labels (ACTION, RESOURCE_REVIEW, JOURNAL_PROMPT, etc.) that feel generic, don't match their therapeutic modality's terminology, and don't reflect their practice's branding. This friction is silently tolerated — they want labels that speak their language and their clients' language.

## Recommended Approach
**Settings Defaults + Part-Level Override (Approach C).** Clinicians set their preferred labels for each of the 6 homework types in a settings page — these become their defaults across all programs. When creating individual homework items, the label field is editable so they can deviate for specific items. Custom labels flow through to participants on mobile, so the branding is client-facing.

## Key Scenarios
1. **Set-and-forget branding:** A therapist goes to settings, renames "ACTION" → "Weekly Practice" and "RESOURCE_REVIEW" → "Reading Assignment". From now on, every new homework item of those types uses the custom labels by default, and participants see the custom names.
2. **One-off override:** A therapist creating a specific homework item wants this particular one called "Mindfulness Exercise" even though their default for ACTION is "Weekly Practice". They edit the label inline at the part level.
3. **New therapist onboarding:** A therapist who hasn't customized anything sees the current system defaults — zero behavior change until they opt in.

## Out of Scope
- Practice-level label settings (shared across all clinicians in a practice) — this is per-clinician only
- Customizing the type *behavior* (only the display label changes, not functionality)
- Custom icons or colors per type
- Letting participants customize labels

## Open Questions
- Should existing homework items retroactively pick up new default labels, or only newly created items?
- When a therapist resets a label to default, what's the UX for that? (Clear button? Empty = default?)

## Alternatives Considered
- **Part-Level Only (Approach A)** — Too repetitive; therapists would have to rename every single item manually with no way to set defaults. Doesn't serve the branding use case well.
- **Settings Only (Approach B)** — No per-item flexibility; therapists who work across modalities or want a specific label for one item can't deviate. Approach C adds this for minimal extra effort.
