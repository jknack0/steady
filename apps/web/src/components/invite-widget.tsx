"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteStatusBadge } from "@/components/invite-status-badge";
import { InvitePatientModal } from "@/components/invite-patient-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useResendInvitation,
  useRevokeInvitation,
  type Invitation,
} from "@/hooks/use-invitations";
import { showToast } from "@/hooks/use-toast";
import { Copy, Check, Loader2, Mail, XCircle, Send } from "lucide-react";

interface InviteWidgetProps {
  invitation: Invitation;
  onRefresh?: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysRemaining(expiresAt: string): number {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function InviteWidget({ invitation, onRefresh }: InviteWidgetProps) {
  const [copied, setCopied] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [newInviteOpen, setNewInviteOpen] = useState(false);

  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(invitation.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  function handleResend() {
    resend.mutate(invitation.id, {
      onSuccess: () => {
        showToast("Email resent", "success");
        onRefresh?.();
      },
      onError: () => {
        showToast("Failed to send email. Try again.", "error");
      },
    });
  }

  function handleRevoke() {
    revoke.mutate(invitation.id, {
      onSuccess: () => {
        showToast("Invitation revoked", "success");
        onRefresh?.();
      },
      onError: () => {
        showToast("Failed to revoke. Try again.", "error");
      },
    });
  }

  const isPending = invitation.status === "PENDING";
  const isAccepted = invitation.status === "ACCEPTED";
  const isExpired = invitation.status === "EXPIRED";
  const isRevoked = invitation.status === "REVOKED";

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Invitation</CardTitle>
            <InviteStatusBadge status={invitation.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Invite code + copy (pending only) */}
          {isPending && (
            <div className="flex items-center gap-2">
              <code className="text-lg font-mono font-bold tracking-widest select-all">
                {invitation.code}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                aria-label="Copy invite code"
                className="gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Date info */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Invited {formatDate(invitation.createdAt)}</p>

            {isPending && (
              <>
                <p>
                  Expires {formatDate(invitation.expiresAt)} ({daysRemaining(invitation.expiresAt)} days remaining)
                </p>
                {invitation.emailSendCount > 0 && (
                  <p>
                    Email sent {invitation.emailSendCount} time{invitation.emailSendCount !== 1 ? "s" : ""}
                  </p>
                )}
              </>
            )}

            {isAccepted && invitation.acceptedAt && (
              <p>Joined {formatDate(invitation.acceptedAt)}</p>
            )}

            {isAccepted && invitation.program && (
              <p>Program: {invitation.program.title}</p>
            )}

            {isExpired && (
              <p>Expired {formatDate(invitation.expiresAt)}</p>
            )}

            {isRevoked && invitation.revokedAt && (
              <p>Revoked {formatDate(invitation.revokedAt)}</p>
            )}
          </div>

          {/* Actions */}
          {isPending && (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={resend.isPending}
                className="gap-1.5"
              >
                {resend.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                Resend Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevokeOpen(true)}
                disabled={revoke.isPending}
                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {revoke.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                Revoke Invite
              </Button>
            </div>
          )}

          {(isExpired || isRevoked) && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewInviteOpen(true)}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Send New Invite
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke confirmation */}
      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke Invitation"
        description="Revoke this invitation? The code will stop working."
        confirmLabel="Revoke"
        variant="danger"
        onConfirm={handleRevoke}
      />

      {/* New invite modal (pre-filled) */}
      <InvitePatientModal
        open={newInviteOpen}
        onOpenChange={setNewInviteOpen}
        onSuccess={onRefresh}
        prefillName={invitation.patientName}
        prefillEmail={invitation.patientEmail}
      />
    </>
  );
}
