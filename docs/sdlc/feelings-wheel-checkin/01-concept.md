# Feelings Wheel Check-in — Concept

## Problem Statement
Clinicians need structured, longitudinal emotion data from participants to identify patterns and inform treatment. Today, emotional state is scattered across numeric mood sliders (low granularity), free-text journals (unstructured), and in-session self-report (infrequent). There's no consistent, queryable emotion vocabulary captured between visits.

## Recommended Approach
Add a `FEELINGS_WHEEL` field type to the existing Daily Tracker system using Willcox's 7-core feelings wheel taxonomy (Happy, Sad, Angry, Fearful, Disgusted, Surprised, Bad) with secondary and tertiary tiers. Participants see an interactive wheel that allows flexible-depth emotion selection — tap a core emotion and optionally drill deeper. They can select up to 3 emotions per entry to capture mixed emotional states. No intensity rating — the tier depth serves as an implicit intensity signal. On the clinician side, a dedicated dashboard widget visualizes emotion frequency, trends, and patterns over time.

## Key Scenarios
1. **Quick morning check-in** — Participant opens their daily tracker, taps "Happy" on the wheel, submits alongside their other fields. 10 seconds.
2. **Reflective evening entry** — Participant drills from "Fearful" → "Anxious" → "Overwhelmed", adds a second emotion "Sad" → "Lonely". Captures mixed state on a hard day.
3. **Clinician pre-session review** — Clinician opens the emotion trends widget, sees "Lonely" variants logged 4 times this week (up from baseline), uses this to guide the session conversation.

## Out of Scope
- Custom emotion taxonomies (standard Willcox 7-core only)
- Intensity/severity rating (tier depth is the proxy)
- AI-powered pattern detection or alerts (future enhancement)
- Standalone emotion module or separate app tab (lives within daily tracker)
- Multiple emotion check-ins per day (one set per tracker entry)
- More than 3 emotion selections per entry

## Open Questions
- Exact tertiary emotion list — Willcox's original has ~80 tertiary emotions; may need to curate for mobile UX
- Whether the wheel visualization on mobile should be a literal radial wheel or an adapted drill-down list for smaller screens

## Alternatives Considered
- **Standalone Emotion Module** — Rejected because it fragments "how are you today" data, adds participant friction, and increases engineering scope for marginal UX benefit.
- **Plain Tracker Field Without Visualization** — Rejected because raw emotion labels in a table don't serve the core use case of longitudinal pattern recognition. The dedicated clinician widget is where clinical value lives.
- **Single emotion selection** — Rejected in favor of up to 3, since mixed emotional states are clinically meaningful and common.
- **Intensity rating** — Rejected to keep interaction lightweight; tier depth (core vs secondary vs tertiary) serves as an implicit intensity proxy.
