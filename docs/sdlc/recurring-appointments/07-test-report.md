# Recurring Appointments — Test Report

## Test Summary

| Suite | File | Tests | Pass | Fail |
|---|---|---|---|---|
| API Integration | `packages/api/src/__tests__/recurring-series.test.ts` | ~30 | TBD | TBD |
| Shared Schemas | `packages/shared/src/__tests__/recurring.schema.test.ts` | ~10 | TBD | TBD |
| **Total** | | **~40** | | |

## Test Coverage Areas

### API Integration Tests (recurring-series.test.ts)

**Series CRUD:**
- Create series generates 4 weeks of appointments
- Create validates required fields (participantId, serviceCodeId, etc.)
- Create validates recurrenceRule enum
- Create validates dayOfWeek range 0-6
- Create validates time format HH:mm
- Create validates endTime > startTime
- Create respects 200-series limit
- List returns series for practice, cursor-paginated
- List filters by participantId
- List filters by isActive
- Get returns series with upcoming appointments
- Get returns 404 for cross-tenant

**Update:**
- Update regenerates future SCHEDULED appointments
- Update preserves past/attended/canceled appointments
- Update with only internalNote does not regenerate
- Update returns 404 for cross-tenant

**Pause/Resume:**
- Pause sets isActive=false
- Pause on already-paused returns 409
- Resume sets isActive=true and generates appointments
- Resume on already-active returns 409

**Delete:**
- Delete removes series and future SCHEDULED appointments
- Delete preserves ATTENDED and canceled appointments
- Delete returns 404 for cross-tenant

**Generation:**
- generateAppointmentsForSeries creates correct number of appointments
- Generation skips existing appointments (idempotency)
- Generation respects seriesEndDate
- Generation skips past dates
- WEEKLY creates appointments every 7 days
- BIWEEKLY creates appointments every 14 days
- MONTHLY creates appointments on correct week-of-month

**Auth:**
- All endpoints require authentication
- All endpoints require CLINICIAN or ADMIN role
- Non-owner clinician cannot access other clinician's series

### Shared Schema Tests (recurring.schema.test.ts)

- CreateSeriesSchema accepts valid input
- CreateSeriesSchema rejects invalid recurrenceRule
- CreateSeriesSchema rejects dayOfWeek out of range
- CreateSeriesSchema rejects invalid time format
- CreateSeriesSchema rejects endTime <= startTime
- UpdateSeriesSchema accepts partial updates
- UpdateSeriesSchema rejects invalid values
- ListSeriesQuerySchema accepts valid queries
- ListSeriesQuerySchema coerces limit to number
- RecurrenceRuleEnum validates enum values

## Sign-Off

- [ ] All tests passing
- [ ] Coverage >80% maintained
- [ ] Typecheck passing
- [ ] No regressions in existing appointment tests

*Report will be updated after implementation and test execution.*
