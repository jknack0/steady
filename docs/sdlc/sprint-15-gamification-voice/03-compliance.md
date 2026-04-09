# Sprint 15: Gamification + Voice Capture + Smart Notification Escalation — Compliance Assessment

## Verdict: PASS_WITH_CONDITIONS

Sprint 15 is compliant with HIPAA Privacy Rule, Security Rule, and HITECH provided the 5 mandatory conditions below are implemented. This sprint has **low PHI risk** overall: streak records are aggregate counts, voice transcription is on-device only, and notification dismissal tracking stores category names and dates without content. No novel compliance challenges identified.

---

## Regulatory Scope

| Framework | Applicability | Reasoning |
|---|---|---|
| **HIPAA Privacy Rule** (45 CFR 164.500-534) | Applies (minimal) | Streak data is behavioral metadata, not clinical content. Notification categories are system labels, not PHI. |
| **HIPAA Security Rule** (45 CFR 164.302-318) | Applies | ePHI-adjacent data stored and transmitted electronically. Standard safeguards apply. |
| **HITECH** (42 USC 17932) | Applies | Breach notification requirements apply, though breach of streak counts alone is low-severity. |
| **42 CFR Part 2** | Not applicable | No substance use disorder data involved in this sprint. |
| **GDPR** | Conditionally | Voice processing is on-device; no additional EU-specific controls needed. |
| **SOC 2** | Deferred | Phase 11 per roadmap. |
| **PCI DSS** | Not applicable | No payment data. |

---

## PHI Classification

| Data Element | Classification | Rationale |
|---|---|---|
| `StreakRecord.userId` | Indirect PHI identifier | Links to user record |
| `StreakRecord.category` | Not PHI | System enum (JOURNAL, CHECKIN, HOMEWORK) |
| `StreakRecord.currentStreak` / `longestStreak` | Not PHI | Aggregate count, no clinical content |
| `StreakRecord.lastActiveDate` | Low-risk PHI | Date of app usage; reveals behavioral pattern |
| `NotificationPreference.customSettings.dismissals` | Not PHI | Array of dates + category; no notification content stored |
| Voice audio (on-device) | **PHI (high risk)** | May contain spoken health information — but never transmitted or stored by Steady |
| Transcribed text (task title / journal content) | **PHI** | Stored as standard task/journal data; already covered by existing controls |
| Notification escalation copy | Not PHI | Static system-generated text; no patient-specific content |

**Key finding:** The highest-risk data element (voice audio containing spoken PHI) never leaves the device. The OS speech recognition engine processes it locally, and only the resulting text enters Steady's data flow through existing, already-protected channels (task title, journal freeformContent).

---

## Risk Analysis

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Streak data reveals treatment engagement patterns to unauthorized party | Low | Low | Data is aggregate counts; tenant-isolated by userId; standard auth |
| Voice audio intercepted during on-device processing | Very Low | High | Audio stays within OS sandbox; Steady has no access to raw audio |
| Third-party speech service receives PHI | N/A | Critical | Mitigated by design: `expo-speech-recognition` uses on-device OS APIs, not cloud services |
| Notification escalation copy inadvertently contains PHI | Low | Medium | Escalation messages are static templates in code, not dynamic patient data |
| Dismissal timestamps reveal behavioral patterns | Low | Low | Dates only, no content; tenant-isolated; 30-day auto-trim |

---

## Mandatory Conditions for Approval

### COND-1: Voice transcription must use on-device processing only

The `expo-speech-recognition` integration MUST be configured to use on-device speech recognition. If a device falls back to cloud-based recognition (some older Android devices), the app MUST either: (a) detect this and warn the user, or (b) disable voice capture on that device. No audio data may be transmitted to third-party servers.

*Verification:* Code review confirms `expo-speech-recognition` configuration. Integration test on both iOS and Android verifies no network requests during voice capture (network monitor during test). Documentation note in the codebase explaining the on-device requirement.

### COND-2: Streak endpoint returns only own data

`GET /api/stats/streaks` MUST filter by `userId` from the authenticated JWT. The endpoint MUST NOT accept a `userId` query parameter for participants. Clinician access to participant streaks MUST go through the existing `GET /api/stats/:participantId` endpoint which already enforces ownership checks.

*Verification:* Integration test confirms participant cannot access another user's streaks. Test confirms the endpoint ignores any `userId` in query params.

### COND-3: Dismiss and engage endpoints accept only enum values

`POST /api/notifications/dismiss` and `POST /api/notifications/engage` MUST validate the `category` field against the `NotificationCategory` enum via Zod. Arbitrary strings MUST be rejected with 400. No free-text fields on these endpoints.

*Verification:* Integration test sends invalid category string and asserts 400. Schema test validates enum constraint.

### COND-4: No notification content in logs or audit

The notification escalation logic MUST NOT log the original or escalated notification body text. Logger calls in the escalation path MUST pass only `userId`, `category`, and whether escalation was triggered (boolean). Audit logs for dismiss/engage record only the action and category, never notification content.

*Verification:* Code review of all logger calls in the notification escalation path. Integration test invokes escalation and greps test log output for notification body text — expects zero matches.

### COND-5: Voice transcription text follows existing PHI protections

Transcribed voice text that populates task titles or journal entries MUST flow through the same validation and storage paths as manually typed text. No separate storage, logging, or transmission path for voice-originated content. The existing HIPAA controls on Task and JournalEntry models apply without modification.

*Verification:* Code review confirms voice-to-text output is set via the same state variables and API calls as keyboard input. No new API endpoints or storage for voice content.

---

## Conditions Traceability Matrix

| Condition | Architect | Engineer | QA |
|---|---|---|---|
| COND-1 On-device voice | Document `expo-speech-recognition` config requirements | Configure library for on-device mode | Verify no network traffic during voice capture |
| COND-2 Streak data isolation | Auth middleware on streak endpoint | Filter by JWT userId | Cross-user access test |
| COND-3 Enum-only dismiss/engage | Zod schema with NotificationCategory enum | Validate middleware on both endpoints | Invalid category 400 test |
| COND-4 No content in logs | Logger guidelines for escalation | Discipline in logger calls | Log grep test |
| COND-5 Voice text same path | No separate voice data flow | Voice sets same state as keyboard | Code review confirmation |

---

## Final Assessment

**Verdict: PASS_WITH_CONDITIONS**

Sprint 15 is approved to proceed to Architecture. All 5 conditions above are mandatory. The PHI risk profile for this sprint is low — the most sensitive data element (voice audio) is handled entirely on-device by the OS, and the new server-side data (streak counts, dismissal dates) contains no clinical content.

**Next phase:** Architecture (Phase 4).
