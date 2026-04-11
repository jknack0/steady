

**Feature Spec: Morning Dashboard**

AI-Powered Daily Briefing for Therapists

*"Walk in prepared for every session, every client, every claim"*

April 2026

# **Overview**

When a therapist logs in, the first thing they see is an AI-generated daily briefing. The system gathers data from their schedule, recent session transcripts, insurance claims, and billing — then uses an LLM (Claude via Bedrock) to distill everything into a scannable, actionable dashboard. The goal: in 60 seconds, the therapist knows exactly what’s coming today and what needs their attention.

**The core insight:** therapists are clinicians, not billing administrators. Every minute they spend hunting for claim statuses or re-reading old notes is a minute they’re not doing therapy. This dashboard gives them back that time.

# **Dashboard Sections**

The dashboard has 7 sections, ordered by urgency. Each section has a raw data source and an LLM-generated summary.

| Section | Data Source | What the LLM Generates |
| :---- | :---- | :---- |
| **1\. Alerts & Action Items** | Claims, notes, schedule, auth tracking | Urgent items that need therapist action RIGHT NOW |
| **2\. Today’s Schedule** | Sessions table, client profiles | Per-client prep briefings from recent transcripts |
| **3\. Session Prep Cards** | Transcripts, session notes (last 3 sessions per client) | Key themes, progress notes, what to follow up on |
| **4\. Unsigned Notes** | Sessions table (notes\_signed \= false) | List of sessions missing signed clinical notes |
| **5\. Claims & Billing** | Claim.MD API (claim status, ERA data) | Plain-English summary of in-flight, paid, and denied claims |
| **6\. Receivables** | ERA data, client balances | What’s been paid, what’s outstanding, client balances |
| **7\. Upcoming Flags** | Auth tracking, session counts, payer rules | Authorizations expiring, session limits approaching |

# **Section Details**

## **1\. Alerts & Action Items**

Top of the dashboard. Red/yellow/green. These are things the therapist must do today or risk consequences.

**Examples of alerts:**

| Alert Type | Example | Priority | Source |
| :---- | :---- | :---- | :---- |
| Denied claim | Aetna denied claim for Jane D. — reason: auth expired | High | Claim.MD /response/ |
| Client risk flag | Client Mark R. mentioned suicidal ideation in last session | High | Transcript keyword detection |
| Auth expiring | Sarah K.’s BCBS auth expires in 3 sessions (2 weeks) | Medium | Auth tracking table |
| Unsigned notes | 4 sessions from last week still missing signed notes | Medium | Sessions table |
| No-show follow-up | Client Tom P. no-showed yesterday — needs reschedule | Medium | Schedule \+ attendance |
| Payment received | $1,240 in ERA payments received since last login | Low | Claim.MD /eralist/ |

**LLM prompt for alerts:** The API gathers all alert-worthy data points and sends them to the LLM with instructions to prioritize by urgency and write 1-sentence action items. The LLM does NOT decide what’s an alert — the API logic determines that. The LLM just writes the human-readable summary.

## **2\. Today’s Schedule**

A timeline of today’s sessions with client names, times, and session type (individual, couples, group). Each entry links to a prep card.

**Data:** Pure database query. No LLM needed for the schedule itself — it’s just a list. The LLM summarizes it into a one-liner at the top:

*“You have 8 sessions today from 9am to 5pm. First session is with Sarah K. at 9:00am. Two new clients today (intake sessions at 11am and 2pm).”*

### **Schedule Display**

| Time | Client | Type | Prep |
| :---- | :---- | :---- | :---- |
| 9:00 AM | Sarah K. | Follow-up (session \#8) | View prep → |
| 10:00 AM | Mark R. | Follow-up (session \#14) | View prep → |
| 11:00 AM | New Client (Lisa M.) | Intake | No prior history |
| 12:00 PM | — | Lunch break | — |
| 1:00 PM | Tom P. | Follow-up (session \#6) | View prep → |
| 2:00 PM | New Client (James W.) | Intake | No prior history |
| 3:00 PM | Amy L. | Follow-up (session \#22) | View prep → |
| 4:00 PM | David H. | Follow-up (session \#11) | View prep → |

## **3\. Session Prep Cards (LLM-Powered)**

This is the killer feature. For each returning client on today’s schedule, the system generates a prep card by feeding the last 3 session transcripts \+ clinical notes to the LLM.

### **What the LLM generates per client**

* **Key themes from recent sessions:** “Sarah has been working through grief related to her mother’s passing in January. Last session focused on guilt around not visiting more often.”

* **Progress notes:** “Anxiety symptoms have decreased. Sarah reported sleeping through the night for the first time in 3 weeks.”

* **Follow-up items:** “Sarah wanted to try journaling exercise discussed in session 7\. Ask about how that went.”

* **Risk flags:** “No current risk factors identified.” (or: “Client mentioned increased alcohol use in session 13 — follow up.”)

* **Insurance context:** “BCBS PPO. 4 sessions remaining on current auth. Copay: $30.”

### **LLM Prompt Template**

You are a clinical assistant helping a therapist prepare for

their next session. Based on the transcripts and notes from

the last 3 sessions, generate a concise briefing.

Include:

1\. Key themes (2-3 sentences)

2\. Progress since first of these sessions (1-2 sentences)

3\. Follow-up items the therapist should ask about (bullet list)

4\. Risk flags (substance use, self-harm, crisis mentions)

5\. Insurance status (sessions remaining, copay)

Keep it clinical but readable. No jargon unless the therapist

used it in their notes. Be specific \- reference actual things

the client said, not generic summaries.

CRITICAL: Never fabricate information. If something wasn't

discussed in the transcripts, don't mention it. If risk

factors are present, always surface them prominently.

Session transcripts:

\[TRANSCRIPT\_1\]

\[TRANSCRIPT\_2\]

\[TRANSCRIPT\_3\]

Therapist's clinical notes:

\[NOTES\_1\]

\[NOTES\_2\]

\[NOTES\_3\]

Insurance info:

\[AUTH\_STATUS\]

### **Token Estimation**

Each 45-min transcript is \~6,000 tokens. 3 transcripts \+ notes \+ prompt \= \~20,000–25,000 input tokens per client. For 6 returning clients on a typical day:

|  | Per Client | Per Day (6 clients) | Per Month (22 days) |
| :---- | :---- | :---- | :---- |
| Input tokens | \~22,000 | \~132,000 | \~2.9M |
| Output tokens | \~500 | \~3,000 | \~66,000 |
| Claude Haiku cost | \~$0.006 | \~$0.035 | \~$0.77 |
| Claude Sonnet cost | \~$0.07 | \~$0.42 | \~$9.24 |

**Haiku is the move for prep cards.** $0.77/month per therapist for AI-generated session prep. Even Sonnet is under $10/month. Use Haiku for daily generation and offer a “deep dive” button that regenerates with Sonnet for more nuanced analysis.

## **4\. Unsigned Notes**

A simple list of sessions where the therapist hasn’t signed their clinical notes. This is a compliance requirement — unsigned notes can’t be billed and create audit risk.

* **Data source:** Sessions table where notes\_status \!= ‘signed’ and session\_date \< today.

* **Display:** List with client name, session date, and a “Sign Now” button. Badge count shown on the dashboard header.

* **LLM involvement:** None needed. This is a simple database query.

* **Escalation:** If notes are unsigned for \> 72 hours, elevate to the Alerts section with a yellow flag.

## **5\. Claims & Billing Status**

Summarizes the current state of insurance claims. The API fetches data from Claim.MD’s /response/ endpoint, groups it by status, and the LLM writes a plain-English summary.

### **Claim Status Groups**

| Status | Color | Example Count | What It Means |
| :---- | :---- | :---- | :---- |
| Submitted | Blue | 12 claims | Sent to payer, waiting for acknowledgment |
| Accepted | Green | 8 claims | Payer received and is processing |
| Paid | Green | 45 claims | Payment received (show total $) |
| Denied | Red | 2 claims | Payer rejected — needs action |
| Pending info | Yellow | 1 claim | Missing info, needs resubmission |

**LLM summary example:** 

*“You have 68 claims total. 45 have been paid ($6,240 collected). 12 are submitted and waiting. 2 claims were denied — one for Aetna (auth expired for Jane D.) and one for UHC (wrong CPT code for David H.). Both need your attention today.”*

## **6\. Receivables**

Money in and money owed. Combines ERA payment data from Claim.MD with client balance tracking.

### **Display Sections**

* **Recent payments:** ERA payments received since last login. Show payer, amount, date. “$1,240 received from 3 payers since Friday.”

* **Outstanding insurance:** Total amount in claims submitted but not yet paid. “$3,420 in outstanding claims across 20 sessions.”

* **Client balances:** Copays, coinsurance, and self-pay amounts owed by clients. “$450 in client balances across 8 clients. Lisa M. owes $180 (3 missed copays).”

* **Monthly revenue:** Total collected this month vs last month. Simple trend arrow.

## **7\. Upcoming Flags**

Things that aren’t urgent today but will be soon. Prevents surprises.

* **Authorization expirations:** “Sarah K. has 4 sessions left on her BCBS auth (expires May 15). Submit re-auth request this week.”

* **Session limits:** “Tom P.’s plan covers 20 sessions/year. He’s used 16\. Discuss with client.”

* **Upcoming intakes:** “2 new client intakes scheduled this week. Insurance eligibility pre-checked: both active.”

* **Client birthdays:** Small touch, but therapists appreciate it.

* **Recredentialing due:** “Your CAQH profile expires in 45 days. Update before June 1.”

# **Technical Architecture**

## **How It Works**

The dashboard is generated on login (or first load of the day). Data is gathered in parallel, then sent to the LLM for summarization.

1. **Therapist logs in** (or opens the app for the first time today).

2. **Frontend calls** GET /api/dashboard. The API checks if a cached dashboard exists from today. If yes, return it immediately.

3. **If no cache, the API fires parallel data fetches:** 

* Database: today’s schedule, unsigned notes, client profiles, auth tracking

* Database: last 3 transcripts \+ notes for each client on today’s schedule

* Claim.MD API: claim statuses, recent ERA payments, pending claims

* Internal: client balances, receivables

4. **Data is assembled into a structured payload** (\~50K–100K tokens depending on how many clients are on the schedule).

5. **API sends 3 separate LLM calls in parallel** (not one massive call):

* **Call 1:** Session prep cards (all clients’ transcripts → per-client summaries)

* **Call 2:** Alerts \+ billing summary (claims, denials, payments → actionable summary)

* **Call 3:** Upcoming flags (auth tracking, session limits → warnings)

6. **LLM responses are cached in the database** (dashboard\_cache table) with a TTL of 24 hours. Subsequent loads today are instant.

7. **Frontend renders the dashboard** from the structured response. Each section is a component.

## **LLM Integration (Claude on Bedrock)**

We use Claude on Amazon Bedrock. This keeps everything inside AWS — no data leaves our infrastructure.

| LLM Call | Model | Input Tokens | Output Tokens | Cost/Call | Why This Model |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Session prep (6 clients) | Claude Haiku | \~130K | \~3K | \~$0.035 | Fast, cheap, good enough for summarization |
| Alerts \+ billing | Claude Haiku | \~10K | \~500 | \~$0.003 | Simple extraction, doesn’t need Sonnet |
| Upcoming flags | Claude Haiku | \~5K | \~300 | \~$0.002 | Pattern matching on dates/counts |
| **Total per login** |  | **\~145K** | **\~3.8K** | **\~$0.04** |  |
| **Monthly (22 days)** |  |  |  | **\~$0.88/therapist** |  |

**Under $1/month per therapist for AI-generated daily briefings.** Even at 100 therapists that’s $88/month in Bedrock costs.

**“Deep Dive” button:** For any prep card, the therapist can click “Deep Dive” to regenerate with Claude Sonnet for more nuanced analysis. This costs \~$0.07 per client and is on-demand, not generated for every client every day.

# **API Design**

## **GET /api/dashboard**

Returns the full dashboard payload for the authenticated therapist. Returns cached version if generated today, otherwise generates fresh.

// Response

{

  "generatedAt": "2026-04-09T13:02:15Z",

  "cached": false,

  "greeting": "Good morning, Dr. Johnson. You have 8 sessions today.",

  "alerts": \[

    {

      "type": "denied\_claim",

      "priority": "high",

      "message": "Aetna denied claim for Jane D. — auth expired.",

      "action": "Resubmit with updated auth number",

      "link": "/claims/clm\_abc123"

    },

    {

      "type": "unsigned\_notes",

      "priority": "medium",

      "message": "4 sessions from last week need signed notes.",

      "action": "Review and sign",

      "link": "/notes/unsigned"

    }

  \],

  "schedule": \[

    {

      "time": "9:00 AM",

      "clientName": "Sarah K.",

      "sessionType": "follow\_up",

      "sessionNumber": 8,

      "prepCard": { ... }

    }

  \],

  "prepCards": {

    "client\_sarah\_k": {

      "themes": "Working through grief related to...",

      "progress": "Anxiety symptoms decreasing...",

      "followUp": \["Ask about journaling exercise", "Check on sleep"\],

      "riskFlags": \[\],

      "insurance": { "payer": "BCBS PPO", "sessionsRemaining": 4, "copay": 30 }

    }

  },

  "billing": {

    "summary": "68 total claims. 45 paid ($6,240). 2 denied.",

    "recentPayments": 1240,

    "outstanding": 3420,

    "denials": \[ ... \],

    "clientBalances": 450

  },

  "flags": \[

    {

      "type": "auth\_expiring",

      "message": "Sarah K.’s BCBS auth expires in 4 sessions",

      "dueDate": "2026-05-15"

    }

  \],

  "unsignedNotes": \[

    { "sessionId": "sess\_123", "clientName": "Tom P.", "date": "2026-04-04" }

  \]

}

## **POST /api/dashboard/refresh**

Force-regenerates the dashboard (invalidates cache). Used when the therapist wants fresh data after making changes.

## **POST /api/dashboard/deep-dive/:clientId**

Regenerates a single client’s prep card using Claude Sonnet instead of Haiku. Returns a more detailed analysis. On-demand, costs \~$0.07 per call.

# **Database Schema**

## **New Tables**

CREATE TABLE dashboard\_cache (

  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

  therapist\_id UUID NOT NULL REFERENCES therapists(id),

  generated\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  payload JSONB NOT NULL,

  expires\_at TIMESTAMPTZ NOT NULL,

  UNIQUE(therapist\_id, generated\_at::date)

);

CREATE TABLE auth\_tracking (

  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

  client\_id UUID NOT NULL REFERENCES clients(id),

  payer\_name TEXT NOT NULL,

  auth\_number TEXT,

  sessions\_authorized INT NOT NULL,

  sessions\_used INT NOT NULL DEFAULT 0,

  start\_date DATE NOT NULL,

  end\_date DATE NOT NULL,

  status TEXT DEFAULT 'active'

    CHECK (status IN ('active','expiring','expired','renewed')),

  created\_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE TABLE client\_risk\_flags (

  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

  client\_id UUID NOT NULL REFERENCES clients(id),

  session\_id UUID REFERENCES sessions(id),

  flag\_type TEXT NOT NULL

    CHECK (flag\_type IN ('suicidal\_ideation','self\_harm','substance\_use',

      'homicidal\_ideation','crisis','other')),

  details TEXT,

  detected\_at TIMESTAMPTZ DEFAULT NOW(),

  resolved\_at TIMESTAMPTZ,

  resolved\_by UUID REFERENCES therapists(id)

);

## **Existing Table Changes**

ALTER TABLE sessions ADD COLUMN notes\_status TEXT

  DEFAULT 'draft'

  CHECK (notes\_status IN ('draft','completed','signed'));

ALTER TABLE sessions ADD COLUMN notes\_signed\_at TIMESTAMPTZ;

# **Risk Flag Detection**

After each transcription completes, the system runs a second LLM pass to detect risk factors. This is separate from the dashboard generation and runs as part of the transcription pipeline.

## **How It Works**

1. **GPU transcription completes** and posts transcript to the API.

2. **API sends the transcript to Claude Haiku** via Bedrock with a risk-detection prompt.

3. **If risk factors are detected,** a record is inserted into client\_risk\_flags.

4. **Risk flags surface immediately** in the therapist’s dashboard (Alerts section) on next load.

### **Risk Detection Prompt**

Analyze this therapy session transcript for risk factors.

Return a JSON array of detected risks, or an empty array

if none are found.

Risk categories to check:

\- suicidal\_ideation: mentions of wanting to die, not wanting

  to be alive, suicidal thoughts or plans

\- self\_harm: cutting, burning, or other self-injurious behavior

\- substance\_use: increased alcohol, drug use, misuse of

  prescription medication

\- homicidal\_ideation: threats of violence toward others

\- crisis: acute mental health crisis, psychotic symptoms,

  severe dissociation

CRITICAL: Be sensitive. Flag genuine clinical concerns, not

casual mentions. 'I could have killed him' as an expression

of frustration is NOT homicidal ideation.

Return format:

\[{"type": "substance\_use", "details": "Client reported..."}\]

**Cost:** \~$0.002 per transcript (Haiku). Runs automatically after every transcription. $0.35/month per therapist.

**IMPORTANT:** This is a clinical support tool, NOT a replacement for clinical judgment. The therapist is always the decision-maker. The system surfaces flags; the therapist evaluates them.

# **Frontend Design**

The dashboard is a single-page layout optimized for a quick morning scan. No tabs, no hidden content — everything scrolls vertically so the therapist can skim in 60 seconds.

## **Layout**

**Top:** Greeting \+ quick stats bar (sessions today, unsigned notes, pending claims). These are data-only, no LLM needed.

**Section 1:** Alert cards. Red \= urgent (denials, risk flags). Yellow \= needs attention (unsigned notes, expiring auths). Green \= informational (payments received). Collapsible.

**Section 2:** Schedule timeline. Vertical list of today’s sessions with time, client name, session number. Each row expandable to show the prep card inline.

**Section 3:** Billing sidebar (or below on mobile). Claims summary, recent payments, outstanding balance. Compact.

**Section 4:** Flags. Quiet section at the bottom for upcoming warnings.

### **Interactions**

* **Click a session in the schedule** → expands inline to show the prep card with themes, progress, follow-ups. Click again to collapse.

* **Click “Deep Dive” on a prep card** → calls /api/dashboard/deep-dive/:clientId, shows loading spinner, replaces prep card with Sonnet-generated version.

* **Click an alert** → navigates to the relevant page (claim details, unsigned notes, etc.).

* **Click “Refresh” icon** → calls /api/dashboard/refresh, regenerates everything. Shows loading state while LLM processes.

* **Pull-to-refresh on mobile** → same as refresh button.

### **Loading State**

First load of the day takes 3–8 seconds (parallel data fetch \+ 3 LLM calls). Show a skeleton UI with placeholder blocks that fill in as each section completes. Don’t wait for all 3 LLM calls — stream each section in as it arrives:

1. **Schedule appears first** (pure database query, \< 200ms).

2. **Unsigned notes appear next** (database query, \< 200ms).

3. **Alerts \+ billing appear** (Claim.MD API \+ LLM call, \~2–3 seconds).

4. **Prep cards appear last** (largest LLM call, \~3–8 seconds depending on how many clients).

Subsequent loads today hit the cache and render instantly (\< 500ms).

# **Cost Summary**

| Component | Per Therapist/Month | At 10 Therapists | At 100 Therapists |
| :---- | :---- | :---- | :---- |
| Dashboard generation (Haiku) | $0.88 | $8.80 | $88 |
| Risk detection (Haiku) | $0.35 | $3.50 | $35 |
| Deep dive on-demand (Sonnet) | \~$2 (est. 30 uses) | $20 | $200 |
| Bedrock API overhead | $0 | $0 | $0 |
| **Total LLM costs** | **\~$3.23** | **\~$32.30** | **\~$323** |

**$3/month per therapist for AI-powered daily briefings \+ risk detection.** This is a feature that competing platforms charge $50–100/month for. It’s your competitive advantage.

# **Implementation Order**

## **Phase 1: Data Layer (2–3 days)**

* Create auth\_tracking and client\_risk\_flags tables

* Add notes\_status column to sessions

* Build data aggregation queries (schedule, unsigned notes, client history)

* Integrate Claim.MD status polling into billing data

## **Phase 2: LLM Integration (2–3 days)**

* Set up Bedrock client in the API (Claude Haiku)

* Write and test prompt templates for prep cards, alerts, and flags

* Build risk detection pipeline (runs after each transcription)

* Implement 3-call parallel LLM pattern

* Build dashboard cache (generate once per day, return cached)

## **Phase 3: API (1–2 days)**

* GET /api/dashboard endpoint

* POST /api/dashboard/refresh endpoint

* POST /api/dashboard/deep-dive/:clientId endpoint

* Response structure and error handling

## **Phase 4: Frontend (3–4 days)**

* Dashboard page layout (skeleton UI, loading states)

* Alert cards component (red/yellow/green, clickable)

* Schedule timeline with expandable prep cards

* Billing summary section

* Flags section

* Deep dive button \+ regeneration flow

* Pull-to-refresh / refresh button

* Responsive design (desktop \+ mobile)

## **Phase 5: Risk Detection (1 day)**

* Add risk detection LLM call to transcription pipeline

* client\_risk\_flags table writes

* Surface risk flags in dashboard alerts

* Therapist acknowledgment flow (mark as reviewed)

**Total estimated time: 9–13 days** for a senior engineer. Front-end is the biggest chunk because the UX needs to feel effortless.

*LLM costs based on Claude Haiku via Amazon Bedrock (April 2026 pricing). Risk detection is a clinical support tool, not a diagnostic tool. All patient data stays within AWS infrastructure. Dashboard caches expire daily and are regenerated on first login.*