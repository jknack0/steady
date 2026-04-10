-- ─────────────────────────────────────────────────────────────────────
-- Client Web Portal MVP — initial schema migration
-- Ref: docs/sdlc/client-web-portal-mvp/04-architecture.md AD-3
-- ─────────────────────────────────────────────────────────────────────
--
-- This migration:
--   1. Asserts legacy PatientInvitation table is empty (NFR-5.4 + COND-9)
--   2. Creates PortalInvitationStatus, EmailSuppressionReason enums
--   3. Creates portal_invitations, email_suppressions, rate_limits,
--      ses_circuit_breaker_state tables
--   4. Creates a partial unique index preventing duplicate PENDING/SENT
--      invitations per (clinician, email) — AC-1.5
--
-- This migration does NOT drop PatientInvitation yet. FR-12 deletes the
-- legacy system in a follow-up migration, AFTER code callers are updated,
-- so the two systems coexist briefly on the same branch.

-- ─────────────────────────────────────────────────────────────────────
-- Precondition gate (COND-9): legacy PatientInvitation must be empty in
-- any env where we plan to drop it. This migration only CREATES new
-- tables, so the check is a warning here — it BLOCKS in the drop
-- migration that ships with FR-12.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  legacy_count INT;
BEGIN
  SELECT COUNT(*) INTO legacy_count FROM "patient_invitations";
  IF legacy_count > 0 THEN
    RAISE NOTICE 'patient_invitations has % rows — drop migration will fail until cleared', legacy_count;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL; -- legacy table already dropped, fine
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────

CREATE TYPE "PortalInvitationStatus" AS ENUM (
  'PENDING',
  'SENT',
  'ACCEPTED',
  'BOUNCED',
  'COMPLAINED',
  'SEND_FAILED',
  'EXPIRED',
  'REVOKED'
);

CREATE TYPE "EmailSuppressionReason" AS ENUM (
  'BOUNCE',
  'COMPLAINT',
  'MANUAL'
);

-- ─────────────────────────────────────────────────────────────────────
-- portal_invitations
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE "portal_invitations" (
  "id"                 TEXT                      NOT NULL,
  "clinicianId"        TEXT                      NOT NULL,
  "clientId"           TEXT,
  "recipientEmail"     TEXT                      NOT NULL,
  "recipientEmailHash" TEXT                      NOT NULL,
  "tokenHash"          TEXT,
  "tokenBurnedAt"      TIMESTAMP(3),
  "status"             "PortalInvitationStatus"  NOT NULL DEFAULT 'PENDING',
  "existingUser"       BOOLEAN                   NOT NULL DEFAULT false,
  "firstName"          TEXT,
  "lastName"           TEXT,
  "expiresAt"          TIMESTAMP(3)              NOT NULL,
  "sendCount"          INTEGER                   NOT NULL DEFAULT 0,
  "lastSentAt"         TIMESTAMP(3),
  "acceptedAt"         TIMESTAMP(3),
  "acceptedByUserId"   TEXT,
  "revokedAt"          TIMESTAMP(3),
  "bounceType"         TEXT,
  "bouncedAt"          TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)              NOT NULL,
  "deletedAt"          TIMESTAMP(3),

  CONSTRAINT "portal_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "portal_invitations_tokenHash_key" ON "portal_invitations" ("tokenHash");
CREATE INDEX "portal_invitations_clinicianId_status_idx" ON "portal_invitations" ("clinicianId", "status");
CREATE INDEX "portal_invitations_recipientEmailHash_idx" ON "portal_invitations" ("recipientEmailHash");
CREATE INDEX "portal_invitations_status_expiresAt_idx" ON "portal_invitations" ("status", "expiresAt");

-- AC-1.4: one active invitation per (clinician, email) — partial unique.
-- Prisma can't express this natively; we write raw SQL.
CREATE UNIQUE INDEX "portal_invitations_active_unique_idx"
  ON "portal_invitations" ("clinicianId", "recipientEmailHash")
  WHERE "status" IN ('PENDING', 'SENT') AND "deletedAt" IS NULL;

ALTER TABLE "portal_invitations"
  ADD CONSTRAINT "portal_invitations_clinicianId_fkey"
  FOREIGN KEY ("clinicianId") REFERENCES "clinician_profiles" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "portal_invitations"
  ADD CONSTRAINT "portal_invitations_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "users" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "portal_invitations"
  ADD CONSTRAINT "portal_invitations_acceptedByUserId_fkey"
  FOREIGN KEY ("acceptedByUserId") REFERENCES "users" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- email_suppressions
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE "email_suppressions" (
  "id"         TEXT                      NOT NULL,
  "emailHash"  TEXT                      NOT NULL,
  "email"      TEXT                      NOT NULL,
  "reason"     "EmailSuppressionReason"  NOT NULL,
  "bounceType" TEXT,
  "createdAt"  TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"  TIMESTAMP(3),
  "deletedAt"  TIMESTAMP(3),

  CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_suppressions_emailHash_key" ON "email_suppressions" ("emailHash");
CREATE INDEX "email_suppressions_reason_idx" ON "email_suppressions" ("reason");

-- ─────────────────────────────────────────────────────────────────────
-- rate_limits
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE "rate_limits" (
  "id"          TEXT         NOT NULL,
  "bucket"      TEXT         NOT NULL,
  "identifier"  TEXT         NOT NULL,
  "count"       INTEGER      NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rate_limits_bucket_identifier_key"
  ON "rate_limits" ("bucket", "identifier");
CREATE INDEX "rate_limits_windowStart_idx" ON "rate_limits" ("windowStart");

-- ─────────────────────────────────────────────────────────────────────
-- ses_circuit_breaker_state (COND-23)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE "ses_circuit_breaker_state" (
  "id"              TEXT         NOT NULL DEFAULT 'singleton',
  "isOpen"          BOOLEAN      NOT NULL DEFAULT false,
  "openedAt"        TIMESTAMP(3),
  "openReason"      TEXT,
  "totalSent"       INTEGER      NOT NULL DEFAULT 0,
  "totalBounced"    INTEGER      NOT NULL DEFAULT 0,
  "totalComplained" INTEGER      NOT NULL DEFAULT 0,
  "windowStart"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ses_circuit_breaker_state_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ses_circuit_breaker_state" ("id", "updatedAt")
  VALUES ('singleton', CURRENT_TIMESTAMP)
  ON CONFLICT DO NOTHING;
