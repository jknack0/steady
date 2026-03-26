# HIPAA Code Audit: Infrastructure & Configuration

**Date:** 2026-03-25
**Scope:** Dockerfile, Docker Compose, entrypoint scripts, Railway config, Next.js config, mobile config, environment files, CI/CD
**Auditor:** Automated HIPAA compliance scan (technical guidance, not legal advice)

---

## Findings Summary
- **Critical:** 5
- **High:** 9
- **Medium:** 7
- **Low:** 4
- **Positive findings:** 12

## Critical Findings

| ID | File:Line | Issue |
|----|-----------|-------|
| C-001 | `middleware/auth.ts:20` | Hardcoded JWT fallback secret |
| C-002 | `routes/auth.ts:12-13` | Hardcoded REFRESH_SECRET fallback |
| C-003 | `app.ts:31-33` | CORS defaults to wildcard when CORS_ORIGINS unset |
| C-004 | `scripts/docker-entrypoint.sh:5` | `--accept-data-loss` flag on production database migrations |
| C-005 | `scripts/docker-entrypoint.sh:5` | Server starts even if migrations fail (`\|\| echo` overrides `set -e`) |

## High Findings

| ID | File:Line | Issue |
|----|-----------|-------|
| H-001 | `app.ts` | No security headers middleware (no helmet) |
| H-002 | `app.ts` | No rate limiting on any endpoints |
| H-003 | `Dockerfile.api:27-42` | Container runs as root |
| H-004 | `next.config.js` | No security headers in Next.js |
| H-005 | `app.ts:35` | No explicit request body size limit |
| H-006 | `app.ts` | No Cache-Control: no-store on API responses |
| H-007 | `docker-compose.yml:11` | Weak database password |
| H-008 | `apps/mobile/.env:1` | Production API URL committed to repository |
| H-009 | No file | No CI/CD pipeline (no automated security scanning) |

## Recommended Startup Validation

```typescript
function validateEnv() {
  const required = ['JWT_SECRET', 'REFRESH_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production') {
    const prodRequired = ['CORS_ORIGINS', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const prodMissing = prodRequired.filter(key => !process.env[key]);
    if (prodMissing.length > 0) {
      logger.error(`Missing required production environment variables: ${prodMissing.join(', ')}`);
      process.exit(1);
    }
  }
}
```

## Medium Findings

- M-001: No dependency vulnerability scanning
- M-002: No `trust proxy` configuration (req.ip shows proxy IP)
- M-003: No database connection encryption enforcement
- M-004: Health check exposes database status to unauthenticated users
- M-005: Placeholder secret values in .env files
- M-006: Duplicate .env in packages/db with no dedicated gitignore
- M-007: SPA rewrite sends all paths to index.html

## Low Findings

- L-001: Non-deterministic `npm install -g npm@latest` in Dockerfile
- L-002: 120-second health check timeout
- L-003: Node engine requirement includes EOL Node 18
- L-004: PostgreSQL port exposed on 0.0.0.0 in docker-compose

## Positive Findings

1. Multi-stage Docker build (source not in production image)
2. NODE_ENV=production set in runner stage
3. HIPAA-safe logger
4. Generic error handler in production
5. Environment-based secrets
6. Root .gitignore covers .env files
7. Prisma audit middleware with AsyncLocalStorage
8. Short JWT expiry (30 minutes)
9. bcryptjs for password hashing
10. Expo Secure Store for mobile tokens
11. Presigned S3 URLs
12. `exec` in entrypoint scripts for signal handling
