# Client Web Portal — AWS Provisioning Runbook

**Audience:** Engineer or SRE provisioning the production AWS resources the Client Web Portal MVP depends on.
**Region:** us-east-2 (Ohio) — must match RDS and existing API EC2.
**Prereq:** AWS CLI v2 configured with an IAM user/role that has permissions for SES, SNS, Cognito, Route 53, ACM, and Amplify.

---

## Pre-flight checklist

- [ ] IAM user has `AmazonSESFullAccess`, `AmazonSNSFullAccess`, `AmazonCognitoPowerUser`, `AWSCertificateManagerFullAccess`, `AmazonRoute53FullAccess`, `AWSAmplifyFullAccess`.
- [ ] `aws configure` shows `region = us-east-2`.
- [ ] BAA with AWS is signed and covers SES, SNS, Cognito, CloudFront, Amplify, RDS. Confirm in writing with AWS account contact.
- [ ] Cognito User Pool ID + Client ID for the production pool are documented (legacy + portal share the same pool per AD-9).

---

## 1 — Amazon SES: domain identity + production access (COND-2, COND-4)

### 1.1 Verify the sending domain

```bash
aws sesv2 create-email-identity \
  --email-identity portal.steadymentalhealth.com \
  --configuration-set-name portal-transactional
```

Note the four `DKIM` tokens returned and add the CNAME records to the hosted zone:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0XXXXXXXXXXXXXXX \
  --change-batch file://dkim-change-batch.json
```

Wait for DKIM verification:

```bash
aws sesv2 get-email-identity \
  --email-identity portal.steadymentalhealth.com \
  --query 'DkimAttributes.Status'
```

Expected: `SUCCESS`.

### 1.2 Configuration set

```bash
aws sesv2 create-configuration-set \
  --configuration-set-name portal-transactional \
  --sending-options SendingEnabled=true \
  --reputation-options ReputationMetricsEnabled=true \
  --tracking-options CustomRedirectDomain=portal.steadymentalhealth.com
```

### 1.3 Production access

By default, new SES identities are in the sandbox. To go live:

1. AWS Console → SES → **Account dashboard** → **Request production access**.
2. Use case: "HIPAA-covered transactional emails to existing patients of our clinical platform."
3. Expected daily volume: start at 1,000.
4. Contact: on-call engineering rotation.
5. Wait for approval (usually 24h).

### 1.4 Verify production access

**Gate:** COND-2 requires production access to be confirmed before GA.

```bash
aws sesv2 get-account --query 'ProductionAccessEnabled'
```

Expected: `true`. Screenshot this and attach to the ship PR.

---

## 2 — SNS topics for bounce + complaint notifications (FR-2, AD-8)

### 2.1 Create topics

```bash
aws sns create-topic --name ses-portal-bounces --region us-east-2
aws sns create-topic --name ses-portal-complaints --region us-east-2
```

Note both topic ARNs. Export them:

```
SES_BOUNCE_TOPIC_ARN=arn:aws:sns:us-east-2:<ACCOUNT>:ses-portal-bounces
SES_COMPLAINT_TOPIC_ARN=arn:aws:sns:us-east-2:<ACCOUNT>:ses-portal-complaints
```

### 2.2 Wire the topics into the SES configuration set

```bash
aws sesv2 create-configuration-set-event-destination \
  --configuration-set-name portal-transactional \
  --event-destination-name bounce-events \
  --event-destination \
    'Enabled=true,MatchingEventTypes=BOUNCE,SnsDestination={TopicArn=arn:aws:sns:us-east-2:<ACCOUNT>:ses-portal-bounces}'

aws sesv2 create-configuration-set-event-destination \
  --configuration-set-name portal-transactional \
  --event-destination-name complaint-events \
  --event-destination \
    'Enabled=true,MatchingEventTypes=COMPLAINT,SnsDestination={TopicArn=arn:aws:sns:us-east-2:<ACCOUNT>:ses-portal-complaints}'
```

### 2.3 Subscribe the API endpoints

Once `https://api.steadymentalhealth.com` is reachable from the public internet:

```bash
aws sns subscribe \
  --topic-arn $SES_BOUNCE_TOPIC_ARN \
  --protocol https \
  --notification-endpoint https://api.steadymentalhealth.com/api/internal/ses-bounce

aws sns subscribe \
  --topic-arn $SES_COMPLAINT_TOPIC_ARN \
  --protocol https \
  --notification-endpoint https://api.steadymentalhealth.com/api/internal/ses-complaint
```

The Express handler auto-confirms the `SubscriptionConfirmation` message by fetching the `SubscribeURL`. No manual confirmation needed — but verify both subscriptions flip to `Confirmed`:

```bash
aws sns list-subscriptions-by-topic --topic-arn $SES_BOUNCE_TOPIC_ARN
aws sns list-subscriptions-by-topic --topic-arn $SES_COMPLAINT_TOPIC_ARN
```

Expected: `SubscriptionArn` is a full ARN (not "PendingConfirmation").

### 2.4 Set the ARNs on the API EC2

Add to the API's environment config and restart:

```bash
ssh ubuntu@<API_EC2> "
  echo 'SES_BOUNCE_TOPIC_ARN=$SES_BOUNCE_TOPIC_ARN' >> ~/steady/.env
  echo 'SES_COMPLAINT_TOPIC_ARN=$SES_COMPLAINT_TOPIC_ARN' >> ~/steady/.env
  pm2 restart steady-api
"
```

### 2.5 End-to-end test

Use the SES simulator:

```bash
aws sesv2 send-email \
  --from-email-address no-reply@portal.steadymentalhealth.com \
  --destination ToAddresses=bounce@simulator.amazonses.com \
  --content 'Simple={Subject={Data=Bounce test},Body={Text={Data=Test}}}' \
  --configuration-set-name portal-transactional
```

Expected: within 2 minutes, the `email_suppressions` table has a row for `bounce@simulator.amazonses.com` with `reason=BOUNCE`. Check via psql.

Repeat with `complaint@simulator.amazonses.com` and verify `reason=COMPLAINT`.

---

## 3 — Cognito User Pool: email via SES (COND-4)

The portal uses the existing single Cognito User Pool (per AD-9). Cognito sends password reset emails itself; by default it uses Cognito-hosted email, which **is not BAA-covered**. COND-4 requires reconfiguring Cognito to send via SES.

### 3.1 Verify current configuration

```bash
aws cognito-idp describe-user-pool \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --query 'UserPool.EmailConfiguration'
```

Expected state BEFORE change: `EmailSendingAccount=COGNITO_DEFAULT` (wrong — this is the PHI risk).

### 3.2 Update the pool to use SES

```bash
aws cognito-idp update-user-pool \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --email-configuration \
    SourceArn=arn:aws:ses:us-east-2:<ACCOUNT>:identity/portal.steadymentalhealth.com,\
ReplyToEmailAddress=no-reply@portal.steadymentalhealth.com,\
EmailSendingAccount=DEVELOPER,\
From=no-reply@portal.steadymentalhealth.com,\
ConfigurationSet=portal-transactional
```

### 3.3 Verify

```bash
aws cognito-idp describe-user-pool \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --query 'UserPool.EmailConfiguration.EmailSendingAccount'
```

Expected: `DEVELOPER`. Screenshot this and attach to the ship PR (COND-4).

### 3.4 End-to-end test

Trigger a forgot-password flow for a test account and verify:
- The email arrives from `no-reply@portal.steadymentalhealth.com` (not `no-reply@verificationemail.com`)
- The `MAIL FROM` return-path resolves to an SES bounce address
- The email appears in CloudWatch Logs for the `portal-transactional` configuration set

---

## 4 — Route 53 + ACM: portal.steadymentalhealth.com (AC-11.*)

### 4.1 Request an ACM certificate

**Must be in us-east-1 for CloudFront.**

```bash
aws acm request-certificate \
  --domain-name portal.steadymentalhealth.com \
  --validation-method DNS \
  --region us-east-1
```

Note the certificate ARN. Fetch the DNS validation record:

```bash
aws acm describe-certificate \
  --certificate-arn <CERT_ARN> \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Add the CNAME to Route 53 and wait for `Status=ISSUED`.

### 4.2 Create the DNS record for the portal subdomain

Once Amplify has assigned its CloudFront distribution:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0XXXXXXXXXXXXXXX \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "portal.steadymentalhealth.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "<AMPLIFY_CLOUDFRONT_DOMAIN>",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

### 4.3 Verify

```bash
dig +short portal.steadymentalhealth.com
curl -I https://portal.steadymentalhealth.com/
```

Expected: `HTTP/2 200` or a redirect to `/portal/login`.

---

## 5 — Amplify: host-based routing for the portal

Amplify hosts `steadymentalhealth.com` already. The portal shares the same Next.js app; the `apps/web/src/middleware.ts` dispatcher rewrites `portal.steadymentalhealth.com/*` to `/portal/*`.

### 5.1 Add the custom domain to the existing Amplify app

AWS Console → Amplify → **Domain management** → **Add domain**:
- Domain: `steadymentalhealth.com`
- Add subdomain: `portal`
- Branch: `main`
- Type: custom → use the ACM cert from step 4

### 5.2 Confirm Host header forwarding

Amplify's underlying CloudFront distribution MUST forward the `Host` header so `middleware.ts` can inspect it.

```bash
aws cloudfront get-distribution-config --id <DISTRIBUTION_ID> \
  --query 'DistributionConfig.DefaultCacheBehavior.ForwardedValues.Headers'
```

Expected: the list includes `Host`. If it doesn't, open a support case to get an Amplify operator to adjust the underlying CloudFront config — it's a managed distribution and normal customers can't edit it directly.

### 5.3 Cache policy

Portal pages contain PHI. They MUST NOT be cached by CloudFront:

- `Cache-Control: no-store, no-cache, must-revalidate` — set by Next.js `headers()` in `next.config.js`.
- CloudFront's Amplify-managed cache policy respects `Cache-Control` headers, so no explicit override is needed — verify with a `curl -I` after deploy.

---

## 6 — CloudWatch alarms (COND-21)

### 6.1 SES bounce rate alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "SES-Bounce-Rate-High" \
  --alarm-description "SES bounce rate > 5%" \
  --metric-name Reputation.BounceRate \
  --namespace AWS/SES \
  --statistic Average \
  --period 3600 \
  --threshold 0.05 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions <SNS_ONCALL_TOPIC_ARN>
```

### 6.2 SES complaint rate alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "SES-Complaint-Rate-High" \
  --alarm-description "SES complaint rate > 0.1%" \
  --metric-name Reputation.ComplaintRate \
  --namespace AWS/SES \
  --statistic Average \
  --period 3600 \
  --threshold 0.001 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions <SNS_ONCALL_TOPIC_ARN>
```

### 6.3 SES send quota alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "SES-Daily-Quota-80pct" \
  --alarm-description "SES sending approaching daily quota" \
  --metric-name Send \
  --namespace AWS/SES \
  --statistic Sum \
  --period 3600 \
  --threshold 40000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions <SNS_ONCALL_TOPIC_ARN>
```

(Threshold is 80% of the default 50k/day quota. Adjust after SES grants a higher limit.)

### 6.4 Portal 5xx error alarm

CloudFront metric:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Portal-5xx-Rate-High" \
  --metric-name 5xxErrorRate \
  --namespace AWS/CloudFront \
  --dimensions Name=DistributionId,Value=<DIST_ID> \
  --statistic Average \
  --period 300 \
  --threshold 1.0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions <SNS_ONCALL_TOPIC_ARN>
```

### 6.5 Verify alarms exist

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix "SES-" \
  --query 'MetricAlarms[].[AlarmName,StateValue]' \
  --output table
```

All alarms should show `OK` state. Screenshot and attach to ship PR.

---

## 7 — Environment variable rollout

### 7.1 API EC2 (`~/steady/.env`)

```
SES_REGION=us-east-2
SES_FROM_ADDRESS=no-reply@portal.steadymentalhealth.com
SES_CONFIGURATION_SET=portal-transactional
SES_BOUNCE_TOPIC_ARN=arn:aws:sns:us-east-2:<ACCOUNT>:ses-portal-bounces
SES_COMPLAINT_TOPIC_ARN=arn:aws:sns:us-east-2:<ACCOUNT>:ses-portal-complaints
SES_MOCK_MODE=false
PORTAL_BASE_URL=https://portal.steadymentalhealth.com
PORTAL_INVITE_TTL_DAYS=7
```

Then:

```bash
pm2 restart steady-api
pm2 logs steady-api --lines 50
```

Verify the log shows `Email sent via SES` on the first live send (not `Email sent (mock mode)`).

### 7.2 Amplify environment variables

AWS Console → Amplify → Environment variables:

```
NEXT_PUBLIC_API_URL=https://api.steadymentalhealth.com
```

Redeploy the `main` branch after updating.

---

## 8 — Smoke test (end-to-end)

1. Clinician creates a portal invitation for a test email via the clinician app.
2. Verify the email arrives at the test mailbox.
3. Click the link → lands on `https://portal.steadymentalhealth.com/signup?t=<token>`.
4. Complete the form → redirected to `/portal/calendar`.
5. Verify the portal cookie exists and is scoped to `portal.steadymentalhealth.com` (no `Domain` attribute, no wildcard).
6. Click a joinable appointment → connects to a LiveKit room.
7. On the API EC2, check the audit log:
   ```sql
   SELECT action, metadata FROM audit_logs
   WHERE metadata->>'event' IN ('telehealth_connected', 'telehealth_token_issued')
   ORDER BY "createdAt" DESC LIMIT 5;
   ```
   Expected: entries for the test session (COND-7).

---

## 9 — Rollback plan

If SES production access is granted but bounce rates spike:
1. Open the circuit breaker manually: `UPDATE "SesCircuitBreakerState" SET "isOpen"=true, "openReason"='manual' WHERE id='singleton'`.
2. Drain the pg-boss queue: `UPDATE pgboss.job SET state='cancelled' WHERE name='send-portal-invite-email' AND state='created'`.
3. Page on-call — see `runbooks/email-incidents.md`.

If the portal subdomain goes offline:
1. Revert the Route 53 alias to point at the previous target.
2. Status page update; flip an Amplify rollback.
3. The portal is stateless on the Next.js side — no data loss.

---

## Appendix — Resource inventory

| Resource | ARN pattern | Notes |
|---|---|---|
| SES identity | `arn:aws:ses:us-east-2:<ACCOUNT>:identity/portal.steadymentalhealth.com` | Domain-level |
| SES config set | `portal-transactional` | Bounce/complaint event destinations |
| SNS bounce topic | `arn:aws:sns:us-east-2:<ACCOUNT>:ses-portal-bounces` | Subscribed to API |
| SNS complaint topic | `arn:aws:sns:us-east-2:<ACCOUNT>:ses-portal-complaints` | Subscribed to API |
| ACM cert | `arn:aws:acm:us-east-1:<ACCOUNT>:certificate/<UUID>` | Must be us-east-1 for CloudFront |
| Amplify app | Existing | Add `portal.steadymentalhealth.com` subdomain |
| Cognito pool | Existing | Reconfigured EmailConfiguration → DEVELOPER+SES |

---

## Cross-references

- `docs/sdlc/client-web-portal-mvp/03-compliance.md` — COND-2, COND-4, COND-18, COND-21
- `docs/sdlc/client-web-portal-mvp/04-architecture.md` — AD-7, AD-8, AD-9
- `docs/sdlc/client-web-portal-mvp/07-implementation-plan.md` — Pre-merge checklist
- `docs/sdlc/client-web-portal-mvp/runbooks/email-incidents.md` — Incident response for bounce/complaint spikes (owned by compliance)
