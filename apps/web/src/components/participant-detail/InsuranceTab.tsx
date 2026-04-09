"use client";

import { useState } from "react";
import type { ParticipantDetail } from "@/hooks/use-clinician-participants";
import { useInsurance, useUpsertInsurance, useRemoveInsurance, useCheckEligibility } from "@/hooks/use-insurance";
import { usePayerSearch } from "@/hooks/use-payers";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/loading-state";
import { SavedCardsSection } from "@/components/billing/SavedCardsSection";
import {
  Loader2,
  CheckCircle2,
  Search,
  Plus,
  Shield,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface InsuranceTabProps {
  participantProfileId: string;
  demographics?: ParticipantDetail["demographics"];
}

export function InsuranceTab({ participantProfileId, demographics }: InsuranceTabProps) {
  const { data: insurance, isLoading } = useInsurance(participantProfileId);
  const upsertInsurance = useUpsertInsurance();
  const removeInsurance = useRemoveInsurance();
  const checkEligibility = useCheckEligibility();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const [editing, setEditing] = useState(false);
  const [payerSearch, setPayerSearch] = useState("");
  const { data: payers } = usePayerSearch(payerSearch);
  const [form, setForm] = useState({
    payerId: "",
    payerName: "",
    subscriberId: "",
    groupNumber: "",
    relationshipToSubscriber: "SELF" as string,
    policyHolderFirstName: "",
    policyHolderLastName: "",
    policyHolderDob: "",
    policyHolderGender: "",
  });

  const ins = insurance as any;

  const startEditing = (existing?: any) => {
    if (existing) {
      setForm({
        payerId: existing.payerId || "",
        payerName: existing.payerName || "",
        subscriberId: existing.subscriberId || "",
        groupNumber: existing.groupNumber || "",
        relationshipToSubscriber: existing.relationshipToSubscriber || "SELF",
        policyHolderFirstName: existing.policyHolderFirstName || "",
        policyHolderLastName: existing.policyHolderLastName || "",
        policyHolderDob: existing.policyHolderDob || "",
        policyHolderGender: existing.policyHolderGender || "",
      });
    } else {
      setForm({
        payerId: "", payerName: "", subscriberId: "", groupNumber: "",
        relationshipToSubscriber: "SELF", policyHolderFirstName: "",
        policyHolderLastName: "", policyHolderDob: "", policyHolderGender: "",
      });
    }
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertInsurance.mutateAsync({
      participantId: participantProfileId,
      data: {
        ...form,
        relationshipToSubscriber: form.relationshipToSubscriber as "SELF" | "SPOUSE" | "CHILD" | "OTHER",
        groupNumber: form.groupNumber || undefined,
        policyHolderFirstName: form.policyHolderFirstName || undefined,
        policyHolderLastName: form.policyHolderLastName || undefined,
        policyHolderDob: form.policyHolderDob || undefined,
        policyHolderGender: form.policyHolderGender || undefined,
      },
    });
    setEditing(false);
  };

  const handleRemove = () => {
    confirm({
      title: "Remove Insurance",
      description: "This will deactivate the insurance record for this client. Are you sure?",
      confirmLabel: "Remove",
      variant: "danger",
      onConfirm: () => removeInsurance.mutate(participantProfileId),
    });
  };

  const handleCheckEligibility = async () => {
    await checkEligibility.mutateAsync({ participantId: participantProfileId });
  };

  if (isLoading) {
    return <LoadingState />;
  }

  // No insurance on file -- show empty state or form
  if (!ins && !editing) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed py-12 text-center">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-2">No insurance on file for this client.</p>
          <Button variant="outline" onClick={() => startEditing()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Insurance
          </Button>
        </div>
        <SavedCardsSection participantId={participantProfileId} />
      </div>
    );
  }

  // Editing form
  if (editing) {
    return (
      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{ins ? "Edit" : "Add"} Insurance</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        </div>

        {/* Payer */}
        <div className="space-y-2">
          <Label>Insurance Payer</Label>
          <div className="relative">
            <Input
              placeholder="Search payers or enter name..."
              value={payerSearch || form.payerName}
              onChange={(e) => {
                setPayerSearch(e.target.value);
                setForm((f) => ({ ...f, payerName: e.target.value, payerId: "" }));
              }}
              onBlur={() => {
                if (payerSearch && !form.payerId) {
                  setForm((f) => ({ ...f, payerName: payerSearch }));
                  setPayerSearch("");
                }
              }}
            />
            {Array.isArray(payers) && payers.length > 0 && payerSearch.length >= 2 && (
              <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {(payers as any[]).map((p: any) => (
                  <button
                    key={p.payerId}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => {
                      setForm((f) => ({ ...f, payerId: p.payerId, payerName: p.payerName }));
                      setPayerSearch("");
                    }}
                  >
                    {p.payerName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Payer ID -- auto-filled from search or manual entry */}
        <div className="space-y-2">
          <Label>Payer ID {form.payerId && <span className="text-xs text-muted-foreground">(from search)</span>}</Label>
          <Input
            placeholder="e.g., 60054 (Aetna)"
            value={form.payerId}
            onChange={(e) => setForm((f) => ({ ...f, payerId: e.target.value }))}
          />
        </div>

        {/* Subscriber ID & Group */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subscriber / Member ID</Label>
            <Input
              required
              value={form.subscriberId}
              onChange={(e) => setForm((f) => ({ ...f, subscriberId: e.target.value }))}
              placeholder="e.g., ABC123456"
            />
          </div>
          <div className="space-y-2">
            <Label>Group Number (optional)</Label>
            <Input
              value={form.groupNumber}
              onChange={(e) => setForm((f) => ({ ...f, groupNumber: e.target.value }))}
              placeholder="e.g., GRP001"
            />
          </div>
        </div>

        {/* Relationship */}
        <div className="space-y-2">
          <Label>Relationship to Subscriber</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={form.relationshipToSubscriber}
            onChange={(e) => setForm((f) => ({ ...f, relationshipToSubscriber: e.target.value }))}
          >
            <option value="SELF">Self</option>
            <option value="SPOUSE">Spouse</option>
            <option value="CHILD">Child</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Policy holder fields (shown when not SELF) */}
        {form.relationshipToSubscriber !== "SELF" && (
          <div className="space-y-4 border-l-2 border-muted pl-4">
            <p className="text-sm font-medium text-muted-foreground">Policy Holder Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  required
                  value={form.policyHolderFirstName}
                  onChange={(e) => setForm((f) => ({ ...f, policyHolderFirstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  required
                  value={form.policyHolderLastName}
                  onChange={(e) => setForm((f) => ({ ...f, policyHolderLastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  required
                  value={form.policyHolderDob}
                  onChange={(e) => setForm((f) => ({ ...f, policyHolderDob: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.policyHolderGender}
                  onChange={(e) => setForm((f) => ({ ...f, policyHolderGender: e.target.value }))}
                >
                  <option value="">Select...</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="U">Unknown</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={(!form.payerId && !form.payerName) || !form.subscriberId || upsertInsurance.isPending}>
            {upsertInsurance.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Insurance
          </Button>
        </div>
      </form>
    );
  }

  // Display existing insurance
  const elig = ins.cachedEligibility as any;
  const eligCheckedAt = ins.eligibilityCheckedAt
    ? new Date(ins.eligibilityCheckedAt).toLocaleDateString()
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      {confirmDialog}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Insurance Information
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => startEditing(ins)}>Edit</Button>
          <Button variant="outline" size="sm" onClick={handleRemove} disabled={removeInsurance.isPending}>
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Payer</p>
            <p className="font-medium">{ins.payerName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Subscriber / Member ID</p>
            <p className="font-medium">{ins.subscriberId}</p>
          </div>
          {ins.groupNumber && (
            <div>
              <p className="text-muted-foreground">Group Number</p>
              <p className="font-medium">{ins.groupNumber}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Relationship</p>
            <p className="font-medium capitalize">{ins.relationshipToSubscriber.toLowerCase()}</p>
          </div>
        </div>

        {ins.relationshipToSubscriber !== "SELF" && (
          <div className="border-t pt-3 mt-3">
            <p className="text-xs text-muted-foreground mb-2">Policy Holder</p>
            <p className="text-sm font-medium">
              {ins.policyHolderFirstName} {ins.policyHolderLastName}
              {ins.policyHolderDob && ` — DOB: ${ins.policyHolderDob}`}
            </p>
          </div>
        )}
      </div>

      {/* Patient Demographics (CMS-1500 Box 3 & 5) -- read-only from profile */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Patient Demographics</h4>
          {(!demographics?.dateOfBirth || !demographics?.gender || !demographics?.addressStreet) && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Required for claims
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Date of Birth (Box 3)</p>
            <p className="font-medium">
              {demographics?.dateOfBirth
                ? new Date(demographics.dateOfBirth).toLocaleDateString()
                : <span className="text-amber-600 italic">Missing -- edit in Overview tab</span>}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Sex (Box 3)</p>
            <p className="font-medium">
              {demographics?.gender === "M" ? "Male" : demographics?.gender === "F" ? "Female" : demographics?.gender === "U" ? "Unknown" : <span className="text-amber-600 italic">Missing -- edit in Overview tab</span>}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Address (Box 5)</p>
            <p className="font-medium">
              {demographics?.addressStreet
                ? [demographics.addressStreet, [demographics.addressCity, demographics.addressState, demographics.addressZip].filter(Boolean).join(", ")].filter(Boolean).join(", ")
                : <span className="text-amber-600 italic">Missing -- edit in Overview tab</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Eligibility Section */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Eligibility</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckEligibility}
            disabled={checkEligibility.isPending}
          >
            {checkEligibility.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Check Eligibility
          </Button>
        </div>

        {eligCheckedAt ? (
          <div className="text-sm space-y-2">
            <p className="text-muted-foreground">Last checked: {eligCheckedAt}</p>
            {elig?.active !== undefined && (
              <div className="flex items-center gap-2">
                {elig.active ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 font-medium">Active Coverage</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-700 font-medium">Inactive / Not Found</span>
                  </>
                )}
              </div>
            )}
            {elig?.planName && (
              <p><span className="text-muted-foreground">Plan:</span> {elig.planName}</p>
            )}
            {elig?.copay !== undefined && (
              <p><span className="text-muted-foreground">Copay:</span> ${(elig.copay / 100).toFixed(2)}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Eligibility has not been checked yet.</p>
        )}
      </div>

      {/* Saved Payment Methods */}
      <SavedCardsSection participantId={participantProfileId} />
    </div>
  );
}
