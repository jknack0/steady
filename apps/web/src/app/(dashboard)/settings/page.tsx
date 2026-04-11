"use client";

import { useState, useEffect, useCallback } from "react";
import { useClinicianConfig, useSaveClinicianConfig, useSaveHomeworkLabels } from "@/hooks/use-config";
import { usePageTitle } from "@/hooks/use-page-title";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HOMEWORK_TYPE_SYSTEM_LABELS,
} from "@steady/shared";
import type { HomeworkItemType } from "@steady/shared";
import { Check, Loader2, Plus, Trash2, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useBillingProfile, useSaveBillingProfile } from "@/hooks/use-rtm";
import type { SaveBillingProfileData } from "@/hooks/use-rtm";
import { BillingProfileCard } from "@/components/settings/BillingProfileCard";
import { StediConfigCard } from "@/components/settings/StediConfigCard";

// ── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_TYPES = [
  { value: "THERAPIST", label: "Therapist" },
  { value: "PSYCHIATRIST", label: "Psychiatrist" },
  { value: "PSYCHOLOGIST", label: "Psychologist" },
  { value: "COUNSELOR", label: "Counselor" },
  { value: "PSYCH_NP", label: "Psychiatric Nurse Practitioner" },
  { value: "COACH", label: "Coach" },
  { value: "OTHER", label: "Other" },
] as const;

const TRACKER_PRESETS = [
  { value: "mood_log", label: "Mood Log" },
  { value: "dbt_diary_card", label: "DBT Diary Card" },
  { value: "ocd_exposure_log", label: "OCD Exposure Log" },
  { value: "sleep_diary", label: "Sleep Diary" },
  { value: "craving_tracker", label: "Craving Tracker" },
  { value: "medication_adherence", label: "Medication Adherence" },
  { value: "integrated_psych", label: "Integrated Psychiatry" },
] as const;

// Normalize instrument IDs: "PHQ-9" -> "PHQ9", "GAD-7" -> "GAD7"
function normalizeInstrumentId(id: string): string {
  return id.replace(/-/g, "");
}

const ASSESSMENT_INSTRUMENTS = [
  { value: "PHQ9", label: "PHQ-9 (Depression)" },
  { value: "GAD7", label: "GAD-7 (Anxiety)" },
  { value: "PCL5", label: "PCL-5 (PTSD)" },
  { value: "YBOCS", label: "Y-BOCS (OCD)" },
  { value: "ISI", label: "ISI (Insomnia)" },
  { value: "AUDIT", label: "AUDIT (Alcohol)" },
  { value: "ASRS", label: "ASRS (ADHD)" },
  { value: "DAST", label: "DAST (Substance Use)" },
  { value: "DERS", label: "DERS (Emotion Regulation)" },
] as const;

const ASSESSMENT_FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Biweekly" },
  { value: "MONTHLY", label: "Monthly" },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  usePageTitle("Settings");
  const { data: config, isLoading, isError } = useClinicianConfig();
  const saveConfig = useSaveClinicianConfig();
  const saveHomeworkLabelsMutation = useSaveHomeworkLabels();
  const { data: billingProfile, isLoading: billingProfileLoading } = useBillingProfile();
  const saveBillingProfile = useSaveBillingProfile();

  // Form state
  const [providerType, setProviderType] = useState("OTHER");
  const [primaryModality, setPrimaryModality] = useState("");
  const [practiceName, setPracticeName] = useState("");

  // Billing profile form state
  const [billingForm, setBillingForm] = useState<SaveBillingProfileData>({
    providerName: "",
    credentials: "",
    npiNumber: "",
    taxId: "",
    practiceName: "",
    practiceAddress: "",
    practiceCity: "",
    practiceState: "",
    practiceZip: "",
    practicePhone: "",
    licenseNumber: "",
    licenseState: "",
    placeOfServiceCode: "02",
  });
  const [billingErrors, setBillingErrors] = useState<Record<string, string>>({});
  const [showTaxId, setShowTaxId] = useState(false);
  const [defaultTrackerPreset, setDefaultTrackerPreset] = useState("");
  const [defaultAssessments, setDefaultAssessments] = useState<
    Array<{ instrumentId: string; frequency: string }>
  >([]);
  const [homeworkLabels, setHomeworkLabels] = useState<Record<string, string>>({});

  // Save status
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Populate form when config loads
  useEffect(() => {
    if (config) {
      setProviderType(config.providerType || "OTHER");
      setPrimaryModality(config.primaryModality || "");
      setPracticeName(config.practiceName || "");
      setDefaultTrackerPreset(config.defaultTrackerPreset || "");
      setDefaultAssessments(
        (config.defaultAssessments || []).map((a: any) => ({
          ...a,
          instrumentId: normalizeInstrumentId(a.instrumentId),
        }))
      );
      setHomeworkLabels(config.homeworkLabels || {});
    }
  }, [config]);

  // Populate billing profile form when data loads
  useEffect(() => {
    if (billingProfile) {
      setBillingForm({
        providerName: billingProfile.providerName || "",
        credentials: billingProfile.credentials || "",
        npiNumber: billingProfile.npiNumber || "",
        taxId: billingProfile.taxId || "",
        practiceName: billingProfile.practiceName || "",
        practiceAddress: billingProfile.practiceAddress || "",
        practiceCity: billingProfile.practiceCity || "",
        practiceState: billingProfile.practiceState || "",
        practiceZip: billingProfile.practiceZip || "",
        practicePhone: billingProfile.practicePhone || "",
        licenseNumber: billingProfile.licenseNumber || "",
        licenseState: billingProfile.licenseState || "",
        placeOfServiceCode: billingProfile.placeOfServiceCode || "02",
      });
    }
  }, [billingProfile]);

  // Clear success indicator after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const updateBillingField = useCallback(
    (field: keyof SaveBillingProfileData, value: string) => {
      setBillingForm((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field when user edits
      setBillingErrors((prev) => {
        if (prev[field]) {
          const next = { ...prev };
          delete next[field];
          return next;
        }
        return prev;
      });
    },
    []
  );

  const validateBillingProfile = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};
    const requiredFields: Array<{ key: keyof SaveBillingProfileData; label: string }> = [
      { key: "providerName", label: "Provider Name" },
      { key: "credentials", label: "Credentials" },
      { key: "npiNumber", label: "NPI Number" },
      { key: "taxId", label: "Tax ID" },
      { key: "practiceName", label: "Practice Name" },
      { key: "practiceAddress", label: "Street Address" },
      { key: "practiceCity", label: "City" },
      { key: "practiceState", label: "State" },
      { key: "practiceZip", label: "ZIP Code" },
      { key: "practicePhone", label: "Phone Number" },
      { key: "licenseNumber", label: "License Number" },
      { key: "licenseState", label: "License State" },
    ];

    for (const { key, label } of requiredFields) {
      if (!billingForm[key]?.trim()) {
        errors[key] = `${label} is required`;
      }
    }

    // Format validations (only if field is non-empty)
    if (billingForm.npiNumber && !/^\d{10}$/.test(billingForm.npiNumber)) {
      errors.npiNumber = "NPI must be exactly 10 digits";
    }
    if (billingForm.taxId && !/^\d{9}$/.test(billingForm.taxId)) {
      errors.taxId = "Tax ID must be exactly 9 digits";
    }
    if (billingForm.practiceZip && !/^\d{5}(-\d{4})?$/.test(billingForm.practiceZip)) {
      errors.practiceZip = "Invalid ZIP code format";
    }

    return errors;
  }, [billingForm]);

  const isBillingFormPopulated = useCallback((): boolean => {
    return Object.entries(billingForm).some(
      ([key, value]) => key !== "placeOfServiceCode" && value.trim() !== ""
    );
  }, [billingForm]);

  const addAssessment = useCallback(() => {
    setDefaultAssessments((prev) => [
      ...prev,
      { instrumentId: "PHQ9", frequency: "MONTHLY" },
    ]);
  }, []);

  const removeAssessment = useCallback((index: number) => {
    setDefaultAssessments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateHomeworkLabel = useCallback(
    (type: string, value: string) => {
      setHomeworkLabels((prev) => {
        if (!value) {
          const next = { ...prev };
          delete next[type];
          return next;
        }
        return { ...prev, [type]: value };
      });
    },
    []
  );

  const resetHomeworkLabel = useCallback((type: string) => {
    setHomeworkLabels((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  }, []);

  const updateAssessment = useCallback(
    (index: number, field: "instrumentId" | "frequency", value: string) => {
      setDefaultAssessments((prev) =>
        prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
      );
    },
    []
  );

  const handleSave = async () => {
    // Validate billing profile if any field is populated
    if (isBillingFormPopulated()) {
      const errors = validateBillingProfile();
      if (Object.keys(errors).length > 0) {
        setBillingErrors(errors);
        return;
      }
    }

    const promises: Promise<unknown>[] = [
      saveConfig.mutateAsync({
        providerType,
        primaryModality: primaryModality || undefined,
        practiceName: practiceName || undefined,
        defaultTrackerPreset: defaultTrackerPreset || undefined,
        defaultAssessments:
          defaultAssessments.length > 0 ? defaultAssessments : undefined,
      }),
      saveHomeworkLabelsMutation.mutateAsync(homeworkLabels),
    ];

    // Only save billing profile if at least one field is populated
    if (isBillingFormPopulated()) {
      promises.push(saveBillingProfile.mutateAsync(billingForm));
    }

    await Promise.all(promises);
    setBillingErrors({});
    setSaveSuccess(true);
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Settings" subtitle="Practice configuration and preferences." />
        <LoadingState />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Settings" />
        <p className="text-destructive">
          Failed to load configuration. Please try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="Practice configuration and preferences." />


      <div className="space-y-6">
        {/* ── Provider Profile ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Provider Profile</CardTitle>
            <CardDescription>
              Your provider type, specialty, and practice information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="providerType">Provider Type</Label>
              <Select value={providerType} onValueChange={setProviderType}>
                <SelectTrigger id="providerType">
                  <SelectValue placeholder="Select provider type" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryModality">Primary Modality</Label>
              <Input
                id="primaryModality"
                placeholder="e.g., CBT, DBT, Medication Management"
                value={primaryModality}
                onChange={(e) => setPrimaryModality(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="practiceName">Practice Name</Label>
              <Input
                id="practiceName"
                placeholder="Your practice name"
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                maxLength={200}
              />
            </div>
          </CardContent>
        </Card>



        {/* ── Billing Profile ─────────────────────────────────── */}
        <BillingProfileCard
          form={billingForm}
          errors={billingErrors}
          showTaxId={showTaxId}
          onToggleTaxId={() => setShowTaxId((v) => !v)}
          onFieldChange={updateBillingField}
          isLoading={billingProfileLoading}
          hasProfile={!!billingProfile}
        />

        {/* ── Default Client Settings ────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Default Client Settings</CardTitle>
            <CardDescription>
              Defaults applied to new clients. You can override these per
              client.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="trackerPreset">Default Check-in Preset</Label>
              <Select
                value={defaultTrackerPreset}
                onValueChange={setDefaultTrackerPreset}
              >
                <SelectTrigger id="trackerPreset">
                  <SelectValue placeholder="Select a tracker preset" />
                </SelectTrigger>
                <SelectContent>
                  {TRACKER_PRESETS.map((tp) => (
                    <SelectItem key={tp.value} value={tp.value}>
                      {tp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Default Assessments</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAssessment}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {defaultAssessments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No default assessments configured. Click "Add" to set up
                  automatic assessments for new clients.
                </p>
              )}

              {defaultAssessments.map((assessment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2"
                >
                  <Select
                    value={assessment.instrumentId}
                    onValueChange={(v) =>
                      updateAssessment(index, "instrumentId", v)
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Instrument" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSESSMENT_INSTRUMENTS.map((ai) => (
                        <SelectItem key={ai.value} value={ai.value}>
                          {ai.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={assessment.frequency}
                    onValueChange={(v) =>
                      updateAssessment(index, "frequency", v)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSESSMENT_FREQUENCIES.map((af) => (
                        <SelectItem key={af.value} value={af.value}>
                          {af.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAssessment(index)}
                    aria-label="Remove assessment"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Homework Labels ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Homework Labels</CardTitle>
            <CardDescription>
              Customize the display names for homework item types. Leave blank to use the default.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(HOMEWORK_TYPE_SYSTEM_LABELS) as [HomeworkItemType, string][]).map(
              ([type, systemLabel]) => {
                const customValue = homeworkLabels[type] || "";
                const charCount = customValue.length;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-36 text-sm text-muted-foreground shrink-0">
                      {systemLabel}
                    </span>
                    <div className="relative flex-1">
                      <Input
                        value={customValue}
                        onChange={(e) => updateHomeworkLabel(type, e.target.value)}
                        placeholder={systemLabel}
                        maxLength={50}
                        className="pr-12"
                      />
                      {charCount >= 40 && (
                        <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {charCount}/50
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!customValue}
                      onClick={() => resetHomeworkLabel(type)}
                      aria-label={`Reset ${systemLabel} label`}
                    >
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              }
            )}
          </CardContent>
        </Card>

        {/* ── Integrations ────────────────────────────────────── */}
        <StediConfigCard />

        {/* ── Save Button ────────────────────────────────────── */}
        <div className="flex items-center gap-3 pb-8">
          <Button
            onClick={handleSave}
            disabled={saveConfig.isPending || saveBillingProfile.isPending}
          >
            {saveConfig.isPending || saveBillingProfile.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>

          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Settings saved
            </span>
          )}

          {(saveConfig.isError || saveBillingProfile.isError) && (
            <span className="text-sm text-destructive">
              Failed to save. Please try again.
            </span>
          )}

        </div>
      </div>
    </div>
  );
}
/* BillingProfileCard and StediConfigCard extracted to components/settings/ */
