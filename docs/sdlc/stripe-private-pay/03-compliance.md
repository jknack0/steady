# Stripe Private Pay (Phase 1) — Compliance Assessment

## Assessment Summary
**PASS_WITH_CONDITIONS**

The Stripe Private Pay integration is well-designed from a compliance standpoint. The use of Stripe Checkout (hosted) keeps Steady firmly in PCI SAQ-A scope — no card data touches Steady's servers. The primary compliance concerns center on HIPAA: Stripe receives patient names and email addresses to process payments, invoice emails contain billing amounts and service descriptions that could constitute PHI, and webhook data flows carry payment metadata back into Steady's database. All concerns are addressable with the conditions outlined below.

## Regulatory Frameworks Assessed
- HIPAA (Health Insurance Portability and Accountability Act)
- PCI-DSS (Payment Card Industry Data Security Standard)
- State privacy laws (general applicability)

## Data Classification

| Data Element | Category | Sensitivity | Notes |
|-------------|----------|-------------|-------|
| Patient name (sent to Stripe Customer) | PII | Medium | Required for Checkout; not clinical PHI by itself but linked to healthcare billing |
| Patient email address | PII | Medium | Used for Stripe Checkout session; already in Steady DB |
| Invoice amount / line items | PHI-adjacent | Medium | Billing amounts for healthcare services — PHI when linked to patient identity |
| Service description on invoice | PHI-adjacent | Medium-High | "Individual ADHD therapy session" links patient to mental health treatment |
| Card brand + last 4 digits | PCI Scoped | Low | Truncated card data; not subject to PCI-DSS (per SAQ-A) |
| Stripe PaymentIntent ID | Business Data | Low | External reference identifier |
| Stripe Connected Account ID | Business Data | Low | Practice-level Stripe identifier |
| Stripe Customer ID | Business Data | Low | Maps participant to Stripe; no clinical data |
| Stripe API keys (secret + publishable) | Secret | Critical | Grants payment processing capability |
| Stripe webhook signing secret | Secret | Critical | Validates webhook authenticity |
| Payment status / history | Business Data | Medium | Financial records tied to patient billing |
| Balance-due amount after insurance | PHI-adjacent | Medium | Reveals insurance coverage details indirectly |

## Framework Assessments

### PCI-DSS
**Status:** Compliant (SAQ-A)

| Requirement | Assessment | Notes |
|------------|------------|-------|
| FR-2: Invoice Payment Links (Stripe Checkout) | Compliant | Stripe Checkout is a hosted payment page — card data never touches Steady's servers, network, or logs. This is the textbook SAQ-A architecture. |
| FR-4: Save Card During Payment | Compliant | Card saving occurs entirely within Stripe's hosted Checkout. Steady only receives tokenized PaymentMethod IDs and truncated card info (brand + last 4). |
| FR-5: Charge Card on File | Compliant | Charges use Stripe PaymentMethod tokens via server-side API call. No raw card data is transmitted to or from Steady. The PaymentIntent is created using a token, not card numbers. |
| FR-3: Webhook Payment Reconciliation | Compliant | Webhook payloads contain payment metadata (amounts, status, PaymentIntent IDs) — no card numbers or CVVs. |
| NFR-2: Key storage | Needs Control | Stripe API keys and webhook secrets must be encrypted at rest using the same AES-256-GCM pattern specified for Stedi keys. |

**SAQ-A Eligibility Confirmation:** Steady qualifies for SAQ-A because (1) all payment pages are hosted by Stripe, (2) no card data is transmitted through Steady's systems, (3) no card data is stored by Steady, and (4) Steady does not process card data — it only receives tokenized references. This must be maintained throughout implementation. Any deviation (e.g., building a custom card form, logging webhook payloads that contain card data) would escalate PCI scope.

### HIPAA
**Status:** Conditionally Compliant

| Requirement | Assessment | Notes |
|------------|------------|-------|
| FR-1: Practice Stripe Connect Provisioning | Compliant | Practice-level configuration. No PHI involved in account provisioning. |
| FR-2: Invoice Payment Links | Needs Control | Invoice emails contain billing amounts and service descriptions (e.g., "ADHD therapy session — $150"). When linked to a named patient, this constitutes PHI under HIPAA. Stripe Checkout pages display patient name + invoice details. Stripe receives and processes this data. |
| FR-3: Webhook Reconciliation | Compliant | Webhook data contains payment amounts and Stripe IDs. These are financial records, not clinical data. Stored payment records link to invoices which link to patients — PHI by association, but already covered by existing access controls and audit logging. |
| FR-4: Save Card During Payment | Needs Control | Stripe stores a Customer object with patient name and email on the practice's connected account. This creates a record in Stripe's systems that links a patient to a healthcare provider. |
| FR-5: Charge Card on File | Needs Control | Server-side charge creates an audit-significant event — a clinician initiated a financial transaction against a patient. Must be audit-logged with clinician ID, patient ID, amount, and outcome. |
| FR-6: Auto-Generate Balance-Due Invoice | Needs Control | The balance-due amount implicitly reveals insurance coverage details (total minus insurance payment equals patient responsibility). The line item "Patient responsibility — balance after insurance" confirms the patient has insurance and reveals the coverage gap. |
| FR-7: Payment Status Visibility | Compliant | Displays financial data already protected by existing dashboard access controls. |

### State Privacy Laws
**Status:** Compliant with standard controls

Most state health privacy laws (e.g., California CMIA, Texas HB 300) impose requirements that are met when HIPAA compliance is achieved. The use of Stripe Checkout (hosted, encrypted, tokenized) satisfies state-level payment data protection requirements. No state-specific concerns beyond what HIPAA already covers.

## Risk Assessment

### RISK-1: Invoice Email Content Discloses PHI
- **Risk Level:** High
- **Analysis:** Invoice emails contain patient name, service descriptions, and amounts. If service descriptions include clinical terms ("ADHD therapy," "behavioral health session"), the email constitutes PHI transmitted via a channel the patient may share (forwarded email, shared inbox). Email is inherently not encrypted end-to-end.
- **Mitigation:** Use generic service descriptions in invoice emails (e.g., "Professional services — [Practice Name]"). Detailed line items should only be visible on the authenticated Checkout page or within the clinician dashboard. The spec does not currently mandate this — it must be added as a condition.

### RISK-2: Stripe as Uncontracted Business Associate
- **Risk Level:** High
- **Analysis:** Without a BAA, transmitting patient names and healthcare billing data to Stripe violates HIPAA's Business Associate requirements. Stripe stores Customer objects (name, email) on connected accounts and associates them with healthcare payment transactions.
- **Mitigation:** Execute a BAA with Stripe before production deployment. Stripe provides BAAs for healthcare customers upon request.

### RISK-3: Stripe API Key Compromise
- **Risk Level:** Critical
- **Analysis:** Stripe secret API keys grant the ability to create charges, access customer data, and issue refunds on the practice's connected account. Compromise would enable unauthorized financial transactions and exposure of patient billing data stored in Stripe.
- **Mitigation:** The spec correctly mandates AES-256-GCM encryption for API keys (same pattern as Stedi keys). Keys must never appear in logs, error messages, or client-side code. Key rotation must be supported without downtime.

### RISK-4: Webhook Signature Bypass
- **Risk Level:** High
- **Analysis:** If webhook signature verification is bypassed or incorrectly implemented, an attacker could forge webhook events to create fraudulent payment records, mark invoices as paid without actual payment, or inject malicious data into the database.
- **Mitigation:** The spec mandates webhook signature verification (NFR-2). Implementation must use Stripe's `stripe.webhooks.constructEvent()` with the webhook signing secret. Raw request body (not parsed JSON) must be used for signature verification — this is a common implementation pitfall.

### RISK-5: PCI Scope Creep
- **Risk Level:** Medium
- **Analysis:** SAQ-A eligibility depends on Steady never handling card data. If a developer adds a custom card form, logs full webhook payloads, or stores card details beyond brand + last 4, PCI scope escalates dramatically (to SAQ-D, requiring penetration testing, network segmentation, etc.).
- **Mitigation:** Architectural guardrail: no custom payment forms, no card data in logs, no storage of card data beyond Stripe-provided tokens and truncated display info. Code review checklist must include PCI scope verification.

### RISK-6: Balance-Due Invoice Reveals Insurance Status
- **Risk Level:** Low
- **Analysis:** Auto-generated balance-due invoices (FR-6) with the description "Patient responsibility — balance after insurance" confirm that the patient has insurance and reveal the gap between insurance coverage and total cost. This is PHI-adjacent but low risk because the invoice is sent only to the patient and visible only to the treating clinician.
- **Mitigation:** Acceptable risk. The patient already knows their own insurance status. The clinician has a treatment relationship. No additional controls needed beyond existing access restrictions.

### RISK-7: Audit Trail Gaps for Payment Actions
- **Risk Level:** Medium
- **Analysis:** Payment actions (charge card, save card, remove card) involve financial transactions against patient accounts. Missing audit trails could prevent investigation of disputed charges or unauthorized billing.
- **Mitigation:** The spec mandates audit logging for all payment actions (NFR-2). Implementation must ensure that Stripe API calls (which do not go through Prisma middleware) are explicitly audit-logged in the service layer.

### RISK-8: Checkout Session Metadata Leakage
- **Risk Level:** Low
- **Analysis:** Stripe Checkout sessions can include metadata, line item descriptions, and customer details. If overly detailed clinical information is included in Checkout session metadata (e.g., diagnosis codes, treatment notes), it would be stored in Stripe's systems beyond what is necessary.
- **Mitigation:** Checkout sessions should include only: invoice ID, amount, generic service description, and practice name. No diagnosis codes, session notes, or clinical details should be passed to Stripe.

## Mandatory Conditions

### COND-1: Business Associate Agreement with Stripe
- **Requirement:** Execute a signed BAA with Stripe before the feature is deployed to production. Stripe must be listed as a Business Associate in the organization's HIPAA documentation.
- **Rationale:** Stripe receives patient names and email addresses in connection with healthcare billing transactions. Under HIPAA, any entity that creates, receives, maintains, or transmits PHI on behalf of a covered entity must be covered by a BAA.
- **Verification:** Signed BAA document on file. Legal confirmation before production deployment.

### COND-2: Minimize PHI in Invoice Emails and Stripe Checkout
- **Requirement:** Invoice emails must use generic service descriptions (e.g., "Professional services" or "Healthcare services") rather than clinical terms (e.g., "ADHD therapy session," "behavioral health consultation"). Stripe Checkout line items must follow the same rule. Specific service details should only be visible within the authenticated clinician dashboard.
- **Rationale:** Email is not encrypted end-to-end. Clinical service descriptions linked to patient names constitute PHI. Minimizing PHI in email content reduces exposure risk from email forwarding, shared inboxes, or email account compromise.
- **Verification:** Review invoice email templates and Checkout session creation code to confirm no clinical terminology is included. QA test: send a test invoice and verify the email and Checkout page contain only generic descriptions.

### COND-3: Stripe API Key and Webhook Secret Encryption
- **Requirement:** Stripe secret API keys and webhook signing secrets must be encrypted at rest using AES-256-GCM with the same application-level encryption pattern used for Stedi API keys. Encryption keys must be stored separately from encrypted data (environment variable or KMS). Keys must never appear in application logs, error messages, API responses, or client-side code.
- **Rationale:** Stripe API keys grant financial transaction authority and access to patient billing data in Stripe. Webhook secrets protect the integrity of payment event processing.
- **Verification:** Code review of key storage implementation. Verify encryption at rest in database. Search codebase for any plain-text key logging. Verify keys are excluded from API responses and client bundles.

### COND-4: Webhook Signature Verification Using Raw Body
- **Requirement:** Stripe webhook signature verification must use `stripe.webhooks.constructEvent()` with the raw request body (Buffer), not the parsed JSON body. The webhook endpoint must be excluded from Express body-parser JSON middleware or use a raw body parser.
- **Rationale:** Stripe webhook signatures are computed against the raw request body. Using a parsed/re-serialized body will cause signature verification to fail silently or be bypassed. This is the most common Stripe webhook security implementation error.
- **Verification:** Code review of webhook route middleware chain. Integration test: send a webhook with an invalid signature and verify it returns 400.

### COND-5: No Card Data in Steady Systems
- **Requirement:** Steady must never store, log, or transmit raw card numbers, CVVs, expiration dates, or magnetic stripe data. The only card information Steady may store is: Stripe PaymentMethod ID (token), card brand (e.g., "Visa"), and last 4 digits. This must be enforced as an architectural invariant.
- **Rationale:** SAQ-A eligibility requires that no card data passes through the merchant's systems. Any storage or logging of card data would escalate PCI scope to SAQ-D, requiring significant additional compliance controls (network segmentation, penetration testing, vulnerability scanning, etc.).
- **Verification:** Code review of all Stripe webhook handlers, payment service functions, and database models. Verify no card data fields beyond brand + last 4 exist in the schema. Search logs for card number patterns.

### COND-6: Audit Logging for All Payment Actions
- **Requirement:** The following actions must be explicitly audit-logged (since Stripe API calls bypass Prisma middleware): Checkout session creation, card-on-file charge initiated, card-on-file charge result (success/failure), card saved, card removed, webhook event processed, payment record created. Each log entry must include: user ID (clinician or system), action type, resource ID (invoice/payment/participant), and timestamp. Logged entries must not contain card data, amounts, or PII beyond IDs.
- **Rationale:** Payment actions are high-sensitivity operations in a healthcare billing context. HIPAA requires audit trails for all PHI-related operations, and financial regulations require records of billing transactions.
- **Verification:** Review service layer code for explicit audit log calls on each action listed. QA test: perform each action and verify corresponding audit log entries exist.

### COND-7: Checkout Session Data Minimization
- **Requirement:** Stripe Checkout sessions and Customer objects must contain only the minimum data necessary: patient name (required by Stripe for Customer), patient email (required for receipts), invoice ID (in metadata), amount, and generic line item descriptions. No diagnosis codes, treatment details, session notes, or clinical information may be passed to Stripe via any field (metadata, description, line items, or custom fields).
- **Rationale:** HIPAA's Minimum Necessary standard requires that only the minimum PHI needed for the transaction be disclosed to a third party. Stripe does not need clinical details to process a payment.
- **Verification:** Code review of Checkout session creation and Customer creation/update calls. Verify metadata fields contain only invoice ID and practice ID. Verify line item descriptions use generic language.

### COND-8: Payment Endpoint Access Control
- **Requirement:** All payment-related endpoints (create Checkout session, charge card on file, list/remove saved cards, view payment status) must verify that the authenticated clinician owns the patient via the ClinicianClient relationship. A clinician must never be able to initiate a payment action against a patient they do not own.
- **Rationale:** Payment actions are sensitive operations that affect patient financial records. Without ownership verification, a clinician could charge the wrong patient's card or view another clinician's billing data.
- **Verification:** Code review of all payment route handlers for ownership checks. QA test: attempt to charge a card for a patient owned by a different clinician and verify 403 response.

## Recommendations

These are non-mandatory best practices that would strengthen the implementation:

1. **Payment receipt emails via Stripe:** Let Stripe send payment confirmation receipts directly (Stripe supports this natively) rather than building custom receipt emails. This reduces PHI in Steady-sent emails and leverages Stripe's compliant email infrastructure.

2. **Stripe Dashboard access control:** Restrict which team members can access the Stripe Dashboard for connected accounts. Document who has access and review quarterly. The Stripe Dashboard shows customer names, email addresses, and payment history.

3. **Test mode isolation:** Use Stripe test mode API keys in all non-production environments. Never use production Stripe keys in development or staging. Verify this in CI/CD environment variable configuration.

4. **Webhook retry monitoring:** Monitor pg-boss queue depth for failed webhook processing jobs. Alert if webhook events are failing repeatedly — this could indicate signature verification issues, database connectivity problems, or Stripe API changes.

5. **Annual PCI SAQ-A self-assessment:** Even though SAQ-A is the lightest PCI compliance level, complete the annual Self-Assessment Questionnaire to maintain documentation of compliance. This is technically required by PCI-DSS but often overlooked by SAQ-A merchants.

6. **Data retention alignment:** Align payment record retention with the claims data retention policy (7 years from the Stedi compliance assessment). Payment records and invoice records should follow the same retention schedule.
