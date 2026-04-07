"use client";

import { useState } from "react";
import { useClaim, useRefreshClaimStatus, useSubmitClaim } from "@/hooks/use-claims";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { ClaimStatusTimeline } from "@/components/claims/ClaimStatusTimeline";
import { ResubmitForm } from "@/components/claims/ResubmitForm";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  RotateCcw,
  Send,
} from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { showToast } from "@/hooks/use-toast";

/** Shape returned by GET /api/claims/:id */
interface ClaimDetail {
  id: string;
  status: string;
  serviceCode: string;
  servicePriceCents: number;
  placeOfServiceCode: string;
  dateOfService: string;
  diagnosisCodes: string[];
  submittedAt: string | null;
  respondedAt: string | null;
  rejectionReason: string | null;
  stediTransactionId: string | null;
  retryCount: number;
  participant: {
    id: string;
    user: { firstName: string; lastName: string };
  } | null;
  patientInsurance: {
    payerName: string;
  } | null;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedBy: string;
    reason: string | null;
    createdAt: string;
  }>;
}

const POS_LABELS: Record<string, string> = {
  "02": "Telehealth",
  "10": "Telehealth (Patient Home)",
  "11": "Office",
  "12": "Home",
  "22": "Outpatient Hospital",
};

interface ClaimDetailPanelProps {
  claimId: string | null;
  onClose: () => void;
}

export function ClaimDetailPanel({ claimId, onClose }: ClaimDetailPanelProps) {
  const { data, isLoading, error, refetch } = useClaim(claimId ?? undefined);
  const claim = data as ClaimDetail | undefined;
  const refreshStatus = useRefreshClaimStatus();
  const submitClaim = useSubmitClaim();
  const [showResubmitForm, setShowResubmitForm] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowResubmitForm(false);
      onClose();
    }
  };

  const panelContent = (() => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading claim details...</p>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive font-medium">Failed to load claim details</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  const participantName = claim.participant?.user
    ? `${claim.participant.user.firstName} ${claim.participant.user.lastName}`
    : "Unknown participant";

  const posLabel = POS_LABELS[claim.placeOfServiceCode] || claim.placeOfServiceCode;

  return (
    <div className="space-y-6">
      {/* Header */}
      <DialogHeader>
        <DialogTitle>Claim Detail</DialogTitle>
        <DialogDescription asChild>
          <div className="flex items-center justify-between pt-1">
            <span className="text-base font-medium text-foreground">{participantName}</span>
            <ClaimStatusBadge status={claim.status} />
          </div>
        </DialogDescription>
        {claim.patientInsurance?.payerName && (
          <p className="text-sm text-muted-foreground">{claim.patientInsurance.payerName}</p>
        )}
      </DialogHeader>

      {/* Status-specific banner */}
      <StatusBanner status={claim.status} rejectionReason={claim.rejectionReason} />

      {/* Claim Information Grid */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Claim Information
        </h3>
        <div className="rounded-lg border divide-y text-sm">
          <InfoRow label="Date of Service" value={formatDate(claim.dateOfService)} />
          <InfoRow
            label="Service Code"
            value={<span className="font-mono">{claim.serviceCode}</span>}
          />
          <InfoRow
            label="Charge Amount"
            value={formatMoney(claim.servicePriceCents / 100)}
          />
          <InfoRow
            label="Place of Service"
            value={`${claim.placeOfServiceCode} - ${posLabel}`}
          />
          <InfoRow
            label="Diagnosis Codes"
            value={
              <div className="flex flex-wrap gap-1">
                {(claim.diagnosisCodes as string[]).map((code: string) => (
                  <span
                    key={code}
                    className="inline-flex rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
                  >
                    {code}
                  </span>
                ))}
              </div>
            }
          />
          <InfoRow
            label="Submitted"
            value={
              claim.submittedAt ? (
                formatDate(claim.submittedAt)
              ) : (
                <span className="text-muted-foreground italic">Not yet submitted</span>
              )
            }
          />
          <InfoRow
            label="Payer Response"
            value={
              claim.respondedAt ? (
                formatDate(claim.respondedAt)
              ) : (
                <span className="text-muted-foreground">&mdash;</span>
              )
            }
          />
          {claim.stediTransactionId && (
            <InfoRow
              label="Stedi Txn"
              value={
                <span className="font-mono text-xs" title={claim.stediTransactionId}>
                  {claim.stediTransactionId.length > 20
                    ? `${claim.stediTransactionId.slice(0, 20)}...`
                    : claim.stediTransactionId}
                </span>
              }
            />
          )}
          {claim.retryCount > 0 && (
            <InfoRow label="Retry Count" value={String(claim.retryCount)} />
          )}
        </div>
      </div>

      {/* Status Timeline */}
      {claim.statusHistory && claim.statusHistory.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Claim History
          </h3>
          <ClaimStatusTimeline statusHistory={claim.statusHistory} />
        </div>
      )}

      {/* Action Buttons */}
      <ClaimActions
        status={claim.status}
        claimId={claimId!}
        claim={claim}
        refreshStatus={refreshStatus}
        submitClaim={submitClaim}
        showResubmitForm={showResubmitForm}
        onShowResubmitForm={() => setShowResubmitForm(true)}
        onHideResubmitForm={() => setShowResubmitForm(false)}
        onClose={onClose}
      />
    </div>
  );
  })();

  return (
    <Sheet open={!!claimId} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="overflow-y-auto w-full max-w-lg">
        {panelContent}
      </SheetContent>
    </Sheet>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-3 py-2.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right ml-4">{value}</span>
    </div>
  );
}

function StatusBanner({
  status,
  rejectionReason,
}: {
  status: string;
  rejectionReason: string | null;
}) {
  if (status === "REJECTED" && rejectionReason) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Rejection Reason</p>
            <p className="text-sm text-red-700 mt-0.5">{rejectionReason}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "DENIED") {
    return (
      <div className="rounded-lg border border-red-300 bg-red-100 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 text-red-800 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Claim Denied</p>
            <p className="text-sm text-red-800 mt-0.5">
              {rejectionReason || "This claim has been denied. Contact the payer for further information."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "PAID") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <div className="flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 font-medium">Payment received.</p>
        </div>
      </div>
    );
  }

  if (status === "DRAFT") {
    return (
      <div className="rounded-lg border bg-muted/50 p-3">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">This claim has not been submitted yet.</p>
        </div>
      </div>
    );
  }

  if (status === "SUBMITTED") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">Waiting for payer response.</p>
        </div>
      </div>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
          <p className="text-sm text-teal-700">Claim accepted by payer. Waiting for payment.</p>
        </div>
      </div>
    );
  }

  return null;
}

function ClaimActions({
  status,
  claimId,
  claim,
  refreshStatus,
  submitClaim,
  showResubmitForm,
  onShowResubmitForm,
  onHideResubmitForm,
  onClose,
}: {
  status: string;
  claimId: string;
  claim: any;
  refreshStatus: ReturnType<typeof useRefreshClaimStatus>;
  submitClaim: ReturnType<typeof useSubmitClaim>;
  showResubmitForm: boolean;
  onShowResubmitForm: () => void;
  onHideResubmitForm: () => void;
  onClose: () => void;
}) {
  // Submit to Payer for DRAFT
  if (status === "DRAFT") {
    const handleSubmit = async () => {
      try {
        await submitClaim.mutateAsync(claimId);
        showToast("Claim submitted to payer", "success");
      } catch (err: any) {
        showToast(err?.message || "Failed to submit claim", "error");
      }
    };

    return (
      <div className="pt-2">
        <Button
          onClick={handleSubmit}
          disabled={submitClaim.isPending}
          className="w-full"
          aria-label="Submit claim to payer"
        >
          {submitClaim.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit to Payer
            </>
          )}
        </Button>
      </div>
    );
  }

  // Check Status for SUBMITTED and ACCEPTED
  if (status === "SUBMITTED" || status === "ACCEPTED") {
    return (
      <div className="pt-2">
        <Button
          onClick={() => refreshStatus.mutate(claimId)}
          disabled={refreshStatus.isPending}
          className="w-full"
          aria-label="Check claim status"
        >
          {refreshStatus.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Status
            </>
          )}
        </Button>
      </div>
    );
  }

  // Resubmit for REJECTED
  if (status === "REJECTED") {
    if (showResubmitForm) {
      return (
        <div className="pt-2">
          <ResubmitForm
            claimId={claimId}
            currentDiagnosisCodes={claim.diagnosisCodes || []}
            currentServiceCode={claim.serviceCode || ""}
            onCancel={onHideResubmitForm}
            onSuccess={() => {
              onHideResubmitForm();
            }}
          />
        </div>
      );
    }

    return (
      <div className="pt-2">
        <Button
          onClick={onShowResubmitForm}
          variant="default"
          className="w-full"
          aria-label="Resubmit claim with corrections"
        >
          Resubmit with Corrections
        </Button>
      </div>
    );
  }

  // No actions for DENIED, PAID (terminal states)
  return null;
}
