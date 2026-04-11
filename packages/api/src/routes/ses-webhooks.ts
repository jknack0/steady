import { Router } from "express";
import { prisma } from "@steady/db";
import crypto from "crypto";
import { logger } from "../lib/logger";
import {
  SES_BOUNCE_TOPIC_ARN,
  SES_COMPLAINT_TOPIC_ARN,
} from "../lib/env";
import { recordBounce, recordComplaint } from "../services/ses-circuit-breaker";

// ── SES/SNS webhook handlers (COND-23, FR-2) ────────────────────────
// Amazon SES publishes bounce + complaint notifications to SNS topics.
// SNS delivers via HTTPS POST to these endpoints. Authentication is
// via SNS message signature verification (not the shared internal key).
//
// Architect AD-8: skip authenticate middleware; enforce SNS signature
// verification via sns-validator, topic ARN allowlist, and auto-confirm
// SubscriptionConfirmation via the provided SubscribeURL.

const router = Router();

// Allowlist — only accept notifications from the configured topic ARNs.
// In dev/test SES_*_TOPIC_ARN may be empty, in which case the allowlist
// is disabled (the signature verification still applies).
function isAllowedTopic(topicArn: string | undefined): boolean {
  if (!topicArn) return false;
  const allowed = [SES_BOUNCE_TOPIC_ARN, SES_COMPLAINT_TOPIC_ARN].filter(
    Boolean
  );
  if (allowed.length === 0) {
    // No allowlist configured — accept any topic (dev/test)
    return true;
  }
  return allowed.includes(topicArn);
}

interface SnsMessage {
  Type: string;
  MessageId?: string;
  TopicArn?: string;
  Message?: string;
  Timestamp?: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
  SubscribeURL?: string;
  Token?: string;
}

/**
 * Verify the SNS message signature using the sns-validator library.
 * Lazy-imported so the file compiles even before the package is installed.
 */
async function verifySnsSignature(body: SnsMessage): Promise<boolean> {
  try {
    const { default: MessageValidator } = await import("sns-validator");
    const validator = new MessageValidator();
    return await new Promise<boolean>((resolve) => {
      validator.validate(body as never, (err) => {
        if (err) {
          logger.warn("SNS signature verification failed");
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  } catch (err) {
    logger.error("sns-validator unavailable", err);
    return false;
  }
}

/**
 * Parse the SNS message body. SNS can deliver either text/plain or
 * application/json content types; Express's express.json() middleware
 * handles the latter. For text/plain, we would need raw-body parsing.
 * Express default is JSON so we expect an object here.
 */
function parseBody(req: { body: unknown; headers: Record<string, string | string[] | undefined> }): SnsMessage | null {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as SnsMessage;
    } catch {
      return null;
    }
  }
  if (typeof req.body === "object" && req.body !== null) {
    return req.body as SnsMessage;
  }
  return null;
}

function hashEmailCanonical(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

/**
 * Auto-confirm an SNS subscription. Fetches the SubscribeURL to
 * complete the subscription handshake.
 */
async function confirmSubscription(subscribeUrl: string): Promise<void> {
  try {
    const res = await fetch(subscribeUrl);
    if (!res.ok) {
      logger.warn(
        `SNS SubscribeURL returned ${res.status}`,
        `url=${subscribeUrl.substring(0, 80)}...`
      );
    } else {
      logger.info("SNS subscription confirmed");
    }
  } catch (err) {
    logger.error("SNS SubscribeURL fetch failed", err);
  }
}

/**
 * POST /api/internal/ses-bounce
 *
 * Handles bounce notifications from SES via SNS. On hard bounce:
 * - adds the address to EmailSuppression permanently
 * - marks matching PortalInvitation rows as BOUNCED
 * - updates the circuit breaker
 *
 * Soft bounces get a 30-day suppression.
 */
router.post("/ses-bounce", async (req, res) => {
  const body = parseBody(req);
  if (!body) {
    res.status(400).json({ success: false, error: "Invalid body" });
    return;
  }

  // Signature verification
  if (!(await verifySnsSignature(body))) {
    res.status(403).json({ success: false, error: "Invalid SNS signature" });
    return;
  }

  // Topic allowlist
  if (body.TopicArn && !isAllowedTopic(body.TopicArn)) {
    res.status(403).json({ success: false, error: "Topic not allowed" });
    return;
  }

  // Handle subscription confirmation
  if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
    await confirmSubscription(body.SubscribeURL);
    res.json({ success: true });
    return;
  }

  if (body.Type !== "Notification" || !body.Message) {
    res.json({ success: true }); // idempotent
    return;
  }

  interface BounceNotification {
    notificationType?: string;
    bounce?: {
      bounceType?: string;
      bounceSubType?: string;
      bouncedRecipients?: Array<{ emailAddress?: string }>;
    };
  }

  let notification: BounceNotification;
  try {
    notification = JSON.parse(body.Message) as BounceNotification;
  } catch {
    res.status(400).json({ success: false, error: "Invalid notification body" });
    return;
  }

  if (notification.notificationType !== "Bounce" || !notification.bounce) {
    res.json({ success: true });
    return;
  }

  const bounceType = notification.bounce.bounceType ?? "Undetermined";
  const isHard = bounceType === "Permanent";
  const recipients = notification.bounce.bouncedRecipients ?? [];

  for (const recipient of recipients) {
    if (!recipient.emailAddress) continue;
    const email = recipient.emailAddress.toLowerCase().trim();
    const emailHash = hashEmailCanonical(email);
    // Hard bounce = permanent suppression; soft = 30d
    const expiresAt = isHard
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.emailSuppression.upsert({
        where: { emailHash },
        create: {
          emailHash,
          email,
          reason: "BOUNCE",
          bounceType,
          expiresAt,
        },
        update: {
          reason: "BOUNCE",
          bounceType,
          expiresAt,
          deletedAt: null,
        },
      });

      // Mark matching invitations as BOUNCED (AC-2.9)
      await tx.portalInvitation.updateMany({
        where: {
          recipientEmailHash: emailHash,
          status: { in: ["PENDING", "SENT"] },
          deletedAt: null,
        },
        data: {
          status: "BOUNCED",
          bounceType: isHard ? "hard" : "soft",
          bouncedAt: new Date(),
        },
      });
    });

    await recordBounce();
  }

  logger.info(
    "SES bounce processed",
    `count=${recipients.length} type=${bounceType}`
  );
  res.json({ success: true });
});

/**
 * POST /api/internal/ses-complaint
 *
 * Handles spam/abuse complaints from SES. Always permanent suppression —
 * a complaint damages our SES reputation and we must never re-send.
 */
router.post("/ses-complaint", async (req, res) => {
  const body = parseBody(req);
  if (!body) {
    res.status(400).json({ success: false, error: "Invalid body" });
    return;
  }

  if (!(await verifySnsSignature(body))) {
    res.status(403).json({ success: false, error: "Invalid SNS signature" });
    return;
  }

  if (body.TopicArn && !isAllowedTopic(body.TopicArn)) {
    res.status(403).json({ success: false, error: "Topic not allowed" });
    return;
  }

  if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
    await confirmSubscription(body.SubscribeURL);
    res.json({ success: true });
    return;
  }

  if (body.Type !== "Notification" || !body.Message) {
    res.json({ success: true });
    return;
  }

  interface ComplaintNotification {
    notificationType?: string;
    complaint?: {
      complainedRecipients?: Array<{ emailAddress?: string }>;
      complaintFeedbackType?: string;
    };
  }

  let notification: ComplaintNotification;
  try {
    notification = JSON.parse(body.Message) as ComplaintNotification;
  } catch {
    res.status(400).json({ success: false, error: "Invalid notification body" });
    return;
  }

  if (notification.notificationType !== "Complaint" || !notification.complaint) {
    res.json({ success: true });
    return;
  }

  const recipients = notification.complaint.complainedRecipients ?? [];

  for (const recipient of recipients) {
    if (!recipient.emailAddress) continue;
    const email = recipient.emailAddress.toLowerCase().trim();
    const emailHash = hashEmailCanonical(email);

    await prisma.$transaction(async (tx) => {
      await tx.emailSuppression.upsert({
        where: { emailHash },
        create: {
          emailHash,
          email,
          reason: "COMPLAINT",
        },
        update: {
          reason: "COMPLAINT",
          expiresAt: null, // never expires
          deletedAt: null,
        },
      });

      await tx.portalInvitation.updateMany({
        where: {
          recipientEmailHash: emailHash,
          status: { in: ["PENDING", "SENT"] },
          deletedAt: null,
        },
        data: {
          status: "COMPLAINED",
          bouncedAt: new Date(),
        },
      });
    });

    await recordComplaint();
  }

  logger.info("SES complaint processed", `count=${recipients.length}`);
  res.json({ success: true });
});

export default router;
