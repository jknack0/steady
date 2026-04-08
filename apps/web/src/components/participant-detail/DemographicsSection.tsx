"use client";

import { useState } from "react";
import { useUpdateDemographics, type ParticipantDetail } from "@/hooks/use-clinician-participants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ClipboardList } from "lucide-react";
import { US_STATE_CODES } from "@/lib/billing-constants";

const US_STATES = US_STATE_CODES;

interface DemographicsSectionProps {
  demographics?: ParticipantDetail["demographics"];
  participantId: string;
}

export function DemographicsSection({
  demographics,
  participantId,
}: DemographicsSectionProps) {
  const [editing, setEditing] = useState(false);
  const updateDemographics = useUpdateDemographics(participantId);
  const [form, setForm] = useState({
    dateOfBirth: "",
    gender: "",
    addressStreet: "",
    addressCity: "",
    addressState: "",
    addressZip: "",
  });

  const startEditing = () => {
    setForm({
      dateOfBirth: demographics?.dateOfBirth
        ? new Date(demographics.dateOfBirth).toISOString().split("T")[0]
        : "",
      gender: demographics?.gender || "",
      addressStreet: demographics?.addressStreet || "",
      addressCity: demographics?.addressCity || "",
      addressState: demographics?.addressState || "",
      addressZip: demographics?.addressZip || "",
    });
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateDemographics.mutateAsync({
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
      addressStreet: form.addressStreet || null,
      addressCity: form.addressCity || null,
      addressState: form.addressState || null,
      addressZip: form.addressZip || null,
    });
    setEditing(false);
  };

  const hasDemographics =
    demographics?.dateOfBirth ||
    demographics?.gender ||
    demographics?.addressStreet;

  const genderLabel = (g: string | null | undefined) => {
    if (g === "M") return "Male";
    if (g === "F") return "Female";
    if (g === "U") return "Unknown";
    return null;
  };

  if (editing) {
    return (
      <form onSubmit={handleSave} className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Patient Demographics
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Date of Birth</Label>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sex</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            >
              <option value="">Select...</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="U">Unknown</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Street Address</Label>
          <Input
            value={form.addressStreet}
            onChange={(e) => setForm((f) => ({ ...f, addressStreet: e.target.value }))}
            placeholder="123 Main St"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">City</Label>
            <Input
              value={form.addressCity}
              onChange={(e) => setForm((f) => ({ ...f, addressCity: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">State</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={form.addressState}
              onChange={(e) => setForm((f) => ({ ...f, addressState: e.target.value }))}
            >
              <option value="">Select...</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ZIP Code</Label>
            <Input
              value={form.addressZip}
              onChange={(e) => setForm((f) => ({ ...f, addressZip: e.target.value }))}
              placeholder="12345"
              maxLength={10}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={updateDemographics.isPending}>
            {updateDemographics.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Patient Demographics
        </h3>
        <Button variant="ghost" size="sm" onClick={startEditing}>
          {hasDemographics ? "Edit" : "Add"}
        </Button>
      </div>

      {hasDemographics ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Date of Birth</p>
            <p className="font-medium">
              {demographics?.dateOfBirth
                ? new Date(demographics.dateOfBirth).toLocaleDateString()
                : <span className="text-muted-foreground italic">Not set</span>}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Sex</p>
            <p className="font-medium">
              {genderLabel(demographics?.gender) || <span className="text-muted-foreground italic">Not set</span>}
            </p>
          </div>
          {(demographics?.addressStreet || demographics?.addressCity) && (
            <div className="col-span-2 mt-1">
              <p className="text-muted-foreground text-xs">Address</p>
              <p className="font-medium">
                {[demographics?.addressStreet, [demographics?.addressCity, demographics?.addressState, demographics?.addressZip].filter(Boolean).join(", ")].filter(Boolean).join(", ")}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No demographics on file. Required for insurance billing (CMS-1500).
        </p>
      )}
    </div>
  );
}
