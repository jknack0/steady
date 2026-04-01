# HIPAA Code Audit: Third-Party Integrations & Data Flows

**Date:** 2026-03-31
**Scope:** Email, S3 storage, push notifications, AI/LLM, queue, superbill generation
**Auditor:** Claude Code (automated static analysis)
**Disclaimer:** This is technical guidance, not legal advice. Final compliance decisions should involve qualified legal counsel and a designated Privacy Officer.

---

## Critical Findings (Must Fix)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| C-001 | `packages/api/src/routes/ai.ts:103-113` | **PHI sent to Anthropic API without confirmed BAA.** The `/api/ai/style-content` endpoint sends clinician-authored `rawContent` directly to the Anthropic Messages API. This content may contain patient education materials with PHI (patient names, diagnoses, treatment plans). The `/api/ai/generate-part` (line 234-243) and `/api/ai/generate-tracker` (line 143-184) endpoints similarly transmit clinician content to Anthropic servers. Anthropic must execute a BAA before any PHI can be transmitted. Without a BAA, every API call that includes PHI is a potential HIPAA violation. | Privacy Rule 164.502(e), Security Rule 164.314(a) | 1. Execute a BAA with Anthropic (verify Anthropic offers HIPAA-eligible API plans). 2. Until a BAA is in place, add a PHI warning to the UI and consider blocking PHI submission or using de-identification preprocessing. 3. Document the BAA in your vendor registry. |
| C-002 | `packages/api/src/routes/ai.ts:326-408` | **Full PDF documents sent to third-party LLM.** The `parse-homework-pdf` endpoint downloads a PDF from S3, base64-encodes it, and sends the entire document to Anthropic. Clinical worksheets commonly contain patient names, diagnosis information, and treatment details. This is the highest-risk AI endpoint because PDFs are opaque -- you cannot programmatically verify they are PHI-free. | Privacy Rule 164.502(e), Security Rule 164.312(e)(1) | 1. Ensure Anthropic BAA is in place (see C-001). 2. Add prominent UI warnings that uploaded PDFs should not contain patient-identifying information. 3. Consider a content preprocessing step that strips or redacts potential identifiers before transmission. 4. Log all AI API calls (document type, user, timestamp) for accounting of disclosures. |
| C-003 | `packages/api/src/services/rtm-notifications.ts:362-391` | **Patient first name included in push notification body sent to clinicians.** Lines 369, 379, and 389 embed `clientName` (the patient first name) in push notification content sent via Expo Push Notification Service. Push notifications are visible on lock screens, notification centers, and may be stored by Apple/Google servers. Patient names linked to clinical context (RTM billing status) constitute PHI. | Privacy Rule 164.502(a), Security Rule 164.312(e)(1) | 1. Replace patient names with anonymized identifiers in push notification bodies. 2. Move detailed information to in-app views that require authentication. 3. Example: change text from including clientName to a generic phrase like a client has met the RTM threshold. |

## High Findings (Should Fix Soon)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| H-001 | `packages/api/src/services/notifications.ts:384` | **Task title included in push notification body.** The `scheduleTaskReminder` function passes `taskTitle` to `getTaskCopy()`, which embeds it in the push notification body (e.g., Your task CBT Thought Record for anxiety is due today). Task titles may contain PHI such as diagnoses, treatment types, or session topics. This content is visible on lock screens and transmitted through Expo push infrastructure. | Privacy Rule 164.502(a) | Replace task title with a generic message: You have a task due today. Open the app to see details. Keep PHI behind authenticated app views only. |
| H-002 | `packages/api/src/services/notifications.ts:556` | **Tracker name used as push notification title.** Line 556 uses `tracker.name` as the notification title. Clinician-created tracker names may contain PHI (e.g., ADHD Medication Compliance or Anxiety Symptom Tracker). This is displayed on lock screens by the OS. | Privacy Rule 164.502(a) | Use a generic title like Daily check-in reminder instead of the tracker name. |
| H-003 | `packages/api/src/services/s3.ts:36-38` | **S3 publicUrl is a direct, unauthenticated URL.** The `generateUploadUrl` function returns a `publicUrl` that is a direct S3 object URL. If the S3 bucket ACL allows public reads, or if bucket policies are misconfigured, this URL would grant unauthenticated access to uploaded PHI (clinical documents, session recordings). The code does not enforce server-side encryption headers on upload. | Security Rule 164.312(a)(1), 164.312(e)(1) | 1. Remove the `publicUrl` return value entirely. All access should go through presigned download URLs (which already exist). 2. Enforce `ServerSideEncryption` on `PutObjectCommand`. 3. Ensure bucket policy blocks all public access (S3 Block Public Access enabled). |
| H-004 | `packages/api/src/routes/uploads.ts:84-100` | **Download presigned URL endpoint has no ownership verification.** The `/api/uploads/presign-download` endpoint accepts any S3 `key` parameter and generates a download URL for it. Any authenticated user (clinician or participant) can request a download URL for any file, including files uploaded by other users. This violates the minimum necessary standard. | Security Rule 164.312(a)(1), Privacy Rule 164.514(d) | 1. Validate that the requesting user owns the file (the key path includes `uploads/{userId}/` -- verify the userId segment matches the authenticated user or their associated profile). 2. Alternatively, store file metadata in the database with ownership and check before generating URLs. |
| H-005 | `packages/api/src/routes/ai.ts:85-122` | **No input length limit on AI endpoints.** The `style-content`, `generate-tracker`, and `generate-part` endpoints do not validate input length. A malicious or accidental large payload could send excessive PHI to the Anthropic API. There is also no rate limiting on these endpoints (rate limiting exists only on auth routes). | Security Rule 164.312(a)(1) | 1. Add maximum length validation (e.g., `rawContent.length <= 50000`). 2. Add rate limiting middleware to AI routes (e.g., 20 requests per minute per user). |
| H-006 | `packages/api/src/services/superbill.ts:147-184` | **Superbill response contains dense PHI.** The superbill data structure aggregates provider NPI, tax ID, patient name, insurance subscriber ID, diagnosis codes, and billing details in a single JSON response. While this is necessary for the feature, ensure: the endpoint has audit logging, the response is not cached, and the data is not logged. | Security Rule 164.312(b), 164.312(e)(1) | 1. Verify the RTM route that calls `generateSuperbillData` logs the access event to the audit trail. 2. Add `Cache-Control: no-store` header to superbill API responses. 3. Confirm no part of the superbill data is logged at any level. |

## Medium Findings (Fix in Next Sprint)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| M-001 | `packages/api/src/services/s3.ts:15` | **Presigned download URL expiry of 1 hour may be excessive for PHI.** `DOWNLOAD_EXPIRY` is set to 3600 seconds. A leaked or bookmarked download URL remains valid for 1 hour, allowing unauthenticated access to PHI documents during that window. | Security Rule 164.312(a)(1) | Reduce `DOWNLOAD_EXPIRY` to 300 seconds (5 minutes). Users can request a new URL if needed. |
| M-002 | `packages/api/src/services/s3.ts:27-30` | **No server-side encryption specified on upload.** The `PutObjectCommand` does not include `ServerSideEncryption` parameter. While S3 default encryption may be configured at the bucket level, explicitly specifying encryption in code provides defense-in-depth. | Security Rule 164.312(a)(2)(iv) | Add `ServerSideEncryption: AES256` (or `aws:kms` with a CMK) to the `PutObjectCommand` options. |
| M-003 | `packages/api/src/routes/ai.ts:194, 256, 422` | **Partial AI response logged on parse failure.** Line 194 logs `rawJson.slice(0, 200)` when AI returns invalid JSON. If the AI echoed back PHI from the prompt, this could log PHI. Same pattern at lines 256 and 422. | Security Rule 164.312(b) | Do not log AI response content, even truncated. Log only the fact that parsing failed. |
| M-004 | All notification services | **No audit trail for push notifications containing clinical context.** Push notifications about sessions, homework, RTM status, and tasks are sent without logging what was sent or to whom in the HIPAA audit trail. The existing Prisma audit middleware only covers database mutations, not outbound data transmissions. | Security Rule 164.312(b) | Add audit logging for all outbound push notifications: log user ID, notification category, and timestamp (but NOT the message body). |
| M-005 | `packages/api/src/services/email.ts:22` | **Invite code included in email body (future risk).** While the email service is currently a mock (not sending real emails), when integrated with SendGrid, the invite code in the email body travels through a third-party email service. Invite codes are access credentials that grant entry to patient health records. | Security Rule 164.312(d) | 1. When integrating SendGrid, ensure a BAA is in place. 2. Consider sending a link to claim the invitation rather than the raw code. 3. Set invite code expiration (e.g., 72 hours). |
| M-006 | `packages/api/src/services/queue.ts:14` | **pg-boss job payloads stored in plaintext in database.** pg-boss stores job payloads (which include user IDs, notification content, and metadata) in the `pgboss.job` table in plaintext. Job data may persist beyond completion depending on retention settings. | Security Rule 164.312(a)(2)(iv) | 1. Configure pg-boss `archiveCompletedAfterSeconds` to minimize how long job payloads persist. 2. Ensure the pgboss schema tables are included in database encryption at rest configuration. 3. Review pg-boss retention settings and purge completed jobs promptly. |
| M-007 | `packages/api/src` (global) | **No `Cache-Control: no-store` header on API responses.** No middleware or route handler sets `Cache-Control: no-store` on responses that contain PHI. Browser or intermediary caches could store PHI responses. | Security Rule 164.312(a)(1) | Add global middleware to set `Cache-Control: no-store` and `Pragma: no-cache` for all API responses, or at minimum for routes that return PHI. |

## Low Findings (Backlog)

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| L-001 | `packages/api/src/services/notifications.ts:215-226` | **Raw SQL in cancelNotificationsByKey.** The `executeRawUnsafe` call uses parameterized queries (safe from injection), but the function accepts a `keyPrefix` string from callers. Verify all callers pass sanitized values. | Security Rule 164.312(a)(1) | Add input validation on `keyPrefix` parameter (alphanumeric plus hyphens only). |
| L-002 | `packages/api/src/services/s3.ts:5` | **Default bucket name fallback.** The bucket name defaults to steady-uploads if env vars are not set. In a misconfiguration scenario, uploads could go to an unintended bucket. | Security Rule 164.312(a)(1) | Remove the fallback. Require `AWS_S3_BUCKET_NAME` to be set explicitly. Throw an error on startup if missing. |
| L-003 | `packages/api/src/routes/uploads.ts:24` | **500 MB file size limit for audio.** While necessary for session recordings, very large files increase the attack surface and storage costs. Server-side enforcement is absent. | Security Rule 164.312(a)(1) | Consider implementing server-side file size enforcement (S3 upload policies or Lambda@Edge validation) rather than relying solely on the client-side maxSize hint. |
| L-004 | `packages/api/src/routes/ai.ts:101` | **New Anthropic SDK client created per request.** Each AI endpoint creates a new Anthropic client instance. While not a compliance issue per se, connection reuse would reduce latency and the window during which the API key is in memory. | Security Rule 164.312(a)(1) | Create a singleton Anthropic client instance, initialized once. |

---

## Positive Findings (Things Done Right)

1. **HIPAA-safe logger** (`packages/api/src/lib/logger.ts`): The logger sanitizes errors, never logs full objects, and restricts stack traces to non-production. No `console.log/error/warn` calls found anywhere in services or routes outside the logger.

2. **No PHI in generic push notification copy** (`packages/api/src/services/notification-copy.ts`): Morning check-in, homework, session reminder, and weekly review notifications use hardcoded, PHI-free template messages. The diagnostic/escalation prompts are similarly generic.

3. **Push notification preference enforcement** (`packages/api/src/services/notifications.ts:42-48`): The system checks user notification preferences before sending, respecting patient autonomy.

4. **Rate limiting on notification delivery** (`packages/api/src/services/rtm-notifications.ts:85-96`): Client-facing RTM notifications are capped at 2 per day per user, preventing notification fatigue and over-disclosure.

5. **Auth and role gating on AI routes** (`packages/api/src/routes/ai.ts:10`): All AI endpoints require authentication and CLINICIAN role. Participants cannot access AI content generation.

6. **Auth gating on uploads** (`packages/api/src/routes/uploads.ts:8`): Upload endpoints require authentication.

7. **File type allowlisting** (`packages/api/src/routes/uploads.ts:12-18`): Uploads are restricted to specific MIME types per context, preventing arbitrary file upload.

8. **Presigned URLs for file access** (`packages/api/src/services/s3.ts`): The system uses time-limited presigned URLs rather than serving file bytes through the API, which is the correct pattern for S3 with HIPAA.

9. **Superbill ownership verification** (`packages/api/src/services/superbill.ts:77-78`): The superbill service verifies the requesting clinician owns the billing period before returning data.

10. **Email feature flag** (`packages/api/src/services/email.ts:15`): Email sending is gated behind `ENABLE_INVITE_EMAIL` env var, preventing accidental email transmission in development.

11. **Invite email is PHI-free** (`packages/api/src/services/email.ts:20-22`): The email template does not include patient names, diagnosis codes, or any health information. It contains only a generic invitation message and code.

---

## BAA Requirements Summary

| Third-Party Service | Data Transmitted | BAA Required | BAA Status |
|---------------------|-----------------|-------------|------------|
| **Anthropic (Claude API)** | Clinician content (may contain PHI), PDF documents | Yes | UNKNOWN -- Must verify |
| **Expo Push Notifications** | Notification titles/bodies (some contain patient first names and task titles) | Yes | UNKNOWN -- Must verify |
| **AWS S3** | Uploaded files (clinical documents, session recordings, PDFs) | Yes | UNKNOWN -- Must verify |
| **SendGrid** (future) | Email content with invite codes | Yes | Not yet integrated |
| **Railway** (hosting) | All PHI in database and API memory | Yes | UNKNOWN -- Must verify |
| **Apple APNs / Google FCM** | Push notification content (routed via Expo) | Covered by Expo BAA | N/A |

**Action Required:** Verify BAA status for all vendors listed above. If any BAA is not in place, PHI must not flow to that vendor until executed. This is the single highest-priority compliance task identified in this audit.

---

## Recommendations for Legal/Compliance Review

1. **Anthropic BAA**: Determine whether Anthropic offers a HIPAA-eligible API tier with BAA. If not, the AI features must either (a) be restricted to non-PHI content with technical controls, or (b) use a HIPAA-eligible LLM alternative.
2. **Expo Push BAA**: Verify Expo push notification service BAA coverage for notification content transiting their servers.
3. **Push notification content policy**: Establish a written policy that push notifications must never contain direct patient identifiers or clinical details. Implement technical controls to enforce this.
4. **Accounting of Disclosures**: AI API calls that transmit PHI may constitute disclosures requiring accounting under 164.528. Legal counsel should determine if this applies and what documentation is needed.
5. **S3 bucket policy review**: Have DevOps/Security verify S3 Block Public Access is enabled and bucket policies deny public reads.
6. **Data retention for pg-boss jobs**: Establish a retention policy for completed job payloads that contain user IDs and notification metadata.

---

Status: FINDINGS_READY
