# HIPAA Code Audit: Database & Data Layer

**Date:** 2026-03-25
**Scope:** Prisma schema, seed data, audit middleware, database configuration, migrations
**Auditor:** Automated HIPAA compliance scan (technical guidance, not legal advice)

---

## Findings Summary
- **Critical:** 7
- **High:** 9
- **Medium:** 8
- **Low:** 4
- **Positive findings:** 10

## Critical Findings

| ID | File:Line | Issue |
|----|-----------|-------|
| C-001 | `schema.prisma:741` | NPI number, Tax ID, Subscriber ID stored in plaintext -- no field-level encryption |
| C-002 | `enrollments.ts:308` | Hard deletion of Enrollment records (destroys audit trail, violates 6-year retention) |
| C-003 | `modules.ts:177` | Hard deletion of Module records with CASCADE (destroys Parts, PartProgress, HomeworkInstances) |
| C-004 | `daily-trackers.ts:324` | Hard deletion of DailyTracker records with CASCADE (destroys health monitoring data) |
| C-005 | `calendar.ts:179` | Hard deletion of CalendarEvent records (destroys treatment scheduling PHI) |
| C-006 | `docker-compose.yml:10-11` | Hardcoded database credentials in version control |
| C-007 | `docker-compose.yml` | No SSL/TLS configured for database connections |

## High Findings

| ID | File:Line | Issue |
|----|-----------|-------|
| H-001 | `schema.prisma:199` | Password hash stored without field-level encryption |
| H-002 | `schema.prisma` | No data retention policy mechanism in schema |
| H-003 | `audit-middleware.ts:117` | Audit middleware does not log READ operations |
| H-004 | `schema.prisma:449-450` | Journal entries contain sensitive mental health data in plaintext |
| H-005 | `schema.prisma:389` | PartProgress.responseData stores clinical assessment responses in plaintext |
| H-006 | `seed.ts:10` | JWT_SECRET fallback to hardcoded value |
| H-007 | `seed.ts:54` | Extremely weak seed passwords with no production guard |
| H-008 | `schema.prisma:838-852` | AuditLog.userId is nullable -- weakens accountability |
| H-009 | `audit-middleware.ts:142` | Audit failure uses console.error instead of HIPAA-safe logger |

## Medium Findings

- M-001: No database-level row-level security (RLS)
- M-002: No composite index on AuditLog for common queries
- M-003: Insurance data stored without field-level encryption
- M-004: Standalone PrismaClient instances bypass audit middleware
- M-005: Session.clinicianNotes stored in plaintext
- M-006: No `deletedAt` on most models
- M-007: No backup encryption configuration
- M-008: extractResourceId uses `any` type

## Low Findings

- L-001: Practice model lacks specific audit trail for membership changes
- L-002: Push token stored on User model (indirect identifier)
- L-003: No audit_logs table partitioning plan
- L-004: Seed script outputs credentials to stdout

## Positive Findings

1. Audit middleware with AsyncLocalStorage pattern -- never logs PII values
2. Soft delete implemented for Parts
3. Audit log skips auditing itself (prevents recursion)
4. PII-safe logger exists
5. bcrypt with cost factor 12
6. Prisma singleton pattern
7. Environment-based DATABASE_URL
8. .env files gitignored
9. Comprehensive audit log indexes
10. Seed data uses fictional names only
