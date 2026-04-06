# Program Template Cloning — Concept

## Problem Statement
Clinicians build standardized treatment programs, but every patient needs a tailored version. Today there's no way to customize per-patient without modifying the original — which means edits retroactively change what past patients received, creating data integrity and HIPAA concerns. Patients need their own independent copy of what they were assigned.

## Recommended Approach
**Clone-on-Assign with inline customization.** When a clinician assigns a program to a client, the system presents the full program tree (program → modules → parts) in an editing view. The clinician can remove modules or parts that don't apply. On save, the system deep-copies the remaining structure into a client-specific program instance, fully decoupled from the template. The client's copy remains editable by the clinician after assignment (add/remove modules and parts). Re-assigning the same program appends new modules after the existing ones rather than creating a duplicate program.

## Key Scenarios
1. **Happy path:** Clinician opens assignment flow, sees all 8 modules, removes 2, removes 3 parts from a third module, saves. Client gets a tailored 6-module program.
2. **No customization needed:** Clinician assigns program as-is — full tree cloned without changes.
3. **Re-assignment:** Clinician assigns the same program again — new modules are appended after the client's existing modules.
4. **Post-assignment editing:** Clinician revisits a client's program weeks later and removes a module that's no longer relevant, or removes specific parts.
5. **Accidental assignment:** Clinician starts customizing but cancels — nothing saved, no copy created.

## Out of Scope
- Editing part *content* (text, videos, etc.) during the assignment flow — strictly add/subtract structure
- Template updates propagating to already-assigned client copies
- Versioning or diffing between template and client copies

## Open Questions
- Should there be a way to see which template a client's program was originally cloned from? (lineage tracking)

## Alternatives Considered
- **Overlay/Exclusion Model** — Store per-client exclusions referencing the template instead of copying. Rejected: template edits propagating to active clients is dangerous for data integrity, and overlay logic compounds in complexity.
- **Hybrid (Clone Structure, Reference Content)** — Clone the tree but share content by reference. Rejected: confusing UX where some changes propagate and others don't.
