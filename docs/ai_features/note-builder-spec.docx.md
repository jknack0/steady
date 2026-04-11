

**Feature Spec: Clinical Note Builder**

AI-Organized Transcripts → Therapist-Controlled Notes

*"The AI drafts. The therapist decides."*

April 2026

# **The Problem**

Therapists spend 2–3 hours per day writing clinical notes. It’s the number one driver of burnout in private practice. The existing solutions fall into two camps:

* **Fully automated AI notes** (Mentalyc, Upheal, TheraPro) — record the session, AI writes the note. Fast, but therapists don’t trust it. They’re signing a legal clinical document they didn’t write. Many feel uncomfortable.

* **Manual templates** (ICANotes, TherapyNotes, TheraNest) — dropdown menus and phrase banks. Better control, but still slow and tedious. Clicking through menus isn’t much better than typing.

**The gap:** Nobody gives the therapist a transcript that’s been intelligently organized by topic, with AI-suggested clinical language, where the therapist picks what matters and builds the note themselves — faster than writing from scratch but with full control over every word.

# **The Solution: Transcript-Powered Note Builder**

A split-screen interface. Left side: the session transcript, organized by topic and annotated by AI. Right side: a structured clinical note (SOAP, DAP, or BIRP) that the therapist builds by selecting from the transcript and accepting or editing AI suggestions.

## **How It Works (Therapist Experience)**

1. **Session ends.** Transcript is ready \~4 minutes later (from GPU transcription pipeline).

2. **Therapist opens Note Builder.** The screen splits into two panels.

3. **Left panel: Smart Transcript.** The raw transcript is there, but it’s been organized into collapsible topic sections by the AI. Instead of a 45-minute wall of text, they see: “Anxiety & Work Stress (12 min)”, “Relationship with Partner (8 min)”, “Sleep Issues (5 min)”, “Therapeutic Interventions (10 min)”, “Homework & Planning (6 min).” Each section shows the relevant transcript excerpts.

4. **Right panel: Note Template.** Empty SOAP/DAP/BIRP template. Each section (Subjective, Objective, Assessment, Plan) has an AI-generated draft that the therapist can accept, edit, or delete.

5. **The therapist works through it:** 

* They expand a topic section in the transcript, read through what was said

* They click a transcript excerpt to “add to note” — the AI rephrases it into clinical language and slots it into the right section of the note

* They review each note section, edit the wording, add their own clinical observations

* They can accept the full AI draft with one click if they’re satisfied, or build from scratch pulling from the transcript

6. **They sign the note.** Status changes to “signed.” The note is now a legal clinical document and a billable record.

# **Why This Is Different**

|  | Fully Automated AI | Manual Templates | Our Note Builder |
| :---- | :---- | :---- | :---- |
| Who writes the note? | AI writes everything | Therapist writes everything | AI drafts, therapist controls |
| Therapist trust | Low — signing something they didn’t write | High — but slow | High — they see the source material |
| Speed | \~10 seconds | \~20–30 minutes | \~5–10 minutes |
| Clinical accuracy | Depends on AI | Depends on therapist memory | Therapist verifies against transcript |
| Source transparency | Black box | N/A | Every note line traces back to a transcript moment |
| Customization | Limited templates | Phrase banks | Free text \+ AI suggestions \+ transcript |
| Billing compliance | Usually good | Depends on therapist | AI checks for medical necessity language |

# **Supported Note Formats**

Therapists choose their preferred format during onboarding. They can switch anytime. We support the four most common formats:

## **SOAP Notes (Most Common)**

Used by the majority of therapists, especially those billing insurance.

| Section | What Goes Here | AI Source |
| :---- | :---- | :---- |
| **S — Subjective** | Client’s self-reported feelings, symptoms, concerns, and experiences in their own words | Direct quotes and paraphrases from client’s speech in transcript |
| **O — Objective** | Therapist’s observations: client’s appearance, mood, affect, behavior, speech patterns, engagement level | AI infers some from transcript (speech patterns, topic engagement) but therapist adds most of this manually |
| **A — Assessment** | Clinical interpretation: progress toward treatment goals, diagnosis updates, risk assessment, what the session data means | AI generates draft based on transcript themes \+ treatment plan goals. Therapist edits heavily. |
| **P — Plan** | Next steps: homework, interventions for next session, frequency changes, referrals, medication considerations | AI extracts any planning discussion from end of transcript. Therapist refines. |

## **DAP Notes**

Simpler than SOAP. Combines Subjective and Objective into one “Data” section.

| Section | What Goes Here |
| :---- | :---- |
| **D — Data** | Combined client report \+ therapist observations from the session |
| **A — Assessment** | Clinical interpretation, progress, diagnosis impressions |
| **P — Plan** | Next session plan, homework, treatment modifications |

## **BIRP Notes**

Focuses on interventions and client response. Common in community mental health.

| Section | What Goes Here |
| :---- | :---- |
| **B — Behavior** | Client’s presenting behavior, mood, and reported concerns |
| **I — Intervention** | Specific therapeutic techniques used (CBT, motivational interviewing, etc.) |
| **R — Response** | How the client responded to the interventions |
| **P — Plan** | Plan for future sessions, homework, treatment adjustments |

## **Free-Form Progress Note**

Some therapists prefer unstructured narrative notes. The builder still works: AI organizes the transcript by topic and generates a narrative draft. Therapist edits as needed.

# **Smart Transcript (Left Panel)**

The raw transcript is processed by the LLM into an organized, navigable document. This is the therapist’s reference material while building the note.

## **What the AI Does to the Transcript**

1. **Topic segmentation:** Groups the conversation into thematic sections. “Anxiety & Work Stress”, “Relationship Issues”, “Sleep”, etc. Each section shows start/end timestamps and duration.

2. **Speaker labels:** Therapist vs Client clearly labeled throughout.

3. **Key moment highlighting:** AI highlights clinically relevant moments with colored tags:

* **Blue tag — Client insight:** “I realized my anger is really about feeling unheard”

* **Green tag — Progress indicator:** “I actually used the breathing technique this week and it helped”

* **Orange tag — Intervention used:** Therapist used Socratic questioning, CBT triangle, etc.

* **Red tag — Risk/safety:** Any mention of self-harm, substance use, crisis

* **Purple tag — Treatment goal:** Discussion related to defined treatment plan goals

4. **Quote extraction:** Significant client quotes are pulled out and displayed prominently. These are often what therapists want to include verbatim in the Subjective section.

5. **Timeline markers:** Timestamps on every segment so the therapist can reference “22:15 into the session” if needed.

### **Interactions**

* **Click a topic section** to expand/collapse the transcript under it

* **Click a highlighted moment** to add it to the note. The AI converts the raw dialogue into clinical language and places it in the appropriate note section.

* **Click a quote** to add it as a direct client quote in the Subjective section

* **Search/filter** by tag type (show me all interventions, show me all risk mentions)

* **Click any timestamp** to jump to that point in the audio recording (if they want to re-listen)

# **Note Builder (Right Panel)**

The structured note the therapist is building. Each section has three states:

## **Section States**

| State | What the Therapist Sees | Actions Available |
| :---- | :---- | :---- |
| **AI Draft** | AI-generated text with a green border and “AI Draft” badge | Accept as-is, Edit, Delete, Regenerate |
| **Therapist-Edited** | Therapist’s own text (written or edited from AI draft). No badge. | Edit, Delete |
| **Empty** | Empty section with a prompt: “Add from transcript or type your own” | Type directly, or click transcript moments to populate |

## **AI Draft Generation**

When the therapist opens the Note Builder, the AI has already pre-populated each section with a draft based on the transcript. The therapist sees:

**Subjective (AI Draft):** 

*“Client reported increased anxiety over the past week, primarily related to work deadlines. Stated ‘I feel like I can’t keep up and everyone can see it.’ Described sleep onset difficulties (30–45 min to fall asleep) and a decrease in appetite. Reports one panic attack on Wednesday during a team meeting.”*

**Objective (AI Draft):** 

*“Client presented with anxious affect, speaking rapidly at session start. Made appropriate eye contact. Engaged actively in CBT intervention. Affect brightened when discussing weekend plans.”*

**The therapist can:** 

* **Accept the whole draft** with one click (for straightforward sessions)

* **Edit inline** — the draft becomes editable text, therapist modifies wording

* **Delete the draft and write from scratch** 

* **Accept parts and edit others** — e.g., keep Subjective as-is, rewrite Assessment

### **Adding from Transcript**

When the therapist clicks a moment in the transcript, two things happen:

1. **A toast appears:** “Add to which section?” with buttons for S / O / A / P (or D / A / P for DAP, etc.)

2. **The AI rephrases the raw dialogue into clinical language** and appends it to the chosen section. The therapist sees both the rephrased version and the original transcript excerpt, so they can verify.

**Example:** 

**Transcript (raw):** 

*Client: “Yeah I had another panic attack at work on Wednesday. It was during the team meeting. My heart was racing and I felt like I couldn’t breathe. I had to leave the room.”*

**Added to Subjective (clinical language):** 

*“Client reported experiencing a panic attack during a work meeting on Wednesday, characterized by tachycardia and perceived dyspnea. Client removed self from the situation.”*

The therapist can toggle between the AI-rephrased version and the original quote, or edit to their preference.

# **Compliance Checker**

Before signing, the note runs through a compliance check. This is critical because notes are billing documents — if they don’t demonstrate medical necessity, insurance can deny the claim retroactively.

## **What It Checks**

| Check | What It Looks For | If Missing |
| :---- | :---- | :---- |
| Medical necessity language | Does the note connect symptoms to diagnosis and demonstrate need for continued treatment? | Suggests adding language linking client’s symptoms to their diagnosis |
| Intervention documentation | Are specific therapeutic techniques named (not just “counseling”)? | Suggests naming specific interventions from the transcript (CBT, MI, etc.) |
| Progress or regression | Does the note indicate direction of change toward treatment goals? | Suggests adding progress language based on treatment plan |
| Plan specificity | Does the Plan section include specific next steps (not just “continue therapy”)? | Suggests concrete plan items based on session discussion |
| Risk assessment | Is there documentation of risk screening, even if negative? | Adds “No current safety concerns identified” or flags risk if detected |
| Session details | Start/end time, service type, CPT code, diagnosis code | Auto-populated from session data, therapist verifies |

**The compliance checker runs automatically when the therapist clicks “Review & Sign.”** If issues are found, they appear as yellow suggestion banners above the relevant section. The therapist can accept the suggestion (AI inserts the language) or dismiss it. No issue blocks signing — the therapist always has final authority.

# **LLM Architecture**

Three LLM calls power the Note Builder. All run on Claude Haiku via Bedrock.

| LLM Call | When It Runs | Input | Output | Cost |
| :---- | :---- | :---- | :---- | :---- |
| Transcript organization | After transcription completes (async, before therapist opens builder) | Full transcript (\~6K tokens) | Topic segments, highlighted moments, extracted quotes (\~2K tokens) | \~$0.002 |
| Note draft generation | When therapist opens Note Builder | Organized transcript \+ treatment plan \+ note format preference (\~10K tokens) | Draft note in chosen format (\~800 tokens) | \~$0.003 |
| Compliance check | When therapist clicks “Review & Sign” | Completed note \+ diagnosis \+ treatment plan (\~3K tokens) | List of compliance suggestions (\~300 tokens) | \~$0.001 |

**Total cost per session: \~$0.006** — under a penny. For a therapist doing 173 sessions/month: \~$1.04/month.

**Call 1 runs asynchronously** as part of the transcription pipeline (after Voxtral finishes, before the therapist opens the builder). By the time the therapist is ready to write notes, the smart transcript is already waiting.

**Call 2 runs on-demand** when the therapist opens the Note Builder for a specific session. Takes 2–3 seconds.

**Call 3 runs on-demand** when the therapist clicks Review & Sign. Takes 1–2 seconds.

# **API Endpoints**

## **GET /api/sessions/:id/smart-transcript**

Returns the AI-organized transcript for the left panel.

{

  "sessionId": "sess\_abc123",

  "topics": \[

    {

      "title": "Anxiety & work stress",

      "startTime": 120,

      "endTime": 840,

      "duration": 720,

      "segments": \[

        {

          "speaker": "client",

          "text": "I had another panic attack at work...",

          "startTime": 125,

          "endTime": 142,

          "highlights": \[

            { "type": "risk", "label": "Panic attack reported" }

          \]

        }

      \],

      "keyQuotes": \[

        "I feel like I can't keep up and everyone can see it"

      \]

    }

  \],

  "highlights": {

    "insights": 3,

    "progress": 2,

    "interventions": 4,

    "risks": 1,

    "goals": 2

  }

}

## **POST /api/sessions/:id/note-draft**

Generates the AI draft for the right panel.

// Request

{ "format": "soap" }

// Response

{

  "format": "soap",

  "sections": {

    "subjective": {

      "draft": "Client reported increased anxiety...",

      "sourceSegments": \["seg\_001", "seg\_003", "seg\_007"\]

    },

    "objective": { "draft": "...", "sourceSegments": \[...\] },

    "assessment": { "draft": "...", "sourceSegments": \[...\] },

    "plan": { "draft": "...", "sourceSegments": \[...\] }

  },

  "sessionDetails": {

    "startTime": "2026-04-09T09:00:00",

    "endTime": "2026-04-09T09:45:00",

    "cptCode": "90837",

    "diagnosisCode": "F41.1",

    "serviceType": "individual\_therapy"

  }

}

## **POST /api/sessions/:id/rephrase**

When the therapist clicks a transcript moment to add to a note section, this rephrases it into clinical language.

// Request

{

  "text": "Yeah I had another panic attack at work on Wednesday...",

  "targetSection": "subjective",

  "format": "soap"

}

// Response

{

  "clinical": "Client reported experiencing a panic attack during a work meeting...",

  "original": "Yeah I had another panic attack at work on Wednesday..."

}

## **POST /api/sessions/:id/compliance-check**

Checks the completed note for compliance issues before signing.

// Request

{

  "note": { "subjective": "...", "objective": "...", ... },

  "diagnosisCode": "F41.1",

  "treatmentPlan": { ... }

}

// Response

{

  "issues": \[

    {

      "section": "plan",

      "severity": "warning",

      "message": "Plan section lacks specific next-session interventions",

      "suggestion": "Continue CBT-based anxiety management with focus on..."

    }

  \],

  "passesCompliance": true

}

## **POST /api/sessions/:id/note**

Saves and optionally signs the final note.

// Request

{

  "format": "soap",

  "sections": {

    "subjective": "Final text...",

    "objective": "Final text...",

    "assessment": "Final text...",

    "plan": "Final text..."

  },

  "status": "signed",

  "cptCode": "90837",

  "diagnosisCode": "F41.1"

}

# **Database Schema**

CREATE TABLE clinical\_notes (

  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

  session\_id UUID NOT NULL REFERENCES sessions(id) UNIQUE,

  therapist\_id UUID NOT NULL REFERENCES therapists(id),

  client\_id UUID NOT NULL REFERENCES clients(id),

  format TEXT NOT NULL CHECK (format IN ('soap','dap','birp','freeform')),

  sections JSONB NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft'

    CHECK (status IN ('draft','completed','signed')),

  cpt\_code TEXT,

  diagnosis\_codes TEXT\[\],

  signed\_at TIMESTAMPTZ,

  compliance\_check JSONB,

  ai\_draft JSONB,

  created\_at TIMESTAMPTZ DEFAULT NOW(),

  updated\_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE TABLE smart\_transcripts (

  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

  session\_id UUID NOT NULL REFERENCES sessions(id) UNIQUE,

  topics JSONB NOT NULL,

  highlights JSONB NOT NULL,

  generated\_at TIMESTAMPTZ DEFAULT NOW()

);

**smart\_transcripts is populated asynchronously** after transcription completes. It’s ready before the therapist ever opens the Note Builder.

# **Frontend Design**

## **Layout: Split Screen**

Desktop: 50/50 split. Left panel scrolls independently from right panel. A divider between them is draggable to resize.

Mobile: Tabs (“Transcript” / “Note”) since side-by-side doesn’t work on small screens. Tapping a transcript moment switches to the Note tab with the item added.

### **Left Panel: Smart Transcript**

* Header: session date, client name, duration

* Filter bar: toggle highlight types (insights, progress, interventions, risks, goals)

* Search box: search the transcript text

* Topic sections: collapsible accordion, color-coded by topic

* Each segment: speaker label, timestamp, text, highlight tags

* Key quotes: displayed in a callout box with “Add to Subjective” button

* Audio playback: mini player at the bottom that plays from any clicked timestamp

### **Right Panel: Note Builder**

* Header: note format selector (SOAP / DAP / BIRP / Free-form)

* Section cards: one per note section, each showing AI draft or therapist content

* AI draft badge: green border \+ “AI Draft” label when showing generated content

* Inline editing: click any section to edit. Rich text with basic formatting.

* Accept/Edit/Delete buttons on each AI draft section

* Session details bar: CPT code, diagnosis, start/end time (auto-populated, editable)

* Bottom: “Save Draft” and “Review & Sign” buttons

* Compliance results: yellow banners appear after Review & Sign if issues found

# **Therapist Preferences (Settings)**

Each therapist configures their note preferences once during onboarding:

| Setting | Options | Default |
| :---- | :---- | :---- |
| Note format | SOAP, DAP, BIRP, Free-form | SOAP |
| AI draft on open | Auto-generate draft when opening builder, or start empty | Auto-generate |
| Clinical language level | Standard clinical terminology, or match therapist’s own writing style | Standard |
| Default CPT code | 90834 (30 min), 90837 (45 min), or auto-detect from session length | Auto-detect |
| Compliance check | Always run before signing, or optional | Always |
| Show original quotes | When rephrasing, show original transcript text alongside clinical version | Show |

# **Cost Summary**

| LLM Call | Per Session | Per Therapist/Month | At 100 Therapists |
| :---- | :---- | :---- | :---- |
| Transcript organization | $0.002 | $0.35 | $35 |
| Note draft generation | $0.003 | $0.52 | $52 |
| Rephrase (avg 3 per session) | $0.001 | $0.17 | $17 |
| Compliance check | $0.001 | $0.17 | $17 |
| **Total** | **\~$0.007** | **\~$1.21** | **\~$121** |

**$1.21/month per therapist for AI-powered note building.** Combined with the dashboard ($3.23/month) and GPU transcription ($46/month flat), your entire AI stack costs under $5/therapist/month plus a fixed $46 GPU fee.

# **Implementation Order**

## **Phase 1: Smart Transcript Pipeline (2–3 days)**

* Add transcript organization LLM call to the transcription pipeline (runs after Voxtral)

* Create smart\_transcripts table and data model

* Build topic segmentation \+ highlight extraction prompt

* Test with real session transcripts

## **Phase 2: Note Builder API (2–3 days)**

* GET /api/sessions/:id/smart-transcript

* POST /api/sessions/:id/note-draft (AI draft generation)

* POST /api/sessions/:id/rephrase (transcript-to-clinical rephrasing)

* POST /api/sessions/:id/compliance-check

* POST /api/sessions/:id/note (save/sign)

* Prompt engineering for all 3 note formats

## **Phase 3: Frontend — Left Panel (2–3 days)**

* Split-screen layout with resizable divider

* Topic accordion component with colored tags

* Highlight filtering and search

* Click-to-add interaction (transcript → note)

* Audio mini-player with timestamp jumping

## **Phase 4: Frontend — Right Panel (3–4 days)**

* Note template selector (SOAP/DAP/BIRP/Free-form)

* AI draft display with accept/edit/delete

* Inline rich text editing

* Rephrase flow (original → clinical toggle)

* Session details bar (CPT, diagnosis, times)

* Save draft / review & sign flow

* Compliance check result banners

## **Phase 5: Mobile Adaptation (1–2 days)**

* Tab-based layout (Transcript / Note)

* Tap-to-add flow adapted for single-panel view

* Responsive component sizing

## **Phase 6: Therapist Settings (1 day)**

* Preferences page for note format, AI draft behavior, clinical language level

* Default CPT code and diagnosis code management

**Total estimated time: 11–16 days** for a senior engineer. The frontend is the bulk of the work — the split-screen interaction with transcript-to-note flow needs to feel effortless.

*LLM costs based on Claude Haiku via Amazon Bedrock (April 2026 pricing). The Note Builder is a clinical documentation aid — the therapist is always the author and signer of the final note. Compliance checker provides suggestions only and does not guarantee insurance acceptance. All data stays within AWS infrastructure.*