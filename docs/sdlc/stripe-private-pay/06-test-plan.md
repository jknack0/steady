# Stripe Private Pay (Phase 1) — Test Plan & Implementation Plan

## Test Strategy

**Framework:** Vitest (node environment for API, jsdom for web)
**API tests:** Supertest against Express app with mocked Prisma (vi.hoisted() mdb pattern)
**Schema tests:** Direct Zod safeParse validation
**External API:** Mock stripe npm package globally via vi.mock("stripe") — never call real Stripe in tests
**Webhook body parsing:** Webhook tests send raw Buffer bodies and verify express.raw() usage (COND-4)
**Organization:** 4 API test files + 1 schema test file, each independently runnable

## Test Plan

### Acceptance Criteria Coverage

| AC | Test File | Test Name | What It Verifies |
|----|-----------|-----------|-----------------|
| FR-1: Provision account | stripe-payments.test.ts | creates connected account and links to practice | Admin provisioning |
| FR-1: No Stripe = no link | stripe-payments.test.ts | sends invoice without payment link when no Stripe | Graceful degradation |
| FR-1: Connection status | stripe-payments.test.ts | returns connection status for practice | GET connection-status |
| FR-2: Send creates Checkout | stripe-payments.test.ts | creates Checkout session when sending invoice | Session creation |
| FR-2: Generic line items | stripe-payments.test.ts | creates Checkout with generic line items | COND-2 compliance |
| FR-2: Payment records | stripe-webhooks.test.ts | creates Payment on checkout.session.completed | Webhook processing |
| FR-2: Abandoned checkout | stripe-webhooks.test.ts | handles checkout.session.expired | No false payment |
| FR-2: Already paid | stripe-payments.test.ts | rejects Checkout for PAID invoice | 409 response |
| FR-3: Payment record | stripe-webhooks.test.ts | creates Payment record | amountCents, method, reference |
| FR-3: Full = PAID | stripe-webhooks.test.ts | sets invoice to PAID | Status update |
| FR-3: Partial = PARTIALLY_PAID | stripe-webhooks.test.ts | sets invoice to PARTIALLY_PAID | Status update |
| FR-3: Duplicate idempotent | stripe-webhooks.test.ts | no duplicate Payment for same PI ID | Idempotency |
| FR-3: Invalid signature | stripe-webhooks.test.ts | returns 400 for invalid signature | Security |
| FR-4: Save card | stripe-webhooks.test.ts | saves PaymentMethod from checkout | Card saving |
| FR-4: List cards | stripe-payments.test.ts | lists saved cards for participant | GET cards |
| FR-4: Remove card | stripe-payments.test.ts | removes card and detaches from Stripe | DELETE card |
| FR-5: Charge success | stripe-payments.test.ts | charges card and creates Payment | Happy path |
| FR-5: Charge declined | stripe-payments.test.ts | returns error on decline | Error handling |
| FR-5: No charge on PAID | stripe-payments.test.ts | rejects charge for PAID invoice | 409 |
| FR-5: No saved card | stripe-payments.test.ts | rejects charge with no card | 404 |
| FR-6: Balance-due created | balance-due.test.ts | creates draft for remaining balance | Auto-generation |
| FR-6: Full coverage = no invoice | balance-due.test.ts | no balance-due when fully covered | Skip logic |
| FR-6: Update existing draft | balance-due.test.ts | updates draft on adjustment | No duplicate |
| FR-7: Link indicator | stripe-payments.test.ts | returns paymentLinkUrl on invoice | Metadata |

### Compliance Coverage

| Condition | Test File | Test Name |
|-----------|-----------|-----------|
| COND-2: PHI minimization | stripe-payments.test.ts | generic line items only |
| COND-3: Key encryption | stripe-payments.test.ts | stores keys encrypted |
| COND-4: Raw body webhook | stripe-webhooks.test.ts | signature uses raw Buffer |
| COND-4: Invalid sig | stripe-webhooks.test.ts | returns 400 |
| COND-5: No card data | stripe-webhooks.test.ts | saves only brand + last4 |
| COND-6: Audit logging | stripe-payments.test.ts | audit-logs charge + removal |
| COND-7: Data minimization | stripe-payments.test.ts | metadata has invoiceId only |
| COND-8: Ownership | stripe-payments.test.ts | 403 on unowned participant (x3) |

### Adversarial Coverage

| Scenario | Test File | Test Name |
|----------|-----------|-----------|
| Unauth access (x5) | stripe-payments.test.ts | returns 401 without auth |
| Participant role | stripe-payments.test.ts | returns 403 for participant role |
| Non-owner clinician (x3) | stripe-payments.test.ts | returns 403 for unowned participant |
| Forged webhook | stripe-webhooks.test.ts | returns 400 for invalid signature |
| Webhook replay | stripe-webhooks.test.ts | no duplicate Payment |
| Unknown event | stripe-webhooks.test.ts | ignores unknown types with 200 |
| Charge VOID invoice | stripe-payments.test.ts | rejects charge for VOID |
| Expired card | stripe-payments.test.ts | returns error for expired card |
| Missing metadata | stripe-webhooks.test.ts | returns 400 on missing invoiceId |
| Schema bounds | stripe.schema.test.ts | rejects oversized strings |
| Balance-due on VOID | balance-due.test.ts | no generation for VOID source |

## Domain -> Test File Mapping

| Domain | Test File | Tests |
|--------|-----------|-------|
| Webhooks + signature + idempotency | stripe-webhooks.test.ts | ~15 |
| Checkout + charges + cards + status | stripe-payments.test.ts | ~22 |
| Balance-due auto-generation | balance-due.test.ts | ~10 |
| Zod schemas | stripe.schema.test.ts | ~12 |
| **Total** | **5 files** | **~59** |

## Implementation Plan

### Phase 1: Data Model + Schemas
1. Prisma: Add fields to Practice (stripeConnectedAccountId, stripeApiKeyEncrypted, stripeApiKeyLastFour, stripeWebhookSecretEncrypted), Invoice (paymentLinkUrl, paymentLinkExpiresAt, balanceDueSourceInvoiceId), Payment (stripePaymentIntentId)
2. Prisma: Add models StripeCustomer, SavedPaymentMethod, CheckoutSession + CheckoutSessionStatus enum
3. Encryption middleware: Add Practice.stripeApiKeyEncrypted + stripeWebhookSecretEncrypted
4. Run db:generate + db:push
5. Zod schemas: stripe.ts with CreateCheckoutSessionSchema, ChargeCardSchema, CheckoutSessionStatusEnum, ProvisionStripeSchema
6. Schema tests: stripe.schema.test.ts (~12 tests)

### Phase 2: Services
1. stripe-client.ts — SDK wrapper, key decryption, connected account scoping
2. stripe-connect.ts — Admin provisioning, connection status, key storage
3. stripe-checkout.ts — Checkout session creation, generic descriptions (COND-2), handleSessionCompleted/Expired
4. stripe-payments.ts — Card charges with PaymentIntent, audit logging (COND-6), payment recording
5. stripe-customers.ts — Customer lifecycle (name+email only, COND-7), saved card management (brand+last4 only, COND-5)
6. balance-due.ts — Auto-generate draft invoices, update existing drafts, void cascade
7. Register pg-boss workers: stripe-webhook-process, stripe-balance-due-check

### Phase 3: Routes
1. stripe-webhooks.ts — express.raw(), signature verification (COND-4), pg-boss dispatch
2. stripe-payments.ts — Checkout creation, card charge, saved cards CRUD, connection status
3. Extend invoices.ts — Send creates Checkout session, resend-link endpoint
4. Register in app.ts — webhook route BEFORE express.json(), payments route after
5. Write API tests: stripe-webhooks.test.ts (~15), stripe-payments.test.ts (~22), balance-due.test.ts (~10)

### Phase 4: Frontend
1. Hooks: use-stripe-payments.ts, use-saved-cards.ts
2. Components: ChargeCardDialog, SavedCardsSection, PaymentLinkBadge, StripeStatusBadge, BalanceDueIndicator
3. Billing page: PaymentLinkBadge on invoice rows, Charge Card button, BalanceDueIndicator
4. Participant detail: SavedCardsSection
5. Practice Settings: StripeStatusBadge

### Phase 5: Verification
1. Run all tests — 59+ must pass
2. Typecheck + lint — zero errors
3. Manual smoke test of all 6 UX flows
4. Compliance checklist: COND-1 through COND-8

## Summary

- Total test files: 5
- Total tests: ~59
- AC coverage: 25/25
- Compliance coverage: 7/8 (COND-1 is legal gate)
- Adversarial tests: 14
