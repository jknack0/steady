# Program Template Cloning — Release Materials

## Release Summary
You can now assign program templates directly to individual clients, customizing each copy before and after assignment. Build your standard program once, then tailor it for each client — removing modules or parts that don't apply — without ever affecting your master template or other clients' programs.

## Customer Documentation

### What's New
**Personalized Program Assignment** — Until now, every client who received a program got the exact same content. If you wanted to skip a module for one client, you had no clean way to do it without affecting everyone else.

Now you can assign a program template to a specific client and customize it on the spot. Pick which modules and parts to include, hit assign, and your client gets their own personal copy. Your template stays untouched, and every client's program is independent — changes to one never affect another.

### How to Assign a Program to a Client

**From the Program Page:**
1. Open any published template program
2. Click **"Assign to Client"** in the header
3. Search for and select a client from your client list
4. You'll see the full program tree — all modules and their parts, checked by default
5. Uncheck any modules or parts you want to exclude for this client
6. Click **"Assign"** — done! Your client now has their own tailored copy

**From a Client's Profile:**
1. Go to the client's profile page
2. Click **"Add Program"** in the Overview tab
3. Pick a template from your published programs
4. Customize the same way — uncheck what doesn't apply
5. Click **"Assign"**

### Editing a Client's Program After Assignment
You're not locked in after the initial assignment. At any time, go to the client's profile, expand their program, and remove modules or parts that are no longer relevant. If your client has already started working on something, that content is preserved in the background for your records — nothing is lost.

### Adding More Content Later
Need to add modules from the same template later? Just assign the template again. Steady will recognize the client already has it and offer to add new modules after the existing ones. Same customization flow — pick what to include and save.

### Tips & Best Practices
- **Build comprehensive templates, then subtract.** It's easier to uncheck a few modules per client than to add content piecemeal. Front-load your templates with everything, then customize down.
- **Use the enrollment list for quick access.** On any template's page, you can see who's enrolled and jump straight to their personalized program with one click.
- **Don't worry about making mistakes.** Canceling the assignment flow at any point has zero side effects. Nothing is saved until you click "Assign."

## Talking Points

### Elevator Pitch
Steady now lets you assign treatment programs to individual clients with per-person customization. Build your program template once, then assign it to each client — removing modules or parts that don't apply — so every client gets exactly the content they need. Each client's program is fully independent, so changes to one never affect another, and your master template always stays intact.

### Key Benefits
1. **Save hours of manual program management.** No more duplicating programs or mentally tracking which client should skip which module. Assign, customize, done.
2. **Every client gets a personalized treatment experience.** Tailor content to each client's needs without one-size-fits-all compromises.
3. **Your records stay clean and compliant.** Each client's program is their own. Content they've already worked through is always preserved, and every change is automatically logged.

### FAQ

**Q: What happens to my original template when I assign it?**
A: Nothing — your template is never modified. Each client gets an independent copy. You can keep editing your template without affecting any clients who already have it.

**Q: Can I assign the same program to multiple clients?**
A: Absolutely. Each client gets their own copy. Assign the same template to as many clients as you need, customizing each one differently.

**Q: What if I need to add more content to a client's program later?**
A: Just assign the same template again. Steady will ask if you want to add more modules. New content gets added after what the client already has.

**Q: If I remove a module a client has already started, do they lose their work?**
A: No. If a client has made progress on a module or part, removing it hides it from their view but preserves the record. Nothing your clients have completed is ever lost.

**Q: Can my clients see each other's programs?**
A: No. Each client can only see their own program. There is no way for clients to access another client's content.

**Q: Can I assign programs from my client's profile page too?**
A: Yes. You can start from either direction — from the program page (pick a client) or from the client's profile (pick a program). Both lead to the same customization flow.

### Objection Handling

**"We just duplicate the program manually for each client."**
That works until you have 20 clients, each needing slightly different versions. Manual duplication means managing dozens of separate programs with no connection to the original. With template assignment, you manage one template and customize per client — faster, cleaner, and easier to keep organized.

**"Is this compliant with HIPAA requirements?"**
Yes. Each client's program is fully isolated — no cross-patient data sharing. All assignment and editing actions are automatically audit-logged. When you remove content a client has already engaged with, it's preserved in the background rather than deleted, maintaining a complete treatment record.

**"What does this cost?"**
This is included in your current Steady plan. No additional cost.

## Internal Notes
- This feature produces the implementation plan and documentation only — actual code implementation follows using the 15-task engineering plan in `06-implementation-plan.md`
- QA sign-off is conditional pending implementation completion
- The Module model gets a new `deletedAt` field for soft delete support — existing module queries need `deletedAt: null` filters added (Task 15)
- Out of scope for V1: editing part content during assignment, template update propagation to existing copies, bulk assignment, versioning/diffing
- Follow-up consideration: client-facing UI on mobile app to show "from template" lineage (currently clinician-side only)
