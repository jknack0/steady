# STEADY with ADHD — Moderated Usability Study Guide

## Study Overview

| Field | Detail |
|---|---|
| **Product** | STEADY with ADHD — clinician web CAS + participant mobile app |
| **Study type** | Moderated task-based usability study |
| **Duration** | ~45 minutes per session |
| **Participants** | 3 clinician sessions (web), 3 participant sessions (mobile) |
| **Goal** | Identify usability friction in core workflows before Sprint 15 gamification/voice work |
| **Moderator role** | Observe, prompt with scenario, never lead. Note where users hesitate, express confusion, or deviate from expected path. |

---

## Research Questions

1. Can a new clinician set up a program and assign it to a client without guidance?
2. Can a clinician find and interpret a participant's engagement data before a session?
3. Can a participant complete their daily engagement loop (check-in → homework → journal) without getting lost?
4. Where do users hesitate, backtrack, or express confusion?
5. Are labels, navigation, and information hierarchy intuitive for both user types?

---

## Pre-Session Script

> Thank you for joining today. I'm going to ask you to complete some tasks using STEADY. There are no right or wrong answers — we're testing the software, not you. Think aloud as you go: tell me what you're looking at, what you expect to happen, and anything that confuses you.
>
> I may ask follow-up questions but I won't help you navigate. If you get truly stuck, say so and we'll move on.
>
> Do you have any questions before we start?

---

## SESSION A: CLINICIAN (Web App)

### Warm-up (2 min)

> Imagine you're a therapist who treats adults with ADHD. You just signed up for STEADY and completed the initial setup. You're now looking at your dashboard for the first time.

**Observe:** First impressions. What do they notice? What do they click first?

---

### Task C1: Create a program from a template (8 min)

> You want to create a treatment program for a new client. You'd like to start from one of the pre-built templates rather than building from scratch.

**Success criteria:**
- Navigate to Programs page
- Find and open the Template Library tab
- Select a template and use "Use Template" or "Clone" to create their own copy
- Confirm the program appears in My Programs

**Watch for:**
- Confusion between "Use Template" vs "Assign to Client" vs "Clone"
- Difficulty finding the Template Library tab
- Uncertainty about where the cloned program ends up

**Follow-up:** "What's the difference between 'Use Template' and 'Assign to Client' in your mind?"

---

### Task C2: Customize and publish a program (8 min)

> Now customize that program: rename it, reorder two modules, and add a homework part to the first module. When you're done, publish it.

**Success criteria:**
- Open the cloned program
- Edit the title (auto-save fires)
- Drag-and-drop reorder modules
- Navigate into first module
- Add a Homework part with at least one item
- Publish the program

**Watch for:**
- Auto-save confusion (no explicit "Save" button)
- Difficulty discovering drag handles on modules
- Confusion about part type picker
- Uncertainty about publish flow (draft → published state)

**Follow-up:** "How confident are you that your changes were saved?"

---

### Task C3: Invite a client and assign the program (6 min)

> You have a new client named Jordan Rivera (jordan@example.com). Invite them to the platform and assign this program to them.

**Success criteria:**
- Navigate to Participants or use in-program assignment flow
- Create/invite the client
- Assign the program with the assignment modal

**Watch for:**
- Whether they go to Participants first or try to assign from the program page
- Confusion about invite vs. assign as separate steps
- Client picker usability
- Whether "Add New Client" inline form is discoverable

**Follow-up:** "Was it clear what Jordan would receive after you did that?"

---

### Task C4: Prepare for an upcoming session (6 min)

> Jordan has been using the app for 3 weeks. You have a session with them in 30 minutes. Find out how they've been doing — look at their engagement, homework completion, and any concerning trends.

**Success criteria:**
- Navigate to Participants → Jordan's detail page
- Find and interpret the Patterns tab (task completion chart, regulation trend, journal heatmap, homework progress)
- Notice the concerning trends alert banner (if present)

**Watch for:**
- Whether they go to Participants, Dashboard, or Appointments first
- Ability to interpret the charts and what "concerning" means
- Whether they find the appointment prep view

**Follow-up:** "What would you bring up with Jordan based on what you see here?"

---

### Task C5: RTM billing check (5 min)

> You want to see which of your RTM-enrolled clients are ready to bill this month. Find that information and generate a superbill for one who qualifies.

**Success criteria:**
- Navigate to RTM page
- Use the "Billable" filter tab
- Identify a billable client (16+ engagement days, 20+ min clinician time, interactive communication)
- Navigate to detail → generate superbill

**Watch for:**
- Confusion about what makes someone "billable"
- Difficulty parsing the progress indicators
- Whether "Needs Action" tab meaning is clear

**Follow-up:** "What would you need to do to make a 'Needs Action' client billable?"

---

### Task C6: Create a program for a specific client (5 min)

> You want to create a brand new, blank program specifically for your client Alex Chen — not from a template, just a fresh program for them.

**Success criteria:**
- Find the "Create for Client" flow (either from Programs page or from client detail page)
- Select Alex Chen in the client picker
- Program created and shows up in Client Programs tab

**Watch for:**
- Whether they try "Create Program" → "Start from Scratch" (wrong — that makes a My Program)
- Confusion between "My Programs" and "Client Programs" mental models
- Discovery of the "Create for Client" card in the create dialog

**Follow-up:** "What's the difference between a program in 'My Programs' and one in 'Client Programs'?"

---

## SESSION B: PARTICIPANT (Mobile App)

### Warm-up (2 min)

> Imagine you're an adult who was recently diagnosed with ADHD. Your therapist uses STEADY and invited you to the app. You just logged in for the first time and see the home screen.

**Observe:** First impressions. What do they notice? What's the first thing they'd tap?

---

### Task P1: Accept program invitation and explore (6 min)

> Your therapist assigned you a program. Find the invitation and accept it. Then look around at what's in the program.

**Success criteria:**
- Find the program invitation (Today tab or Program tab)
- Accept the enrollment
- Browse at least 2 modules
- Open at least 1 content part

**Watch for:**
- Whether the invitation is prominent enough
- Confusion about what "accepting" means
- Overwhelm when seeing the full program structure
- Whether module lock states are clear

**Follow-up:** "What do you think would happen if you didn't accept?"

---

### Task P2: Complete daily check-in (5 min)

> It's morning. Do your daily check-in — whatever that looks like to you.

**Success criteria:**
- Navigate to daily tracker (from Today tab prompt or find it within program)
- Complete the tracker fields
- Submit

**Watch for:**
- Whether "check-in" maps to any obvious UI element
- Confusion between daily tracker, journal, and tasks
- Whether the Today tab prompt is clear enough

**Follow-up:** "What parts of the app would you consider your 'daily check-in'?"

---

### Task P3: Add a task by typing (4 min)

> You just remembered you need to call your insurance company about a claim. Add that as a task.

**Success criteria:**
- Navigate to Tasks tab
- Tap FAB or add button
- Create task with title
- Optionally set energy level, due date

**Watch for:**
- Whether the FAB is discoverable
- Confusion about energy level / category fields
- Whether they try to add it from a different screen

**Follow-up:** "What does 'energy level' mean to you on a task?"

---

### Task P4: Complete assigned homework (6 min)

> Your therapist assigned you some homework this week. Find it and complete it.

**Success criteria:**
- Find homework (via Tasks tab with HOMEWORK source, or Today tab, or Program → module → homework part)
- Open the homework part
- Complete at least one homework item
- Mark as done

**Watch for:**
- Multiple possible paths — which one do they try?
- Whether homework is distinguishable from self-created tasks
- Confusion about completion state
- File upload friction (if homework requires it)

**Follow-up:** "How would you know if you've finished all your homework for the week?"

---

### Task P5: Write a journal entry (5 min)

> You want to write about how your day went and how you're feeling.

**Success criteria:**
- Navigate to Journal tab
- Write freeform content
- Set regulation score
- Optionally toggle "share with clinician"
- Entry auto-saves

**Watch for:**
- Whether they understand the regulation score scale (1-10)
- Confusion about sharing toggle implications
- Auto-save confidence (same issue as clinician side)
- Whether they notice the entry is per-day (upsert)

**Follow-up:** "Would you share this with your therapist? What would make you choose to or not?"

---

### Task P6: Check your progress (5 min)

> You've been using the app for a few weeks. You want to see how you've been doing overall.

**Success criteria:**
- Find the Insights screen (from home screen card)
- Interpret at least 2 of the visualizations (task completion, regulation trend, journal heatmap, homework progress)

**Watch for:**
- Whether the Insights card on the home screen is noticeable
- Comprehension of the charts
- Whether they look for progress elsewhere first (Program tab completion bars?)
- Desire for more/different data

**Follow-up:** "What does this tell you about your progress? Is anything missing?"

---

### Task P7: Find and prepare for upcoming appointment (4 min)

> You have a therapy session coming up. Find out when it is and what you should prepare.

**Success criteria:**
- Find the appointment (Calendar tab or Appointments screen)
- View appointment details
- If post-session review exists, find it

**Watch for:**
- Whether they go to Calendar tab or look elsewhere
- Confusion between calendar events and appointments
- Whether they expect pre-session prep materials on their side

**Follow-up:** "What would help you prepare for a session within the app?"

---

## Post-Session Questions (Both sessions)

1. **Overall impression:** "In one sentence, how would you describe this app?"
2. **Difficulty:** "What was the hardest thing I asked you to do? Why?"
3. **Delight:** "Was there anything that surprised you in a good way?"
4. **Missing:** "What's one thing you expected to find but didn't?"
5. **Daily use:** "If this were real, would you open this app every day? What would bring you back?"
6. **Trust:** "Do you trust this app with your health information? Why or why not?"

---

## Observer Notes Template

For each task, record:

| Field | Notes |
|---|---|
| **Task ID** | |
| **Time to complete** | |
| **Completed?** | Yes / Partial / No |
| **Path taken** | (sequence of screens/actions) |
| **Hesitations** | (moments of pause, hovering, scrolling back) |
| **Errors** | (wrong turns, misclicks, dead ends) |
| **Verbal cues** | (confusion quotes, delight quotes, frustration) |
| **Severity** | Cosmetic / Minor / Major / Critical |

---

## Success Metrics

| Metric | Target |
|---|---|
| Task completion rate (unassisted) | ≥ 80% |
| Average task completion time | Within 2× expected time |
| Critical usability issues found | 0 (blocking issues) |
| SUS score (post-study) | ≥ 68 (above average) |
