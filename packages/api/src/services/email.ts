import { logger } from "../lib/logger";
import {
  SES_REGION,
  SES_FROM_ADDRESS,
  SES_CONFIGURATION_SET,
  SES_MOCK_MODE,
} from "../lib/env";
import { prisma } from "@steady/db";
import crypto from "crypto";

// ── Amazon SES transactional email transport ──────────────────────
// COND-2: Must be in production mode + BAA-covered before GA.
// COND-4: Used by Cognito for password reset emails via SourceArn.
// COND-20: AWS SDK v3 enforces TLS by default.
// NFR-4.3: Invite templates are PHI-free (enforced by COND-1 test).
//
// This module intentionally does NOT import @aws-sdk/client-sesv2
// statically — the import is lazy so the file compiles in environments
// where the SDK isn't installed yet (e.g., CI before `npm install`).

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  skipped?: boolean;
  reason?: string;
}

// Dev/test in-memory record of sent emails. Used by integration tests.
export const __sentEmailsForTest: Array<SendEmailParams & { messageId: string }> = [];

function hashEmailCanonical(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

/**
 * Check the EmailSuppression list before sending.
 * Returns true if the recipient is suppressed (send MUST be skipped).
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  const emailHash = hashEmailCanonical(email);
  const row = await prisma.emailSuppression.findUnique({
    where: { emailHash },
  });
  if (!row || row.deletedAt) return false;
  // Soft bounces can expire; hard bounces/complaints never do
  if (row.expiresAt && row.expiresAt < new Date()) return false;
  return true;
}

/**
 * Send a transactional email via SES.
 *
 * - Checks the suppression list first (never sends to bounced/complained)
 * - In test/mock mode, records the email in-memory and returns mock success
 * - In production, calls SES v2 SendEmail with the BAA-covered identity
 *
 * IMPORTANT: Logs NEVER contain the recipient email, subject line
 * content, or body (COND-1, NFR-4.1).
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const { to, subject, html, text, tags } = params;

  // Suppression check (COND-23 + NFR-4.3)
  if (await isEmailSuppressed(to)) {
    logger.warn("Email not sent — recipient is in EmailSuppression list");
    return { success: false, skipped: true, reason: "suppressed" };
  }

  // Mock mode for dev/test — record and return success
  if (SES_MOCK_MODE) {
    const messageId = `mock-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    __sentEmailsForTest.push({ ...params, messageId });
    logger.info("Email sent (mock mode)");
    return { success: true, messageId };
  }

  try {
    // Lazy import so the file compiles even without the SDK
    const { SESv2Client, SendEmailCommand } = await import(
      "@aws-sdk/client-sesv2"
    );

    const client = new SESv2Client({ region: SES_REGION });
    const command = new SendEmailCommand({
      FromEmailAddress: SES_FROM_ADDRESS,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
            Text: { Data: text, Charset: "UTF-8" },
          },
        },
      },
      ...(SES_CONFIGURATION_SET
        ? { ConfigurationSetName: SES_CONFIGURATION_SET }
        : {}),
      ...(tags
        ? {
            EmailTags: Object.entries(tags).map(([Name, Value]) => ({
              Name,
              Value,
            })),
          }
        : {}),
    });

    const response = await client.send(command);
    logger.info("Email sent via SES");
    return { success: true, messageId: response.MessageId };
  } catch (err) {
    logger.error("SES send failed", err);
    return { success: false, reason: "ses-error" };
  }
}

// ── Template: Portal invitation (new-user variant) ───────────────
// COND-1 compliance: NO PHI. No clinician name, no client name, no DOB,
// no appointment time, no diagnosis. Hardcoded strings only.

export function renderPortalInviteEmail(params: {
  variant: "new-user" | "existing-user";
  signupUrl: string;
  clinicianLastName?: string; // Only for existing-user variant
}): { subject: string; html: string; text: string } {
  if (params.variant === "existing-user") {
    const doctor = params.clinicianLastName
      ? `Dr. ${params.clinicianLastName}`
      : "Your clinician";
    const subject = "You've been added to a practice on STEADY";
    const text = `Hi,

${doctor} has added you to their practice on STEADY. You already have an account — please sign in to accept:

${params.signupUrl}

If you don't recognize this request, you can ignore this email.

— The STEADY Team`;
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#2D2D2D">You've been added to a practice on STEADY</h2>
  <p>Hi,</p>
  <p>${escapeHtml(doctor)} has added you to their practice on STEADY. You already have an account — please sign in to accept:</p>
  <p><a href="${escapeHtmlAttr(params.signupUrl)}" style="display:inline-block;background:#5B8A8A;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px">Sign in to accept</a></p>
  <p style="color:#8A8A8A;font-size:14px">If you don't recognize this request, you can ignore this email.</p>
  <p style="color:#8A8A8A;font-size:14px">— The STEADY Team</p>
</body></html>`;
    return { subject, html, text };
  }

  // new-user variant
  const subject = "Your STEADY portal invitation";
  const text = `Welcome,

You've been invited to set up your STEADY portal account. Click the link below to get started:

${params.signupUrl}

This invitation expires in 7 days. If you didn't expect this email, you can ignore it.

— The STEADY Team`;
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#2D2D2D">Welcome to STEADY</h2>
  <p>You've been invited to set up your STEADY portal account. Click the button below to get started:</p>
  <p><a href="${escapeHtmlAttr(params.signupUrl)}" style="display:inline-block;background:#5B8A8A;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px">Set up your account</a></p>
  <p style="color:#8A8A8A;font-size:14px">This invitation expires in 7 days. If you didn't expect this email, you can ignore it.</p>
  <p style="color:#8A8A8A;font-size:14px">— The STEADY Team</p>
</body></html>`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s);
}

// ── Legacy shim — preserved until FR-12 deletes the legacy worker ─
// The old `sendInviteEmail(to, code)` signature is used by
// workers/invite-email.ts, which is slated for deletion in the same
// feature as this rewrite. Shim is left intentionally broken (logs
// a loud warning) so we catch any lingering callers.

export async function sendInviteEmail(
  _to: string,
  _code: string
): Promise<{ success: boolean; messageId?: string }> {
  logger.warn(
    "DEPRECATED: sendInviteEmail is legacy. " +
      "Use sendEmail() with the new portal invite template."
  );
  return { success: false };
}
