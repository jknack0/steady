"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  useResendPortalInvitation,
  useRevokePortalInvitation,
  useRenewPortalInvitation,
  type PortalInvitationView,
  type PortalInvitationStatus,
} from "@/hooks/use-portal-invitations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Send,
  RefreshCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

// FR-10 / UX Flow 15 — Clinician-side invitation status card.
// Shows current state + contextual actions (resend / revoke / renew / new).

interface Props {
  invitation: PortalInvitationView;
  /** Called after a successful revoke so the parent can hide the card and
   *  show the "Invite to portal" button instead. */
  onRevoked?: () => void;
}

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_SEND_COUNT = 5;

const STATUS_LABEL: Record<PortalInvitationStatus, string> = {
  PENDING: "Pending",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  BOUNCED: "Delivery failed",
  COMPLAINED: "Marked as spam",
  SEND_FAILED: "Send failed",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

const STATUS_COLOR: Record<PortalInvitationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  SENT: "bg-blue-50 text-blue-800 border-blue-200",
  ACCEPTED: "bg-green-50 text-green-800 border-green-200",
  BOUNCED: "bg-red-50 text-red-800 border-red-200",
  COMPLAINED: "bg-red-50 text-red-800 border-red-200",
  SEND_FAILED: "bg-amber-50 text-amber-800 border-amber-200",
  EXPIRED: "bg-stone-100 text-stone-700 border-stone-200",
  REVOKED: "bg-stone-100 text-stone-600 border-stone-200",
};

export function InvitationStatusCard({ invitation, onRevoked }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);
  const resend = useResendPortalInvitation();
  const renew = useRenewPortalInvitation();
  const revoke = useRevokePortalInvitation();

  const resendCooldownRemaining = useMemo(() => {
    if (!invitation.lastSentAt) return 0;
    const last = new Date(invitation.lastSentAt).getTime();
    const remaining = last + RESEND_COOLDOWN_MS - Date.now();
    return Math.max(0, remaining);
  }, [invitation.lastSentAt]);

  const resendDisabledReason = useMemo<string | null>(() => {
    if (invitation.sendCount >= MAX_SEND_COUNT) {
      return "Maximum resends reached. Revoke and create a new invitation.";
    }
    if (resendCooldownRemaining > 0) {
      const minutes = Math.ceil(resendCooldownRemaining / 60000);
      return `Please wait ${minutes} minute${minutes === 1 ? "" : "s"} between resends.`;
    }
    return null;
  }, [invitation.sendCount, resendCooldownRemaining]);

  const canResend =
    (invitation.status === "PENDING" || invitation.status === "SENT") &&
    !resendDisabledReason;
  const canRenew =
    invitation.status === "EXPIRED" || invitation.status === "SEND_FAILED";
  const canRevoke = ["PENDING", "SENT", "SEND_FAILED"].includes(
    invitation.status
  );

  async function handleResend() {
    setActionError(null);
    try {
      await resend.mutateAsync(invitation.id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to resend invitation"
      );
    }
  }

  async function handleRenew() {
    setActionError(null);
    try {
      await renew.mutateAsync(invitation.id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to renew invitation"
      );
    }
  }

  async function handleRevoke() {
    setActionError(null);
    if (
      !window.confirm(
        "Are you sure you want to revoke this invitation? The client will no longer be able to use this link."
      )
    ) {
      return;
    }
    try {
      await revoke.mutateAsync(invitation.id);
      onRevoked?.();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to revoke invitation"
      );
    }
  }

  const statusBanner = getStatusBanner(invitation);
  const isPending = resend.isPending || renew.isPending || revoke.isPending;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-4 w-4 text-stone-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-800 truncate">
              Portal invitation
            </p>
            <p className="text-xs text-stone-500 truncate">
              {invitation.recipientEmail}
            </p>
          </div>
        </div>
        <Badge
          className={`${STATUS_COLOR[invitation.status]} border text-xs`}
          variant="outline"
        >
          {STATUS_LABEL[invitation.status]}
        </Badge>
      </div>

      <div className="space-y-1 text-xs text-stone-500 mb-3">
        <div className="flex items-center gap-1.5">
          <Send className="h-3 w-3" />
          <span>
            {invitation.sendCount} of {MAX_SEND_COUNT} sent
            {invitation.lastSentAt
              ? ` · last ${formatDistanceToNow(new Date(invitation.lastSentAt), { addSuffix: true })}`
              : ""}
          </span>
        </div>
        {!["ACCEPTED", "REVOKED"].includes(invitation.status) && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>
              Expires{" "}
              {formatDistanceToNow(new Date(invitation.expiresAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}
      </div>

      {statusBanner && (
        <div
          className={`p-2.5 rounded-lg border text-xs mb-3 flex items-start gap-2 ${statusBanner.className}`}
          role="status"
        >
          {statusBanner.icon}
          <span>{statusBanner.text}</span>
        </div>
      )}

      {actionError && (
        <div
          className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs mb-3"
          role="alert"
        >
          {actionError}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {canResend && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleResend}
            disabled={isPending}
            aria-busy={resend.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {resend.isPending ? "Resending..." : "Resend"}
          </Button>
        )}
        {resendDisabledReason &&
          (invitation.status === "PENDING" || invitation.status === "SENT") && (
            <Button size="sm" variant="outline" disabled title={resendDisabledReason}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Resend
            </Button>
          )}
        {canRenew && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRenew}
            disabled={isPending}
            aria-busy={renew.isPending}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {renew.isPending ? "Renewing..." : "Renew"}
          </Button>
        )}
        {canRevoke && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRevoke}
            disabled={isPending}
            aria-busy={revoke.isPending}
            className="text-red-700 hover:text-red-800 hover:bg-red-50"
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            {revoke.isPending ? "Revoking..." : "Revoke"}
          </Button>
        )}
      </div>

      {resendDisabledReason && (
        <p className="text-[11px] text-stone-500 mt-2">{resendDisabledReason}</p>
      )}
    </div>
  );
}

function getStatusBanner(inv: PortalInvitationView): {
  text: string;
  icon: React.ReactNode;
  className: string;
} | null {
  switch (inv.status) {
    case "ACCEPTED":
      return {
        text: inv.acceptedAt
          ? `Client accepted ${formatDistanceToNow(new Date(inv.acceptedAt), { addSuffix: true })}`
          : "Client accepted this invitation.",
        icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />,
        className: "bg-green-50 border-green-200 text-green-800",
      };
    case "BOUNCED":
      return {
        text: "Delivery failed. Verify the email with your client and create a new invitation.",
        icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0" />,
        className: "bg-red-50 border-red-200 text-red-800",
      };
    case "COMPLAINED":
      return {
        text: "Client marked this as spam. Use a different email address.",
        icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0" />,
        className: "bg-red-50 border-red-200 text-red-800",
      };
    case "SEND_FAILED":
      return {
        text: "Delivery failed. Try again or contact support.",
        icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0" />,
        className: "bg-amber-50 border-amber-200 text-amber-800",
      };
    case "EXPIRED":
      return {
        text: "This invitation has expired. Renew to send a fresh link.",
        icon: <Clock className="h-3.5 w-3.5 shrink-0" />,
        className: "bg-amber-50 border-amber-200 text-amber-800",
      };
    case "REVOKED":
      return {
        text: "This invitation was revoked.",
        icon: <XCircle className="h-3.5 w-3.5 shrink-0" />,
        className: "bg-stone-100 border-stone-200 text-stone-700",
      };
    case "PENDING":
      return {
        text: "Invitation created. The email will be sent shortly.",
        icon: <Clock className="h-3.5 w-3.5 shrink-0" />,
        className: "bg-amber-50 border-amber-200 text-amber-800",
      };
    default:
      return null;
  }
}
