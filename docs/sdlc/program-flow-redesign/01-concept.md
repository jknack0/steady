# Program Flow Redesign — Concept

## Problem Statement
The current Programs page mixes seeded templates with clinician-created programs, making it unclear what belongs to the clinician vs. what's a starting point. There's no structured flow from "browse a template" → "make it my own" → "assign to clients." Clinicians need a clear separation between the template library (starting points) and their own program library (what they assign to clients).

## Recommended Approach
**Two-page split: Template Library + My Programs.** The Template Library is a read-only catalog of seeded templates. My Programs is the clinician's own collection — built from scratch, cloned from templates, or promoted from a client's program. Both pages support "Assign to Client" (which always creates a per-client clone). Three paths feed into My Programs: "Use Template" from the library, "Create from Scratch," and "Save as My Program" from a client's program. Lineage is tracked: My Programs shows which template it originated from, and client programs show which My Program they came from. "Save as My Program" from a client copy clones the structure only — no client progress or responses are included.

## Key Scenarios
1. **Template → My Programs → Client:** Clinician browses Template Library, clicks "Use Template" on CBT for Depression, customizes it in My Programs, then assigns to a client.
2. **Template → Client directly:** Clinician assigns a seeded template straight to a client without customizing first. Client gets a clone.
3. **Client → My Programs:** Clinician has been tweaking a client's program over weeks. They click "Save as My Program" to create a reusable version in their library for future clients. Structure is copied, client progress is excluded.
4. **From scratch:** Clinician creates a new program in My Programs from a blank slate, then assigns to clients.

## Out of Scope
- Template marketplace or cross-practice sharing
- Versioning or diffing between programs and their sources
- Editing seeded templates directly (always clone first)
- Bulk assignment (assign one program to multiple clients at once)

## Open Questions
- None remaining — all resolved during ideation.

## Alternatives Considered
- **Single page with sections (B)** — Template Library and My Programs on one page. Rejected: gets cluttered as the library grows, weaker separation.
- **Tag-based (C)** — All programs on one page with badges. Rejected: weakest visual separation, relies on badges which are easy to ignore.
