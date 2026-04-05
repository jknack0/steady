# Client Program Builder — Concept

## Problem Statement
Clinicians sometimes need to build a treatment program from scratch for a specific client when no existing template or program fits. Currently, the only way to get a program to a client is by cloning an existing one. There's no blank-canvas path, forcing clinicians to either create a throwaway template first or shoehorn content into an ill-fitting template.

## Recommended Approach
**Hybrid — Create Blank + Assign in One Flow.** The existing Create Program dialog gains a "Create for Client" option where the clinician names the program, selects a client, and lands directly in the program editor. The program is created as a client copy (with enrollment) from the start — it never touches My Programs. The existing promote-to-template flow allows clinicians to turn a successful one-off into a reusable template later.

## Key Scenarios
1. **Fresh start for a unique client:** Therapist has a new client with complex needs. Opens Create Program, picks "Create for Client," selects the client, names it "Alex's Recovery Plan," and lands in an empty program editor to start adding weekly modules.
2. **Build, then promote:** After running the custom program successfully, the clinician promotes it to a template so they can reuse the structure for similar clients in the future.
3. **Client not in system yet:** Clinician wants to create a program for a client they haven't added yet — the flow should handle this gracefully (either require adding the client first, or allow adding inline).

## Out of Scope
- Auto-generating module structure (e.g., "create 8 weekly modules") — clinician builds manually
- Bulk creation for multiple clients at once
- Changing the existing template assignment flow
- AI-assisted program building

## Open Questions
- Should the client picker in the dialog only show existing clients, or allow creating a new client inline?
- Should the program start with one empty module, or truly empty (zero modules)?

## Alternatives Considered
- **Approach A (Button on client detail page)** — not chosen because it creates a separate entry point and fragments the creation experience across two different pages.
- **Approach B (Blank program in My Programs)** — not chosen because it clutters My Programs with one-off programs and requires a two-step create-then-assign process that can leave orphan programs.
