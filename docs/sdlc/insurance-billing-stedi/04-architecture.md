# Insurance Billing & Claims via Stedi — Technical Architecture

## Overview

This feature adds real-time insurance eligibility verification (270/271) and professional claim submission (837P) to Steady by integrating Stedi's clearinghouse JSON API. The architecture introduces four new database models (PatientInsurance, InsuranceClaim, ClaimStatusHistory, DiagnosisCode), a Stedi API client service, pg-boss workers for claim retries and status polling, and field-level AES-256 encryption for all insurance PHI. All Stedi communication is server-side only — the frontend never touches Stedi directly.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Web Frontend (Next.js)                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │Insurance │ │Eligibil. │ │Claims    │ │Practice Settings  │  │
│  │Tab       │ │Check     │ │Dashboard │ │(Stedi API Key)    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬──────────┘  │
└───────┼────────────┼────────────┼─────────────────┼─────────────┘
        │            │            │                 │
        ▼            ▼            ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Server (Express)                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │/api/     │ │/api/     │ │/api/     │ │/api/config/       │  │
│  │insurance │ │insurance/│ │claims    │ │stedi              │  │
│  │          │ │:id/elig. │ │          │ │                   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬──────────┘  │
│       │            │            │                 │              │
│       ▼            ▼            ▼                 ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Services Layer                                          │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────────┐  │   │
│  │  │patient-     │ │stedi-client │ │claim-service      │  │   │
│  │  │insurance    │ │(eligibility,│ │(create, submit,   │  │   │
│  │  │service      │ │claims, payer│ │status, resubmit)  │  │   │
│  │  │             │ │search)      │ │                   │  │   │
│  │  └─────────────┘ └──────┬──────┘ └────────┬──────────┘  │   │
│  └──────────────────────────┼────────────────┼──────────────┘   │
│                             │                │                   │
│  ┌──────────────────────────┼────────────────┼──────────────┐   │
│  │  pg-boss Queue           │                │              │   │
│  │  ┌───────────────────┐   │  ┌──────────────────────┐     │   │
│  │  │stedi-claim-submit │◄──┘  │stedi-status-poll     │     │   │
│  │  │(retry: 3x, exp.)  │     │(cron: every 2 hours)  │     │   │
│  │  └───────────────────┘     └──────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
        │                              │
        ▼                              ▼
┌───────────────┐              ┌───────────────┐
│  PostgreSQL   │              │  Stedi API    │
│  (encrypted   │              │  (HTTPS)      │
│   fields)     │              │               │
└───────────────┘              └───────────────┘
```

## Components

### Stedi Client Service
**Responsibility:** Single module that handles all HTTP communication with Stedi's API. Encapsulates authentication, request construction, response parsing, error handling, and timeout management. No other service talks to Stedi directly.
**Interface:**
- `checkEligibility(apiKey, request): Promise<EligibilityResult | StediError>`
- `submitClaim(apiKey, claim837P): Promise<SubmissionResult | StediError>`
- `checkClaimStatus(apiKey, stediTxnId): Promise<StatusResult | StediError>`
- `searchPayers(apiKey, query): Promise<PayerResult[]>`
- `testConnection(apiKey): Promise<boolean>`
**Dependencies:** node built-in `fetch`, logger, FIELD_ENCRYPTION_KEY (to decrypt API key before use)

### Patient Insurance Service
**Responsibility:** CRUD for patient insurance records. Handles one-primary-per-participant constraint. All writes go through encryption middleware automatically.
**Interface:**
- `getInsurance(ctx, participantId): Promise<PatientInsurance | null>`
- `upsertInsurance(ctx, participantId, data): Promise<PatientInsurance | { error }>`
- `removeInsurance(ctx, participantId): Promise<void | { error }>`
**Dependencies:** Prisma (with encryption middleware), ServiceCtx for ownership checks

### Claim Service
**Responsibility:** Claim lifecycle management — creation, submission (via pg-boss), status tracking, resubmission. Enforces the state machine. Constructs minimum-necessary 837P payloads.
**Interface:**
- `createAndSubmitClaim(ctx, appointmentId, diagnosisCodes): Promise<InsuranceClaim | { error }>`
- `listClaims(ctx, query): Promise<{ data, cursor }>`
- `getClaim(ctx, claimId): Promise<InsuranceClaim | { error }>`
- `resubmitClaim(ctx, claimId, updates): Promise<InsuranceClaim | { error }>`
- `refreshClaimStatus(ctx, claimId): Promise<InsuranceClaim | { error }>`
**Dependencies:** Prisma, Stedi client, pg-boss queue, ServiceCtx

### Diagnosis Code Service
**Responsibility:** Search ICD-10-CM codes. Seeded from CMS data. Returns recent codes per participant.
**Interface:**
- `searchDiagnosisCodes(query, limit): Promise<DiagnosisCode[]>`
- `getRecentForParticipant(ctx, participantId): Promise<DiagnosisCode[]>`
**Dependencies:** Prisma (full-text search on code + description)

### Stedi Config Service
**Responsibility:** Manage practice-level Stedi API key. Encrypt on save, decrypt on use. Support rotation.
**Interface:**
- `getStediKey(practiceId): Promise<string | null>` (decrypted)
- `setStediKey(ctx, apiKey): Promise<void>`
- `hasStediKey(practiceId): Promise<boolean>`
**Dependencies:** Prisma, crypto module (encryptField/decryptField from @steady/db)

## Data Model

### PatientInsurance (NEW)
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | @id @default(cuid()) | |
| participantId | String | @unique | One insurance per participant (v1) |
| payerId | String | | Stedi payer ID |
| payerName | String | | Display name (cached from Stedi) |
| subscriberId | String | | **Encrypted at rest** (AES-256) |
| groupNumber | String? | | **Encrypted at rest** (AES-256) |
| relationshipToSubscriber | Enum | SELF, SPOUSE, CHILD, OTHER | |
| policyHolderFirstName | String? | | **Encrypted at rest** — null if SELF |
| policyHolderLastName | String? | | **Encrypted at rest** — null if SELF |
| policyHolderDob | String? | | **Encrypted at rest** — stored as string, null if SELF |
| policyHolderGender | String? | | **Encrypted at rest** — null if SELF |
| isActive | Boolean | @default(true) | Soft-delete via false |
| cachedEligibility | Json? | | **Encrypted at rest** — last eligibility response (parsed, minimized) |
| eligibilityCheckedAt | DateTime? | | Timestamp of last check (24h cache window) |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

**Relations:** `participant ParticipantProfile`, `claims InsuranceClaim[]`

**Encrypted fields added to encryption middleware:** `subscriberId`, `groupNumber`, `policyHolderFirstName`, `policyHolderLastName`, `policyHolderDob`, `policyHolderGender`, `cachedEligibility`

### InsuranceClaim (NEW)
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | @id @default(cuid()) | |
| practiceId | String | | Scoping + index |
| clinicianId | String | | FK to ClinicianProfile |
| participantId | String | | FK to ParticipantProfile |
| appointmentId | String | | FK to Appointment (one claim per appointment) |
| patientInsuranceId | String | | FK to PatientInsurance |
| status | ClaimStatus | @default(DRAFT) | State machine enforced |
| stediTransactionId | String? | | Set after submission |
| stediIdempotencyKey | String | @default(cuid()) | For Stedi Idempotency-Key header |
| serviceCode | String | | CPT code (e.g., "90834") — denormalized for claim record |
| servicePriceCents | Int | | Charge amount in cents |
| placeOfServiceCode | String | | From ClinicianBillingProfile |
| dateOfService | DateTime | | From Appointment.startAt |
| diagnosisCodes | String[] | | ICD-10 codes (e.g., ["F90.0", "F41.1"]) |
| submittedAt | DateTime? | | When sent to Stedi |
| respondedAt | DateTime? | | When payer responded |
| rejectionReason | String? | | From payer response |
| retentionExpiresAt | DateTime? | | 7 years from dateOfService — for COND-9 |
| retryCount | Int | @default(0) | pg-boss retry tracking |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

**Relations:** `practice Practice`, `clinician ClinicianProfile`, `participant ParticipantProfile`, `appointment Appointment`, `patientInsurance PatientInsurance`, `statusHistory ClaimStatusHistory[]`

**Indexes:** `@@index([practiceId, status])`, `@@index([practiceId, clinicianId])`, `@@index([appointmentId])`, `@@unique([appointmentId])` (one claim per appointment)

### ClaimStatusHistory (NEW)
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | @id @default(cuid()) | |
| claimId | String | | FK to InsuranceClaim |
| fromStatus | ClaimStatus? | | null for initial creation |
| toStatus | ClaimStatus | | |
| changedBy | String | | User ID who triggered the change |
| reason | String? | | Rejection reason, resubmission note |
| createdAt | DateTime | @default(now()) | |

### DiagnosisCode (NEW)
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | @id @default(cuid()) | |
| code | String | @unique | ICD-10-CM code (e.g., "F90.0") |
| description | String | | Short description |
| category | String | | First letter (e.g., "F" for mental health) |
| isCommon | Boolean | @default(false) | Curated mental health codes flagged |
| createdAt | DateTime | @default(now()) | |

**Index:** `@@index([category, isCommon])` for prioritized search

### ClaimStatus (NEW ENUM)
```
DRAFT        — Created locally, not yet submitted
SUBMITTED    — Sent to Stedi, awaiting payer response
ACCEPTED     — Payer accepted the claim for processing
REJECTED     — Payer rejected (can resubmit after correction)
DENIED       — Payer denied (cannot resubmit same claim)
PAID         — Payer processed payment
```

### SubscriberRelationship (NEW ENUM)
```
SELF
SPOUSE
CHILD
OTHER
```

### Practice Model (MODIFIED)
| Field | Type | Notes |
|-------|------|-------|
| stediApiKey | String? | **Encrypted at rest** — practice-level Stedi API key |

Added to encryption middleware encrypted fields list.

### Appointment Model (MODIFIED)
| Field | Type | Notes |
|-------|------|-------|
| claim | InsuranceClaim? | New relation — one optional claim per appointment |

## API Design

### Patient Insurance

#### GET /api/insurance/:participantId
- **Auth:** CLINICIAN, ADMIN (must own participant via ClinicianClient)
- **Response:** `{ success: true, data: PatientInsurance | null }`
- **Errors:** 404 if participant not found or not owned

#### PUT /api/insurance/:participantId
- **Auth:** CLINICIAN, ADMIN (must own participant)
- **Request:** `{ payerId, payerName, subscriberId, groupNumber?, relationship, policyHolderFirstName?, policyHolderLastName?, policyHolderDob?, policyHolderGender? }`
- **Response:** `{ success: true, data: PatientInsurance }`
- **Errors:** 400 validation, 404 participant not found
- **Notes:** Upsert — creates or updates. Policy holder fields required when relationship != SELF.

#### DELETE /api/insurance/:participantId
- **Auth:** CLINICIAN, ADMIN (must own participant)
- **Response:** `{ success: true }`
- **Notes:** Soft-delete (sets isActive=false). Insurance data retained per COND-9.

### Eligibility

#### POST /api/insurance/:participantId/eligibility
- **Auth:** CLINICIAN, ADMIN (must own participant)
- **Request:** `{ serviceCode?: string }` (optional CPT code for service-specific check)
- **Response:** `{ success: true, data: { coverageActive, copayAmountCents, deductibleRemainingCents, coinsurancePercent, planDescription, checkedAt } }`
- **Errors:** 400 no insurance on file, 404 participant not found, 502 Stedi unavailable
- **Notes:** Returns cached result if < 24 hours old. Force refresh with `?refresh=true`.

### Payer Search

#### GET /api/payers?q=:query
- **Auth:** CLINICIAN, ADMIN
- **Response:** `{ success: true, data: [{ payerId, name }] }`
- **Errors:** 502 Stedi unavailable
- **Notes:** Proxied to Stedi payer search. Min 2 chars. Max 20 results.

### Claims

#### POST /api/claims
- **Auth:** CLINICIAN, ADMIN (must own appointment's participant)
- **Request:** `{ appointmentId, diagnosisCodes: string[] }`
- **Response:** `{ success: true, data: InsuranceClaim }`
- **Errors:** 400 validation (no insurance, appointment not ATTENDED, claim already exists), 404 appointment not found
- **Notes:** Creates claim as DRAFT, queues submission via pg-boss. Returns immediately with DRAFT status. Constructs minimum-necessary 837P payload (COND-3).

#### GET /api/claims
- **Auth:** CLINICIAN, ADMIN
- **Query:** `{ status?, cursor?, limit? }`
- **Response:** `{ success: true, data: InsuranceClaim[], cursor: string | null }`
- **Notes:** Scoped to clinician's patients via ClinicianClient (COND-4). Account owners see all practice claims.

#### GET /api/claims/:id
- **Auth:** CLINICIAN, ADMIN (must own claim's participant)
- **Response:** `{ success: true, data: InsuranceClaim & { statusHistory: ClaimStatusHistory[] } }`
- **Errors:** 404 claim not found or not owned

#### POST /api/claims/:id/refresh-status
- **Auth:** CLINICIAN, ADMIN (must own claim)
- **Response:** `{ success: true, data: InsuranceClaim }`
- **Errors:** 400 claim not in SUBMITTED status, 502 Stedi unavailable
- **Notes:** Calls Stedi claim status API, updates local status. Logs status change in history.

#### PUT /api/claims/:id/resubmit
- **Auth:** CLINICIAN, ADMIN (must own claim)
- **Request:** `{ diagnosisCodes?: string[], serviceCode?: string }`
- **Response:** `{ success: true, data: InsuranceClaim }`
- **Errors:** 400 claim not in REJECTED status, 404 not found
- **Notes:** Updates claim fields, resets to DRAFT, queues resubmission. New stediIdempotencyKey generated.

### Diagnosis Codes

#### GET /api/diagnosis-codes?q=:query
- **Auth:** CLINICIAN, ADMIN
- **Query:** `{ q: string, participantId?: string }`
- **Response:** `{ success: true, data: { recent: DiagnosisCode[], results: DiagnosisCode[] } }`
- **Notes:** Returns recent codes for participant (if participantId provided) + search results. Mental health codes (F-category) ranked first. Max 20 results.

### Stedi Configuration

#### GET /api/config/stedi
- **Auth:** CLINICIAN, ADMIN (practice member)
- **Response:** `{ success: true, data: { configured: boolean, keyLastFour?: string } }`
- **Notes:** Never returns the full key. Shows last 4 chars for identification.

#### PUT /api/config/stedi
- **Auth:** CLINICIAN, ADMIN (account owner only)
- **Request:** `{ apiKey: string }`
- **Response:** `{ success: true }`
- **Notes:** Encrypts key via encryptField() before storing on Practice model. Immediately effective (no cache — COND-10).

#### POST /api/config/stedi/test
- **Auth:** CLINICIAN, ADMIN (account owner only)
- **Request:** `{ apiKey: string }`
- **Response:** `{ success: true, data: { connected: boolean } }`
- **Notes:** Calls Stedi payer search with a known query to verify key validity. Does not persist the key.

## Data Flow

### Scenario 1: Add Patient Insurance
1. Clinician navigates to participant detail → Insurance tab
2. Frontend calls `GET /api/insurance/:participantId` → returns null (no insurance)
3. Clinician types in payer search → Frontend calls `GET /api/payers?q=aetna`
4. API proxies to Stedi payer search, returns matches
5. Clinician fills form, submits → Frontend calls `PUT /api/insurance/:participantId`
6. Service verifies clinician owns participant (ClinicianClient lookup)
7. Service creates PatientInsurance record — encryption middleware auto-encrypts subscriberId, groupNumber, policy holder fields
8. Audit middleware logs CREATE on PatientInsurance (field names only, no values)

### Scenario 2: Check Eligibility
1. Clinician clicks "Check Eligibility" on Insurance tab or appointment detail
2. Frontend calls `POST /api/insurance/:participantId/eligibility`
3. Service checks if cached eligibility exists and is < 24 hours old → return cached if so
4. Service decrypts Stedi API key from Practice model
5. Service decrypts patient insurance fields (subscriberId, etc.)
6. Service constructs minimum-necessary eligibility request (COND-3): subscriber ID, payer ID, provider NPI, service type code
7. Stedi client calls `POST /change/medicalnetwork/eligibility/v3` with 10s timeout
8. Service parses response, extracts only needed fields (COND-6): coverage status, copay, deductible, coinsurance, plan description
9. Service updates PatientInsurance.cachedEligibility (encrypted) and eligibilityCheckedAt
10. Audit middleware logs UPDATE on PatientInsurance
11. Returns parsed eligibility result to frontend

### Scenario 3: Submit Claim After Session
1. Clinician marks appointment as ATTENDED
2. Frontend checks if participant has insurance → shows "Submit Insurance Claim?" dialog
3. Clinician selects diagnosis codes (ICD-10 picker calls `GET /api/diagnosis-codes?q=...`)
4. Clinician clicks "Submit Claim" → Frontend calls `POST /api/claims`
5. Service verifies: appointment is ATTENDED, participant has active insurance, no existing claim for this appointment
6. Service creates InsuranceClaim with status=DRAFT in a transaction:
   - Sets diagnosisCodes, serviceCode, servicePriceCents, placeOfServiceCode, dateOfService
   - Sets retentionExpiresAt = dateOfService + 7 years (COND-9)
   - Creates ClaimStatusHistory entry (null → DRAFT)
7. Service queues `stedi-claim-submit` pg-boss job with claim ID
8. Returns DRAFT claim to frontend immediately
9. pg-boss worker picks up job:
   a. Decrypts Stedi API key and patient insurance data
   b. Constructs minimum-necessary 837P payload (COND-3):
      - Patient: name, DOB, gender, subscriber ID, payer ID
      - Provider: NPI, taxonomy code, tax ID, practice address
      - Service: CPT code, diagnosis codes, date of service, place of service, charge amount
   c. Calls Stedi `POST /change/medicalnetwork/professionalclaims/v3/submission` with Idempotency-Key header
   d. On success: updates claim status to SUBMITTED, stores stediTransactionId, creates history entry
   e. On Stedi error: increments retryCount. If retryCount < 3, pg-boss retries with exponential backoff. If retryCount >= 3, claim stays DRAFT with error logged.
10. Audit logs: claim creation (CREATE InsuranceClaim), status change (UPDATE InsuranceClaim)

### Scenario 4: Poll Claim Status (Cron)
1. pg-boss cron job `stedi-status-poll` runs every 2 hours
2. Worker queries all claims with status=SUBMITTED older than 1 hour
3. For each claim: decrypts API key, calls Stedi claim status API
4. Parses response (COND-6): extracts status, rejection reason, payment info
5. If status changed: updates InsuranceClaim, creates ClaimStatusHistory entry
6. Audit middleware logs UPDATE on InsuranceClaim

### Scenario 5: Resubmit Rejected Claim
1. Clinician views rejected claim detail → sees rejection reason
2. Clinician clicks "Edit & Resubmit" → modifies diagnosis codes or service code
3. Frontend calls `PUT /api/claims/:id/resubmit`
4. Service verifies claim status is REJECTED (COND-5 state machine)
5. Service updates claim fields, generates new stediIdempotencyKey, resets status to DRAFT
6. Service creates ClaimStatusHistory entry (REJECTED → DRAFT, with resubmission note)
7. Service queues `stedi-claim-submit` pg-boss job
8. Same submission flow as Scenario 3, step 9

## Claim State Machine (COND-5)

```
                    ┌──────────────────────────┐
                    │                          │
                    ▼                          │
    ┌───────┐    ┌───────────┐    ┌──────────┐│   ┌────────┐
    │ DRAFT │───►│ SUBMITTED │───►│ ACCEPTED │├──►│  PAID  │
    └───────┘    └───────────┘    └──────────┘│   └────────┘
        ▲              │                      │
        │              │          ┌──────────┐│
        │              └─────────►│ REJECTED │┘
        │                         └────┬─────┘
        │                              │
        └──────────────────────────────┘
                  (resubmit)

                               ┌────────┐
                    SUBMITTED─►│ DENIED │  (terminal, no resubmit)
                               └────────┘
```

**Valid transitions enforced at service layer:**

| From | To | Trigger |
|------|----|---------|
| DRAFT | SUBMITTED | pg-boss worker successfully sends to Stedi |
| SUBMITTED | ACCEPTED | Stedi status poll or manual refresh |
| SUBMITTED | REJECTED | Stedi status poll or manual refresh |
| SUBMITTED | DENIED | Stedi status poll or manual refresh |
| ACCEPTED | PAID | Stedi status poll or manual refresh |
| REJECTED | DRAFT | Clinician resubmits with corrections |

All other transitions throw `{ error: "invalid_transition" }` and are audit-logged.

## Compliance Controls

| Condition | Implementation |
|-----------|---------------|
| **COND-1: BAA with Stedi** | Deployment gate — not a code artifact. CI/CD or manual checklist before production deploy. |
| **COND-2: PHI encryption at rest (AES-256)** | Extend existing encryption middleware in `packages/db/src/encryption-middleware.ts`. Add PatientInsurance fields (subscriberId, groupNumber, policyHolder*) and Practice.stediApiKey to the encrypted fields map. Same AES-256-GCM + FIELD_ENCRYPTION_KEY pattern already used for ClinicianBillingProfile.npiNumber. cachedEligibility stored as encrypted JSON string. |
| **COND-3: Minimum Necessary payloads** | Stedi client service has explicit payload builder functions (`build837P`, `buildEligibilityRequest`) that construct payloads with only required fields. No pass-through of full records. Code review checklist item. |
| **COND-4: Claims scoped to clinician's patients** | All claim queries filter by `clinicianId` (from ServiceCtx) unless `isAccountOwner`. List, detail, and edit endpoints verify ownership via ClinicianClient join. Same pattern as existing invoice scoping in billing.ts. |
| **COND-5: Claim state machine** | `VALID_TRANSITIONS` map in claim service. Every status change goes through `transitionClaimStatus()` which validates, updates, creates ClaimStatusHistory, and audit-logs. Invalid transitions throw. |
| **COND-6: Response data minimization** | Stedi client response parsers extract only needed fields into typed interfaces. Raw responses are never stored. Eligibility cache stores parsed subset only. |
| **COND-7: Audit logging coverage** | Prisma audit middleware automatically covers all InsuranceClaim and PatientInsurance CRUD. Additionally, explicit audit log calls for Stedi API interactions (eligibility checks, claim submissions) that don't result in DB mutations — logged via `prisma.$executeRawUnsafe` INSERT into audit_logs. |
| **COND-8: Privacy notice update** | Deployment gate — legal/content task. Not a code artifact. |
| **COND-9: Data retention policy** | `retentionExpiresAt` field on InsuranceClaim set to dateOfService + 7 years at creation. Future cron job can query expired claims for anonymization. PatientInsurance uses soft-delete (isActive=false) — never hard-deleted. |
| **COND-10: API key rotation** | Practice.stediApiKey is read fresh from DB on every Stedi call (no in-memory cache). `getStediKey()` always queries DB → decrypts → returns. Updating the key via PUT /api/config/stedi takes effect immediately. |

## Technology Choices

| Decision | Choice | Rationale | Alternatives Considered |
|----------|--------|-----------|------------------------|
| HTTP client for Stedi | Node built-in `fetch` | Zero dependencies, async/await native, sufficient for JSON API calls. Already available in Node 20+. | axios (unnecessary dependency), got (same) |
| Encryption | Existing AES-256-GCM via `@steady/db` crypto module | Already proven in codebase for ClinicianBillingProfile. Same FIELD_ENCRYPTION_KEY. No new dependencies. | Separate KMS (overkill for current scale), pg_crypto (DB-level, doesn't meet app-level encryption requirement) |
| Claim retry queue | Existing pg-boss | Already used for notifications, invoice overdue checks. Battle-tested in this codebase. Supports retryLimit, retryDelay, exponential backoff, cron scheduling. | BullMQ (requires Redis, not in stack), custom retry loop (fragile) |
| ICD-10 search | PostgreSQL ILIKE + trigram index | ~500 curated mental health codes (not full 70k). ILIKE with GIN trigram index gives <50ms search. No need for full-text search engine. | Elasticsearch (overkill), full ICD-10 table (unnecessary — curate mental health subset + allow manual entry) |
| Eligibility cache | Database field on PatientInsurance | Simple, encrypted, consistent with existing patterns. 24h TTL checked via eligibilityCheckedAt timestamp comparison. | Redis (not in stack), separate cache table (unnecessary indirection) |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stedi API downtime during claim submission | Medium — claim not submitted | pg-boss retry with exponential backoff (3 attempts over ~15 minutes). Claim stays as DRAFT if all retries fail. Clinician sees clear status. |
| Stedi API response format changes | Medium — parsing failures | Typed response interfaces with strict parsing. Log parse errors with Stedi transaction ID for debugging. Don't store raw responses. |
| High payer rejection rates | Medium — clinician frustration | Pre-validate claim data before submission (required fields, valid CPT/ICD-10 codes, valid NPI format). Show clear rejection reasons with correction guidance. |
| Encryption key rotation | Low — requires coordination | FIELD_ENCRYPTION_KEY rotation requires re-encrypting all encrypted fields. Document the rotation procedure. Not in scope for v1 but encryption prefix ("enc:") supports gradual migration. |
| ICD-10 code set updates | Low — annual CMS release | Seed script is idempotent (upsert on code). Run annually when CMS releases updates. |
| Claim status polling lag | Low — 2 hour max delay | Clinicians can manually refresh individual claim status. Cron interval is configurable. |

## File Structure

### New Files

```
packages/db/prisma/schema.prisma                    # Add 4 new models + 2 enums
packages/db/prisma/seed-diagnosis-codes.ts           # ICD-10 mental health code seeder (~500 codes)
packages/db/src/encryption-middleware.ts              # Add new encrypted fields

packages/shared/src/schemas/insurance.ts             # Zod schemas for insurance CRUD
packages/shared/src/schemas/claim.ts                 # Zod schemas for claim CRUD + status
packages/shared/src/schemas/diagnosis-code.ts        # Zod schema for diagnosis code search
packages/shared/src/schemas/index.ts                 # Add new exports

packages/api/src/services/stedi-client.ts            # Stedi API HTTP client
packages/api/src/services/patient-insurance.ts       # Patient insurance CRUD service
packages/api/src/services/claims.ts                  # Claim lifecycle service
packages/api/src/services/diagnosis-codes.ts         # ICD-10 search + recent codes
packages/api/src/services/stedi-config.ts            # Practice Stedi key management
packages/api/src/routes/insurance.ts                 # Insurance + eligibility routes
packages/api/src/routes/claims.ts                    # Claim routes
packages/api/src/routes/diagnosis-codes.ts           # Diagnosis code search route
packages/api/src/routes/payers.ts                    # Payer search proxy route
packages/api/src/app.ts                              # Register new routes
packages/api/src/services/queue.ts                   # Register new pg-boss workers

packages/api/src/__tests__/insurance.test.ts         # Insurance CRUD tests
packages/api/src/__tests__/claims.test.ts            # Claim lifecycle tests
packages/api/src/__tests__/eligibility.test.ts       # Eligibility check tests
packages/api/src/__tests__/diagnosis-codes.test.ts   # ICD-10 search tests
packages/api/src/__tests__/stedi-client.test.ts      # Stedi client tests (mocked HTTP)
packages/shared/src/__tests__/insurance.schema.test.ts
packages/shared/src/__tests__/claim.schema.test.ts

apps/web/src/hooks/use-insurance.ts                  # Insurance CRUD hooks
apps/web/src/hooks/use-claims.ts                     # Claims hooks
apps/web/src/hooks/use-diagnosis-codes.ts            # ICD-10 search hook
apps/web/src/hooks/use-payers.ts                     # Payer search hook
apps/web/src/components/insurance/InsuranceTab.tsx    # Insurance tab on participant detail
apps/web/src/components/insurance/InsuranceForm.tsx   # Add/edit insurance form
apps/web/src/components/insurance/EligibilityCard.tsx # Eligibility result display
apps/web/src/components/insurance/PayerSearch.tsx     # Payer search dropdown
apps/web/src/components/claims/ClaimDialog.tsx        # Submit claim dialog
apps/web/src/components/claims/ClaimDetail.tsx        # Claim detail view
apps/web/src/components/claims/DiagnosisCodePicker.tsx # ICD-10 autocomplete
apps/web/src/components/claims/ClaimStatusBadge.tsx   # Status badge component
apps/web/src/app/(dashboard)/claims/page.tsx          # Claims dashboard page
apps/web/src/app/(dashboard)/layout.tsx               # Add Claims to sidebar nav
```

### Modified Files

```
packages/db/prisma/schema.prisma                     # 4 new models, 2 new enums, Practice.stediApiKey
packages/db/src/encryption-middleware.ts              # Add PatientInsurance + Practice encrypted fields
packages/api/src/app.ts                              # Mount new route modules
packages/api/src/services/queue.ts                   # Register stedi-claim-submit + stedi-status-poll workers
packages/shared/src/schemas/index.ts                 # Export new schemas
apps/web/src/app/(dashboard)/layout.tsx              # Add "Claims" nav item
apps/web/src/app/(dashboard)/participants/[id]/page.tsx  # Add Insurance tab
```
