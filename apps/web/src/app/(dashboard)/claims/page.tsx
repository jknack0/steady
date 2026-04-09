"use client";

import { useState } from "react";
import { useClaims, useRefreshClaimStatus, useResubmitClaim, useSubmitClaim } from "@/hooks/use-claims";
import { usePageTitle } from "@/hooks/use-page-title";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { ClaimDetailPanel } from "@/components/claims/ClaimDetailPanel";
import { NewClaimFlow } from "@/components/claims/NewClaimFlow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { FileText, RefreshCw, Loader2, Plus, Send } from "lucide-react";
import { showToast } from "@/hooks/use-toast";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "REJECTED", label: "Rejected" },
  { key: "DENIED", label: "Denied" },
  { key: "PAID", label: "Paid" },
];

export default function ClaimsPage() {
  usePageTitle("Claims");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showNewClaim, setShowNewClaim] = useState(false);
  const effectiveFilter = statusFilter === "all" ? undefined : statusFilter;
  const { claims, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useClaims(
    effectiveFilter ? { status: effectiveFilter } : undefined,
  );
  const refreshStatus = useRefreshClaimStatus();
  const resubmitClaim = useResubmitClaim();
  const submitClaim = useSubmitClaim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claims</h1>
          <p className="text-sm text-muted-foreground">
            Manage insurance claims submitted via Stedi
          </p>
        </div>
        <Button onClick={() => setShowNewClaim(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Claim
        </Button>
      </div>

      {/* Status filter tabs */}
      <Tabs
        tabs={STATUS_TABS}
        active={statusFilter}
        onChange={setStatusFilter}
      />

      {/* Claims list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : claims.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No claims yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;New Claim&quot; to create your first insurance claim.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Participant</th>
                    <th className="px-4 py-3 text-left font-medium">Date of Service</th>
                    <th className="px-4 py-3 text-left font-medium">CPT</th>
                    <th className="px-4 py-3 text-left font-medium">Payer</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim: any) => (
                    <tr
                      key={claim.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() =>
                        setSelectedClaimId(selectedClaimId === claim.id ? null : claim.id)
                      }
                    >
                      <td className="px-4 py-3 font-medium">
                        {claim.participant?.user?.firstName}{" "}
                        {claim.participant?.user?.lastName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(claim.dateOfService).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{claim.serviceCode}</td>
                      <td className="px-4 py-3">{claim.patientInsurance?.payerName}</td>
                      <td className="px-4 py-3 text-right">
                        ${(claim.servicePriceCents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <ClaimStatusBadge status={claim.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {claim.status === "DRAFT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                submitClaim.mutate(claim.id, {
                                  onSuccess: () => showToast("Claim submitted to payer", "success"),
                                  onError: (err) => showToast(err?.message || "Failed to submit", "error"),
                                });
                              }}
                              disabled={submitClaim.isPending}
                            >
                              <Send className="h-3.5 w-3.5 mr-1" />
                              Submit
                            </Button>
                          )}
                          {(claim.status === "SUBMITTED" || claim.status === "ACCEPTED") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                refreshStatus.mutate(claim.id);
                              }}
                              disabled={refreshStatus.isPending}
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                              Check
                            </Button>
                          )}
                          {claim.status === "REJECTED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClaimId(claim.id);
                              }}
                            >
                              Edit & Resubmit
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          {hasNextPage && (
            <div className="flex justify-center p-4 border-t">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* New Claim Dialog */}
      <NewClaimFlow open={showNewClaim} onOpenChange={setShowNewClaim} />

      {/* Claim Detail Slide-Over Panel */}
      <ClaimDetailPanel
        claimId={selectedClaimId}
        onClose={() => setSelectedClaimId(null)}
      />
    </div>
  );
}
