import { logger } from "../lib/logger";

interface EmailResult {
  success: boolean;
  messageId?: string;
}

/**
 * Send an invitation email to a patient.
 * Checks ENABLE_INVITE_EMAIL env var — if not "true", logs warning and returns failure.
 * COND-3: Hardcoded template, no clinician input in email body.
 * COND-6: Never logs the invite code.
 */
export async function sendInviteEmail(to: string, code: string): Promise<EmailResult> {
  if (process.env.ENABLE_INVITE_EMAIL !== "true") {
    logger.warn("Invite email not sent — ENABLE_INVITE_EMAIL is not enabled");
    return { success: false };
  }

  // Hardcoded PHI-free template (COND-3)
  const _subject = "You've been invited to Steady";
  const _body = `Your clinician has invited you to Steady, an app to support your treatment. Download the app and enter your code: ${code}.`;

  // TODO: Integrate with SendGrid when @sendgrid/mail is installed
  // For now, simulate success when the feature flag is on
  logger.info("Invite email queued");

  return { success: true, messageId: `mock-${Date.now()}` };
}
