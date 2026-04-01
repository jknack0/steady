# HIPAA Database and Data Layer Audit -- Steady with ADHD

**Date:** 2026-03-31
**Auditor:** Claude Code (technical guidance -- not legal advice)
**Scope:** Prisma schema, audit middleware, encryption middleware, crypto module, DB client singleton, seed data, migration scripts, database connection configuration, Docker/Railway infrastructure
**Prior Audit:** baseline-posture-audit-2026-03-28.md (this report supersedes its database sections with deeper analysis)

> **Disclaimer:** This is technical guidance for engineering teams. Final compliance decisions must involve qualified legal counsel and a designated Privacy Officer.

---

## Executive Summary

The data layer has solid foundations: AES-256-GCM field-level encryption, automatic audit logging via Prisma middleware, and a singleton client pattern that prevents connection sprawl. However, there are significant gaps in encryption coverage for high-sensitivity PHI fields (clinical notes, journal content, assessment responses), hard-delete cascades that conflict with HIPAA retention requirements, absence of READ audit logging, and database credentials stored in plaintext env files with no SSL enforcement. Five critical findings require immediate attention.

---

## 1. Findings

### CRITICAL Findings

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| C-001 | packages/db/src/encryption-middleware.ts:8 | **Clinical notes not encrypted at field level.** Session.clinicianNotes and Session.participantSummary contain psychotherapy notes -- the highest-sensitivity PHI category under HIPAA. The ENCRYPTED_FIELDS map covers only RtmEnrollment, ClinicianBillingProfile, and PatientInvitation, omitting all clinical content. | Security Rule 164.312(a)(2)(iv) -- Encryption and decryption | Add to ENCRYPTED_FIELDS: Session: ["clinicianNotes", "participantSummary"]. For JSON fields (JournalEntry.responses, PartProgress.responseData, etc.), serialize to string before encryption or implement a JSON-aware encrypt/decrypt wrapper. |
| C-002 | packages/db/src/encryption-middleware.ts:8 | **Patient health data in JSON columns not encrypted.** JournalEntry.freeformContent, JournalEntry.responses, PartProgress.responseData, HomeworkInstance.response, DailyTrackerEntry.responses all store patient health data (mood tracking, assessment answers, symptom logs) in plaintext. | Security Rule 164.312(a)(2)(iv) | Extend ENCRYPTED_FIELDS to cover these models. JSON fields require JSON.stringify() before encryption and JSON.parse() after decryption -- modify the middleware to detect JSON columns and handle serialization. |
| C-003 | packages/db/prisma/schema.prisma:305,328,392,506-510,533-537,558,572 | **Hard-delete cascades destroy PHI records irrecoverably.** 14 onDelete: Cascade relationships will permanently delete clinical data (PartProgress, HomeworkInstance, DailyTracker, DailyTrackerEntry, DailyTrackerField, RtmBillingPeriod, RtmClinicianTimeLog) when parent records are deleted. HIPAA requires 6-year minimum retention for medical records (45 CFR 164.530(j)). RTM billing records may require even longer retention for insurance audit purposes. | Privacy Rule 164.530(j) -- Retention | Replace onDelete: Cascade with soft deletes using deletedAt DateTime? fields on all PHI-bearing models. Currently only Module and Part have deletedAt. Add deletedAt to: Enrollment, Session, PartProgress, HomeworkInstance, DailyTracker, DailyTrackerEntry, JournalEntry, RtmEnrollment, RtmBillingPeriod, RtmClinicianTimeLog. Implement a Prisma middleware or global filter to exclude soft-deleted records from queries. |
| C-004 | packages/db/src/audit-middleware.ts:117 | **READ operations not audited.** The middleware explicitly skips all non-mutation actions (findMany, findFirst, findUnique, etc.). HIPAA requires logging who accessed what PHI and when. A breach investigation cannot determine exposure scope without read logs. | Security Rule 164.312(b) -- Audit controls | Implement READ audit logging for PHI-bearing models. This is performance-sensitive -- consider: (a) logging only at the API route level instead of Prisma middleware, (b) logging only for high-sensitivity models (Session, JournalEntry, PartProgress), (c) using a dedicated audit log table or external audit service to avoid write amplification on every read. |
| C-005 | scripts/docker-entrypoint.sh:5 | **--accept-data-loss flag in production database migration.** prisma db push --accept-data-loss will silently drop columns/tables that no longer exist in the schema. In production, this could destroy PHI without any backup, audit trail, or confirmation. | Security Rule 164.312(c)(1) -- Integrity; Privacy Rule 164.530(j) -- Retention | Remove --accept-data-loss flag. Use prisma migrate deploy for production, which applies versioned migrations that can be reviewed and rolled back. Reserve db push for development only. Implement a pre-migration backup step in the entrypoint script. |

### HIGH Findings

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| H-001 | packages/db/.env.dev:1, packages/db/.env.prod:1 | **Database credentials in plaintext env files on developer workstations.** Although .gitignore excludes .env files (confirmed not tracked), the production Railway credentials are stored in plaintext on disk. Any workstation compromise exposes the production database. | Security Rule 164.312(a)(1) -- Access control | (1) Use Railway CLI environment variables or a secrets manager (AWS Secrets Manager, Vault) instead of local .env.prod files. (2) Rotate the production database password immediately since it has been stored in plaintext. (3) Restrict production database access to deployment infrastructure only -- developers should never connect directly to production. (4) Delete .env.prod from developer machines. |
| H-002 | packages/db/.env.dev:1, packages/db/.env.prod:1 | **No SSL enforcement in database connection strings.** Neither the dev nor prod DATABASE_URL values include ?sslmode=require or ?sslmode=verify-full. Railway PostgreSQL supports SSL, but without explicit enforcement the connection may fall back to unencrypted, transmitting PHI in plaintext over the network. | Security Rule 164.312(e)(1) -- Transmission security | Append ?sslmode=require (minimum) or ?sslmode=verify-full (recommended) to all non-localhost DATABASE_URL values. For Prisma, this can also be set via the datasource block or connection string parameters. |
| H-003 | packages/db/src/encryption-middleware.ts:8 | **User.email and User.firstName/lastName not encrypted.** Email addresses and names are direct patient identifiers stored in plaintext. Combined with any health data, they constitute PHI. While less sensitive than clinical notes, a database breach would immediately expose patient identities. | Security Rule 164.312(a)(2)(iv) | Add User: ["email", "firstName", "lastName"] to ENCRYPTED_FIELDS. Warning: Encrypting email breaks the @unique constraint and findUnique queries by email. Implement an emailHash column (SHA-256 of lowercased email) for lookups, store encrypted email for display. This is a significant architectural change -- plan carefully. |
| H-004 | packages/db/src/encryption-middleware.ts:8 | **RtmEnrollment.diagnosisCodes not encrypted.** diagnosisCodes contains ICD-10 codes which directly identify patient conditions. subscriberId and groupNumber are encrypted but diagnosisCodes is not. Also consider payerName (insurance company name linked to a patient). | Security Rule 164.312(a)(2)(iv) | Add diagnosisCodes to RtmEnrollment encrypted fields. Since it is a JSON column, serialize to string before encryption. Also consider RtmEnrollment.payerName. |
| H-005 | packages/db/src/crypto.ts:17-24 | **Dev encryption key is deterministic and shared across all developer machines.** The fallback key uses scryptSync with hardcoded salt and passphrase -- every developer and CI environment shares the same key. If dev/staging databases contain real PHI (even accidentally), the data is effectively unencrypted since the key derivation inputs are in source code. | Security Rule 164.312(a)(2)(iv) | (1) Require FIELD_ENCRYPTION_KEY in all environments, not just production. (2) Generate unique keys for dev and staging. (3) Add a startup warning if the deterministic fallback is used. (4) Document that real patient data must never be loaded into dev/staging databases. |
| H-006 | packages/db/src/audit-middleware.ts:140-142 | **Audit log write failure uses console.error instead of the HIPAA-safe logger.** The error object from a failed audit write could contain database query details, connection strings, or Prisma internal state. Using raw console.error bypasses the PII-stripping logger documented in CLAUDE.md. | Security Rule 164.312(b) -- Audit controls | Replace console.error with the HIPAA-safe logger. Note: this creates a dependency from the db package on the API package -- consider moving the logger to packages/shared or extracting a minimal safe-logging utility into the db package. |
| H-007 | packages/db/src/crypto.ts | **No key rotation mechanism.** There is no support for decrypting with a previous key and re-encrypting with a new key. If the encryption key is compromised, all encrypted data must be manually migrated, and there is no documented procedure for this. | Security Rule 164.312(a)(2)(iv) | Implement key rotation: (1) Support a FIELD_ENCRYPTION_KEY_PREVIOUS env var. (2) On read, if decryption with the current key fails, try the previous key. (3) Provide a migration script that re-encrypts all records with the new key. (4) Document key rotation procedure and schedule (recommend annual rotation minimum). |

### MEDIUM Findings

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| M-001 | packages/db/prisma/schema.prisma:882-896 | **Audit log table lacks IP address, user agent, and session ID columns.** The AuditLog model captures userId, action, resourceType, resourceId, metadata, and timestamp but not the request context needed for breach forensics. | Security Rule 164.312(b) | Add columns: ipAddress String?, userAgent String?, sessionId String?. Populate from the request context in the audit middleware (requires passing request metadata through AsyncLocalStorage alongside userId). |
| M-002 | packages/db/src/audit-middleware.ts:40-48 | **Dead code: ACTION_MAP variable with incorrect mapping.** Line 43 maps update to CREATE instead of UPDATE. While the correct PRISMA_TO_AUDIT map is used (line 51), the dead variable is confusing and suggests an incomplete fix. | Code quality | Delete lines 40-48 (the ACTION_MAP constant). It is unused -- only PRISMA_TO_AUDIT is referenced at line 115. |
| M-003 | packages/db/prisma/schema.prisma | **No documented data retention policy in the schema or codebase.** HIPAA requires documented retention periods (minimum 6 years for most records). There is no automated retention/purge mechanism and no documentation of how long data is kept. | Privacy Rule 164.530(j) | (1) Document retention periods for each PHI category. (2) Implement a scheduled job (via pg-boss) that archives or purges records past retention. (3) For audit logs, retain for minimum 6 years. (4) Add retention metadata comments to the Prisma schema. |
| M-004 | packages/db/prisma/seed.ts:9 | **Seed file uses hardcoded JWT secret fallback.** The seed uses process.env.JWT_SECRET with a well-known fallback string -- while this is only in the seed file, it establishes a pattern of insecure secret fallbacks. | Security Rule 164.312(d) -- Person or entity authentication | Remove the fallback. Require JWT_SECRET to be set. Add a guard that throws if the env var is missing. |
| M-005 | packages/db/prisma/seed.ts:58-59,114,136 | **Weak seed passwords.** Passwords like Admin1, Test1, Jo1, Jim1 are trivially guessable. If the seed is run against a shared dev/staging environment, these accounts are immediately compromisable. | Security Rule 164.312(d) | Use randomly generated passwords in the seed script. Log them to the console for developer use but do not hardcode predictable values. Alternatively, gate the seed script to only run when NODE_ENV is development and against localhost databases. |
| M-006 | packages/db/prisma/schema.prisma | **No database-level row-level security (RLS).** All access control is enforced at the application layer. If any code path misses an ownership check, a clinician could access another clinician patient data. PostgreSQL RLS would provide defense-in-depth. | Security Rule 164.312(a)(1) -- Access control | Evaluate PostgreSQL RLS policies as a defense-in-depth measure. At minimum, document the decision not to use RLS and the compensating controls (application-level ownership checks, code review requirements). |
| M-007 | packages/db/src/audit-middleware.ts:79 | **Bulk operations log resourceId as "bulk".** updateMany and deleteMany operations that affect PHI records log only a count, not which specific records were affected. This makes breach investigation harder for bulk operations. | Security Rule 164.312(b) | For bulk mutations on PHI models, log the where clause filter keys (not values) and the count. Consider logging affected IDs by pre-querying before the bulk operation (only for PHI models, to limit performance impact). |

### LOW Findings

| ID | File:Line | Issue | HIPAA Rule | Remediation |
|----|-----------|-------|------------|-------------|
| L-001 | packages/db/prisma/schema.prisma:199 | **User.email has no max-length constraint at the database level.** Prisma String maps to text in PostgreSQL (unbounded). While Zod schemas enforce length limits at the API layer, a direct database insert could store arbitrarily long values. | Defense in depth | Add @db.VarChar(320) to email fields (320 is the RFC 5321 maximum). Apply similar constraints to other identifier fields. |
| L-002 | docker-compose.yml:12 | **Local dev database uses a trivial password.** POSTGRES_PASSWORD: steady_password is acceptable for local dev but should be documented as dev-only. | Best practice | Add a comment in docker-compose.yml noting this is for local development only. |
| L-003 | packages/db/prisma/schema.prisma:898-914 | **RefreshToken stores token value in plaintext.** The token field stores the raw refresh token. If the database is compromised, all active refresh tokens are exposed, allowing session hijacking. | Security Rule 164.312(d) | Store a SHA-256 hash of the refresh token instead of the plaintext value. Compare hashes on token refresh. This is a non-trivial migration but eliminates token theft from DB compromise. |
| L-004 | packages/db/prisma/migrations/create-default-configs.ts:39 | **Migration script uses console.log for output.** Not a PHI risk (only logs clinician IDs), but inconsistent with the project logging standards. | Code quality | Replace with the HIPAA-safe logger or document that migration scripts are exempt from logger requirements since they run offline. |

---

## 2. Positive Findings

These aspects of the data layer are well-implemented from a HIPAA perspective:

| Area | Detail |
|------|--------|
| **AES-256-GCM encryption** | packages/db/src/crypto.ts uses NIST-approved authenticated encryption with random 12-byte IVs per operation. The enc: prefix supports gradual migration from plaintext. |
| **Transparent encryption middleware** | packages/db/src/encryption-middleware.ts handles encrypt-on-write and decrypt-on-read automatically via Prisma middleware, reducing the risk of developer error. |
| **Production key enforcement** | crypto.ts:18-19 throws a hard error if FIELD_ENCRYPTION_KEY is missing in production. |
| **Singleton Prisma client** | packages/db/src/index.ts prevents connection pool exhaustion with a global singleton pattern. Dev-mode caching prevents hot-reload leaks. |
| **Middleware ordering** | Encryption middleware registers before audit middleware (lines 14-16 of index.ts), so audit logs never contain encrypted field values in metadata (they log field names only). |
| **Audit log exclusion** | SKIP_MODELS set prevents recursive audit logging of the AuditLog model itself. |
| **Field-name-only metadata** | buildMetadata() in the audit middleware logs only changed field names, never field values -- preventing PHI from leaking into audit records. |
| **Fire-and-forget audit writes** | Audit logging is non-blocking and failure-tolerant -- a failed audit write does not break the application. |
| **Patient invitation PII encryption** | PatientInvitation.patientName and patientEmail are in the encrypted fields map, with a patientEmailHash column for lookups. |
| **Billing data encryption** | ClinicianBillingProfile.npiNumber, taxId, and licenseNumber are encrypted at the field level. |
| **Soft delete on content models** | Module.deletedAt and Part.deletedAt fields exist, indicating awareness of soft-delete requirements (though not yet applied to all PHI models). |
| **Env files excluded from git** | .gitignore correctly excludes all .env files. Verified via git ls-files that no env files are tracked. |
| **Multi-stage Docker build** | Dockerfile.api uses multi-stage builds, preventing source code and build tools from reaching the production image. |
| **Insurance identifiers encrypted** | RtmEnrollment.subscriberId and groupNumber are in the encrypted fields map. |

---

## 3. PHI Field Encryption Coverage Matrix

| Model | Field | PHI Type | Encrypted | Priority |
|-------|-------|----------|-----------|----------|
| User | email | Direct identifier | No | HIGH |
| User | firstName | Direct identifier | No | HIGH |
| User | lastName | Direct identifier | No | HIGH |
| Session | clinicianNotes | Psychotherapy notes | No | **CRITICAL** |
| Session | participantSummary | Clinical content | No | **CRITICAL** |
| JournalEntry | freeformContent | Mental health narrative | No | **CRITICAL** |
| JournalEntry | responses (JSON) | Structured health data | No | **CRITICAL** |
| PartProgress | responseData (JSON) | Assessment/intake responses | No | **CRITICAL** |
| HomeworkInstance | response (JSON) | Health-related responses | No | HIGH |
| HomeworkInstance | content (JSON) | Assignment content | No | MEDIUM |
| DailyTrackerEntry | responses (JSON) | Symptom/mood tracking | No | HIGH |
| RtmEnrollment | diagnosisCodes (JSON) | ICD-10 codes | No | **CRITICAL** |
| RtmEnrollment | payerName | Insurance identifier | No | HIGH |
| RtmEnrollment | subscriberId | Insurance identifier | **Yes** | -- |
| RtmEnrollment | groupNumber | Insurance identifier | **Yes** | -- |
| RtmEnrollment | consentDocumentUrl | Consent document link | No | MEDIUM |
| RtmBillingPeriod | notes | Billing notes | No | MEDIUM |
| ClinicianBillingProfile | npiNumber | Provider PII | **Yes** | -- |
| ClinicianBillingProfile | taxId | Provider PII | **Yes** | -- |
| ClinicianBillingProfile | licenseNumber | Provider PII | **Yes** | -- |
| ClinicianBillingProfile | practiceAddress | Provider PII | No | MEDIUM |
| ClinicianBillingProfile | practicePhone | Provider PII | No | MEDIUM |
| ClinicianBillingProfile | providerName | Provider PII | No | MEDIUM |
| PatientInvitation | patientName | Direct identifier | **Yes** | -- |
| PatientInvitation | patientEmail | Direct identifier | **Yes** | -- |
| ClinicianClient | notes | Clinical relationship notes | No | MEDIUM |
| ClientConfig | activeMedications (JSON) | Medication data | No | HIGH |
| RefreshToken | token | Authentication secret | No | LOW |

---

## 4. Cascade Delete Risk Map

These onDelete: Cascade chains can permanently destroy PHI:

**Program (deleted)**
- Module (CASCADE)
  - Part (CASCADE)
    - PartProgress (CASCADE) -- PHI: assessment responses
    - HomeworkInstance (CASCADE) -- PHI: homework responses
  - JournalEntry (relation only, no cascade -- safe)
- DailyTracker (CASCADE)
  - DailyTrackerField (CASCADE)
  - DailyTrackerEntry (CASCADE) -- PHI: symptom/mood data
- Enrollment (no cascade -- safe)

**Enrollment (deleted)**
- HomeworkInstance (CASCADE) -- PHI: homework responses
- DailyTracker (CASCADE) -- PHI: symptom/mood data

**RtmEnrollment (deleted)**
- RtmBillingPeriod (CASCADE) -- PHI: billing records
  - RtmClinicianTimeLog (CASCADE) -- PHI: clinical time records

**User (deleted)**
- RefreshToken (CASCADE) -- Auth tokens

**Impact:** Deleting a single Program can irrecoverably destroy assessment responses, homework submissions, and daily symptom tracking data across all participants enrolled in that program.

---

## 5. Recommended Remediation Priority

### Immediate (this sprint)
1. **C-005**: Remove --accept-data-loss from production entrypoint
2. **H-001**: Remove .env.prod from developer machines, rotate production DB password
3. **H-002**: Add sslmode=require to all non-localhost connection strings
4. **H-006**: Replace console.error with safe logger in audit middleware

### Short-term (next 2 sprints)
5. **C-001**: Encrypt Session.clinicianNotes and Session.participantSummary
6. **C-002**: Encrypt JSON health data fields (JournalEntry, PartProgress, DailyTrackerEntry, HomeworkInstance)
7. **H-004**: Encrypt RtmEnrollment.diagnosisCodes
8. **H-005**: Require FIELD_ENCRYPTION_KEY in all environments
9. **H-007**: Implement encryption key rotation support
10. **M-002**: Remove dead ACTION_MAP code

### Medium-term (next quarter)
11. **C-003**: Implement soft deletes for all PHI-bearing models, replace cascades
12. **C-004**: Implement READ audit logging for PHI models
13. **H-003**: Encrypt User.email/name (requires emailHash architecture change)
14. **M-001**: Add IP address and user agent to audit log
15. **M-003**: Document and implement data retention policy
16. **M-005**: Strengthen seed script security

### Backlog
17. **M-004**: Remove JWT secret fallback from seed
18. **M-006**: Evaluate PostgreSQL RLS
19. **M-007**: Improve bulk operation audit granularity
20. **L-001 through L-004**: Database-level constraints, dev password documentation, refresh token hashing, migration script logging

---

## 6. Items Requiring Legal/Privacy Officer Review

1. **Data retention periods**: Legal counsel must define retention periods for each PHI category (clinical notes, assessment data, billing records, audit logs). The 6-year HIPAA minimum is a floor, not a ceiling -- state laws may require longer retention.
2. **Cascade delete legality**: Confirm whether the current hard-delete behavior for programs/enrollments violates state medical record retention laws.
3. **Developer access to production data**: The existence of .env.prod on developer machines suggests developers may have direct production database access. Privacy Officer should evaluate and restrict.
4. **Encryption scope**: Privacy Officer should confirm which fields require field-level encryption vs. relying on database-level encryption at rest (if enabled on Railway PostgreSQL).
5. **Backup encryption**: Confirm Railway PostgreSQL backup encryption status and key management.
6. **De-identification standard**: If any data leaves the production boundary (analytics, debugging), confirm which HIPAA de-identification standard applies (Safe Harbor vs. Expert Determination).

---

**Status: FINDINGS_READY**
