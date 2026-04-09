# STEADY with ADHD -- Clinician Billing & Payments Usability Study

## Study Overview

| Field | Detail |
|---|---|
| **Product** | STEADY with ADHD -- clinician web dashboard (CAS) |
| **Study type** | Moderated task-based usability study |
| **Duration** | ~50 minutes per session |
| **Participants** | 50 licensed therapists (clinician-only, web app only) |
| **Goal** | Identify gaps, dead ends, and confusion in the billing and payment workflows -- insurance setup, claims submission, private pay invoicing, RTM billing, and Stripe checkout |
| **Moderator role** | Observe, prompt with scenario, never lead. Note where users hesitate, express confusion, or abandon a flow. |

---

## Recruitment Criteria

### Target: 50 Licensed Therapists

| Cohort | Age Range | Count | Rationale |
|---|---|---|---|
| A -- Early Career | 25-34 | 12 | Digital-native, may be unfamiliar with insurance billing |
| B -- Mid Career | 35-44 | 14 | Likely transitioning from paper/legacy EHR billing |
| C -- Established | 45-54 | 12 | Deep billing knowledge, strong workflow habits |
| D -- Senior | 55-65+ | 12 | May have lower tech comfort, high domain expertise |

### Screening Requirements

- Must hold active clinical license (LCSW, LMFT, LPC, PsyD, PhD, PMHNP, or equivalent)
- Currently sees clients for ADHD or related neurodevelopmental conditions
- Mix of billing experience:
  - ~20 participants who currently bill insurance themselves
  - ~15 participants who use a biller or billing service
  - ~15 participants who are private-pay only (no insurance billing experience)
- Mix of practice settings:
  - ~20 solo practitioners
  - ~15 group practice members
  - ~15 clinic or institutional setting
- Mix of EHR experience:
  - ~15 currently use SimplePractice, TherapyNotes, or similar
  - ~15 currently use a general EHR (Epic, Cerner, etc.)
  - ~10 use spreadsheets / manual tracking
  - ~10 new to practice management software
- Must not have used STEADY before

---

## Research Questions

1. Can a clinician configure billing settings (Stedi API key, billing profile, Stripe) without external guidance?
2. Can a clinician add insurance to a client and verify eligibility end-to-end?
3. Is the relationship between insurance, claims, invoices, and payments clear?
4. Can a clinician create an invoice, send it, and collect payment (private pay flow)?
5. Can a clinician understand and act on RTM billing requirements to generate a superbill?
6. Where do clinicians expect billing features to live -- and does the app's navigation match?
7. What billing workflows do clinicians expect that don't exist yet?

---

## Pre-Session Script

> Thank you for joining today. I'm going to ask you to complete some billing and payment tasks using STEADY, a clinical platform for ADHD treatment. There are no right or wrong answers -- we're testing the software, not you.
>
> Think aloud as you go: tell me what you're looking at, what you expect to happen, and anything that confuses you. I may ask follow-up questions but I won't help you navigate. If you get truly stuck, say so and we'll move on.
>
> For context: you're a therapist who treats adults with ADHD. You've been using STEADY for a few weeks and have 3 active clients. You're now setting up billing for your practice.
>
> Do you have any questions before we start?

---

## Task B1: Find and configure billing settings (6 min)

> Before you can bill anyone, you need to set up your billing configuration. Find where you'd configure your billing settings and set up your practice for billing.

**Success criteria:**
- Navigate to Settings page
- Find the Stedi (Insurance/EDI) configuration card
- Enter an API key and test the connection
- Optionally find Stripe connection status

**Watch for:**
- Do they go to Settings, Practice, or Billing first?
- Is "Stedi" a recognizable term? Do they understand what it does?
- Can they find the API key input and test button?
- Do they look for Stripe setup and where?
- Do they expect a unified "Billing Settings" page?

**Follow-up:**
- "Where did you expect to find billing setup?"
- "What does 'Stedi' mean to you? Would a different label help?"
- "Is anything missing from this setup that you'd need before billing?"

---

## Task B2: Set up your billing profile (5 min)

> You need to enter your NPI number, tax ID, and license information so they appear on claims and superbills. Find where to do that.

**Success criteria:**
- Locate the billing profile (currently in RTM context or Settings)
- Enter NPI, Tax ID, license info

**Watch for:**
- Where do they look first -- Settings, Practice, or somewhere else?
- Is the billing profile discoverable or buried?
- Do they understand why this information is needed?
- Do they expect this to be part of the same page as Stedi/Stripe config?

**Follow-up:**
- "Was it clear why the platform needs your NPI and Tax ID?"
- "Where would you expect to manage this information?"

---

## Task B3: Add insurance to a client (6 min)

> Your client Jordan Rivera has Blue Cross Blue Shield insurance. Add their insurance information to their profile.

**Success criteria:**
- Navigate to Participants -> Jordan's detail page
- Find the Insurance tab
- Click "Add Insurance"
- Search for payer or enter manually
- Enter subscriber ID, group number
- Save successfully

**Watch for:**
- Can they find the Insurance tab on the participant detail page?
- Do they try to search for a payer? What happens if search returns nothing?
- Do they notice the manual Payer ID field?
- Is "Subscriber ID" clear or do they look for "Member ID"?
- Relationship to Subscriber dropdown -- do they understand it?
- Policy holder fields -- do they know when to fill these in?

**Follow-up:**
- "Was it clear where to find the insurance section?"
- "If the payer search didn't work, what would you do?"
- "What information would you typically have on hand when entering this?"

---

## Task B4: Check insurance eligibility (4 min)

> Before Jordan's next session, you want to verify their insurance is active and check their copay. Do that now.

**Success criteria:**
- Find the "Check Eligibility" button on Jordan's insurance card
- Trigger the eligibility check
- Interpret the results (coverage active, copay, deductible, plan name)

**Watch for:**
- Is the Check Eligibility button discoverable?
- Do they understand what the results mean?
- Do they expect to see more detail (specific service coverage, prior auth requirements)?
- Do they look for this elsewhere (Claims page, Billing page)?

**Follow-up:**
- "What would you normally check before a first session with a new insurance client?"
- "Is there anything missing from these results that you'd need?"

---

## Task B5: Create and send a private-pay invoice (8 min)

> Your client Alex Chen is private pay (no insurance). You just had a 60-minute individual therapy session with them. Create an invoice and send it to them.

**Success criteria:**
- Navigate to Billing page
- Click "New Invoice" or equivalent
- Select Alex Chen as the client
- Add a line item (CPT 90837 or similar, with rate)
- Save as draft
- Send the invoice

**Watch for:**
- Do they find the Billing page in the sidebar?
- Is the "New Invoice" flow clear?
- Service code selection -- do they know their CPT codes?
- Do they understand Draft vs. Sent status?
- Do they expect the invoice to auto-populate from a session/appointment?
- Do they look for a way to set a recurring rate or default fee schedule?
- After sending, do they understand what the client receives?

**Follow-up:**
- "What did you expect to happen when you sent the invoice?"
- "Would you want invoices to be created automatically from sessions?"
- "How do you currently handle invoicing in your practice?"

---

## Task B6: Collect payment on an invoice (6 min)

> Alex paid you $150 by check for last week's session. Record that payment. Then, for this week's invoice, you want to charge the credit card they have on file.

**Success criteria:**
- Open an existing invoice
- Record a manual payment (check, $150)
- On a different invoice, find and use "Charge Card on File"
- Select saved card, confirm charge

**Watch for:**
- Can they find the "Record Payment" button on the invoice detail?
- Is the payment method dropdown clear (Cash, Check, Credit Card, Insurance, Other)?
- Do they find the saved cards section?
- Do they understand the difference between recording a payment and charging a card?
- Do they expect a "Send Payment Link" option?
- Is the payment history on the invoice clear?

**Follow-up:**
- "How do you currently collect payments from clients?"
- "What's the difference between 'Record Payment' and 'Charge Card' in your mind?"
- "Would you want to send a payment link to the client instead?"

---

## Task B7: Understand the Claims page (5 min)

> You've submitted a few insurance claims. Check the status of your claims and see if any need your attention.

**Success criteria:**
- Navigate to Claims page from sidebar
- Use the status filter tabs
- Identify a rejected claim
- Attempt to resubmit or understand next steps

**Watch for:**
- Is the Claims page discoverable in the sidebar?
- Do they understand the status labels (Draft, Submitted, Accepted, Rejected, Denied, Paid)?
- Can they figure out what to do with a rejected claim?
- Do they expect to create claims from this page?
- Do they look for claim detail or just scan the table?
- Do they understand the relationship between claims and invoices?

**Follow-up:**
- "What would you do if a claim was rejected?"
- "How do you expect claims and invoices to relate to each other?"
- "Is there information missing from this view?"

---

## Task B8: RTM billing -- understand billability (8 min)

> You have several clients enrolled in Remote Therapeutic Monitoring. You need to figure out which ones are ready to bill this month and what you need to do for the ones that aren't ready yet.

**Success criteria:**
- Navigate to RTM page
- Interpret the summary bar (total, billable, approaching, at-risk)
- Use the tab filters (Needs Action, Billable)
- Read the billability checklist on a client card (engagement days, minutes, interaction)
- Identify what's missing for a "Needs Action" client

**Watch for:**
- Do they find the RTM page?
- Do they understand what "engagement days," "monitoring minutes," and "interactive communication" mean?
- Can they read the billability checklist and figure out what's missing?
- Do they know what the CPT code thresholds mean?
- Do they understand the difference between Approaching and At-Risk?
- Do they try the quick action buttons (Log Time, Log Interaction)?

**Follow-up:**
- "In your own words, what makes a client 'billable' for RTM?"
- "What does 'interactive communication' mean to you?"
- "How do you currently track RTM requirements?"

---

## Task B9: Log clinician time for RTM (5 min)

> You spent 8 minutes reviewing your client Jordan's daily tracker data and homework submissions this morning. Log that time.

**Success criteria:**
- Find the "Log Time" button (RTM dashboard or client detail)
- Select the client
- Enter duration and activity type
- Optionally mark as interactive communication
- Submit

**Watch for:**
- Do they log from the dashboard or drill into the client detail first?
- Are the activity type presets clear?
- Do they understand the "live interaction" toggle?
- Do they expect a timer/stopwatch instead of manual entry?
- Is it clear that this contributes to the 20-minute billing threshold?

**Follow-up:**
- "Would you prefer a timer that tracks as you work, or manual logging?"
- "How do you currently track your monitoring time?"

---

## Task B10: Generate a superbill (6 min)

> Jordan's RTM billing period is complete and they meet all the requirements. Generate a superbill for their insurance claim.

**Success criteria:**
- Navigate to RTM client detail for Jordan
- Find "Generate Superbill" button
- Review the superbill contents
- Print or download

**Watch for:**
- Can they find the Generate Superbill button?
- Do they understand the superbill layout (provider info, client info, services, CPT codes)?
- Do they check that the provider information is correct (NPI, Tax ID)?
- Do they expect to submit the claim directly from here, or print and mail?
- Do they look for a way to edit the superbill before generating?

**Follow-up:**
- "What would you do with this superbill after generating it?"
- "Is anything missing from this superbill that your payer would need?"
- "Would you rather submit the claim electronically from here?"

---

## Task B11: End-to-end flow discovery (5 min)

> You just finished a session with Jordan. Walk me through what you would do in this app to get paid for that session, from start to finish. Jordan has insurance.

**This is an open-ended task.** Do not prompt with specific steps. Let them discover (or fail to discover) the flow.

**Expected flow (insurance):**
1. Verify insurance is on file (Participants -> Insurance tab)
2. Check eligibility (optional)
3. Create a claim from the session/appointment
4. Submit claim to insurance via Stedi
5. Track claim status on Claims page
6. If copay/coinsurance due, create invoice for remainder
7. Collect copay via Stripe or manual payment

**Watch for:**
- Do they know where to start?
- Do they try to create a claim from the Claims page, the appointment, or the client page?
- Do they understand the insurance-to-claim-to-payment pipeline?
- Do they expect a "Bill for this session" button on the appointment/session?
- Do they expect automation (auto-create claim after session)?
- Where do they get lost or give up?

**Follow-up:**
- "Where did you get stuck?"
- "What step did you expect the app to do automatically?"
- "How does this compare to your current billing workflow?"

---

## Post-Session Questions

### Workflow Assessment

1. **Mental model:** "In your own words, how does billing work in this app? Walk me through it."
2. **Navigation:** "Did you always know where to find things? What was hardest to locate?"
3. **Terminology:** "Were there any labels or terms that confused you?"
4. **Completeness:** "What's missing? What would you need before you'd actually use this for your practice?"
5. **Confidence:** "On a scale of 1-10, how confident would you feel billing a client through this app right now?"

### Comparative Assessment

6. **Current workflow:** "How do you handle billing today? What tools do you use?"
7. **Improvement:** "What does this app do better than your current setup?"
8. **Gaps:** "What does your current setup do that this app doesn't?"
9. **Deal-breakers:** "Is there anything that would prevent you from switching to this for billing?"

### Flow-Specific Questions

10. **Insurance vs. private pay:** "Do you bill insurance, private pay, or both? Which flow felt more complete?"
11. **RTM:** "Have you used Remote Therapeutic Monitoring before? Was the RTM section understandable?"
12. **Automation:** "What parts of billing do you wish were automatic?"
13. **Integration:** "What other systems would this need to connect to for you to use it?"

### Trust & Compliance

14. **Trust:** "Do you trust this app with your clients' insurance and payment information? Why or why not?"
15. **Compliance:** "Did anything concern you about HIPAA or data security in the billing flows?"

### Final

16. **Daily use:** "If this were ready, would you use it for billing? What would bring you back?"
17. **Priority:** "If you could fix one thing about the billing experience, what would it be?"

---

## Observer Notes Template

For each task, record:

| Field | Notes |
|---|---|
| **Task ID** | |
| **Participant #** | |
| **Cohort** | A (25-34) / B (35-44) / C (45-54) / D (55+) |
| **Billing experience** | Bills insurance / Uses biller / Private-pay only |
| **Time to complete** | |
| **Completed?** | Yes / Partial / No / Abandoned |
| **Path taken** | (sequence of screens/actions) |
| **Expected path** | (where they tried to go first) |
| **Hesitations** | (moments of pause, hovering, scrolling, reading labels) |
| **Errors** | (wrong turns, misclicks, dead ends, wrong page) |
| **Verbal cues** | (confusion quotes, frustration, delight, expectations) |
| **Navigation gaps** | (looked for something that doesn't exist or isn't linked) |
| **Severity** | Cosmetic / Minor / Major / Critical |

---

## Key Hypotheses to Validate

| # | Hypothesis | Tasks | Expected Signal |
|---|---|---|---|
| H1 | Clinicians expect a unified "Billing Settings" page, not split across Settings/Practice/RTM | B1, B2 | Users check multiple locations before finding config |
| H2 | "Stedi" is not a recognized term; clinicians expect "Insurance" or "Clearinghouse" | B1 | Hesitation or confusion at the Stedi label |
| H3 | Clinicians expect invoices to auto-generate from completed sessions | B5, B11 | Users look for a "Bill for this session" button |
| H4 | The insurance -> claim -> invoice -> payment pipeline is not obvious | B11 | Users cannot articulate the full flow unprompted |
| H5 | Clinicians who bill insurance expect to create claims from the appointment/session, not from a separate Claims page | B7, B11 | Users try to create claims from the wrong location |
| H6 | RTM billability requirements are unclear to clinicians unfamiliar with RTM codes | B8 | Users cannot explain what makes someone billable |
| H7 | Manual time logging feels burdensome; clinicians want automatic tracking | B9 | Users ask about timers or automatic tracking |
| H8 | The split between Billing (invoices) and Claims (insurance) pages confuses clinicians | B5, B7, B11 | Users conflate invoices and claims or look in the wrong section |
| H9 | Private-pay clinicians find the invoice flow complete; insurance clinicians find gaps | B5-B7, B11 | Satisfaction diverges by billing experience cohort |
| H10 | Payer search failure (Stedi unavailable) blocks insurance setup | B3 | Users cannot add insurance without search results |

---

## Success Metrics

| Metric | Target |
|---|---|
| Task completion rate (unassisted) | >= 70% (billing flows are complex) |
| Average task completion time | Within 2.5x expected time |
| Critical usability issues found | 0 blocking issues that prevent billing |
| Navigation success (first-click accuracy) | >= 60% |
| Confidence score (Q5, 1-10 scale) | >= 6 average |
| SUS score (post-study) | >= 65 |
| % who can articulate full billing flow (B11) | >= 50% |

---

## Analysis Plan

### Quantitative

- Task completion rates by cohort (age range) and billing experience
- Time-on-task distributions per task
- First-click accuracy per task (did they go to the right page first?)
- Confidence scores segmented by cohort
- SUS scores segmented by cohort

### Qualitative

- Affinity diagram of verbal cues and confusion points
- Navigation gap inventory (features/pages users expected but didn't find)
- Terminology issues (labels that caused hesitation)
- Flow gaps (steps users expected the app to handle automatically)
- Comparative analysis (what their current tools do that STEADY doesn't)

### Priority Matrix

Cross-reference findings against:
- Frequency (how many participants hit the issue)
- Severity (cosmetic / minor / major / critical)
- Cohort patterns (is it age-related, experience-related, or universal?)

Deliver prioritized recommendations as: **Must fix before launch**, **Should fix soon**, **Nice to have**, **Future consideration**.
