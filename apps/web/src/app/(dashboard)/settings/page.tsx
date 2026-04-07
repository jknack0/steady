"use client";

import { useState, useEffect, useCallback } from "react";
import { useClinicianConfig, useSaveClinicianConfig, useSaveHomeworkLabels } from "@/hooks/use-config";
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
import { Check, Loader2, Plus, Trash2, RotateCcw, Eye, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StripeStatusBadge } from "@/components/billing/StripeStatusBadge";
import { useStediConfig, useSetStediKey, useTestStediConnection } from "@/hooks/use-stedi-config";
import { useBillingProfile, useSaveBillingProfile } from "@/hooks/use-rtm";
import type { SaveBillingProfileData } from "@/hooks/use-rtm";

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

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" }, { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" }, { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" }, { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "AS", label: "American Samoa" }, { value: "GU", label: "Guam" },
  { value: "MP", label: "Northern Mariana Islands" }, { value: "PR", label: "Puerto Rico" },
  { value: "VI", label: "U.S. Virgin Islands" },
] as const;

const PLACE_OF_SERVICE_OPTIONS = [
  { value: "02", label: "02 - Telehealth" },
  { value: "11", label: "11 - Office" },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
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

// ── Billing Profile Card ────────────────────────────────────────────────────

interface BillingProfileCardProps {
  form: SaveBillingProfileData;
  errors: Record<string, string>;
  showTaxId: boolean;
  onToggleTaxId: () => void;
  onFieldChange: (field: keyof SaveBillingProfileData, value: string) => void;
  isLoading: boolean;
  hasProfile: boolean;
}

function BillingProfileCard({
  form,
  errors,
  showTaxId,
  onToggleTaxId,
  onFieldChange,
  isLoading,
  hasProfile,
}: BillingProfileCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing Profile</CardTitle>
          <CardDescription>
            Required for generating superbills and insurance claims.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading billing profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Billing Profile</CardTitle>
        <CardDescription>
          Required for generating superbills and insurance claims.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasProfile && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Complete your billing profile to generate superbills for insurance billing.
            </p>
          </div>
        )}

        {/* Provider Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Provider Information</h4>

          <div className="space-y-2">
            <Label htmlFor="bp-providerName">Provider Name</Label>
            <Input
              id="bp-providerName"
              placeholder="Full legal name for billing"
              value={form.providerName}
              onChange={(e) => onFieldChange("providerName", e.target.value)}
              maxLength={200}
              className={errors.providerName ? "border-destructive" : ""}
            />
            {errors.providerName && (
              <p className="text-sm text-destructive">{errors.providerName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-credentials">Credentials</Label>
            <Input
              id="bp-credentials"
              placeholder='e.g., PhD, LCSW, MD'
              value={form.credentials}
              onChange={(e) => onFieldChange("credentials", e.target.value)}
              maxLength={50}
              className={errors.credentials ? "border-destructive" : ""}
            />
            {errors.credentials && (
              <p className="text-sm text-destructive">{errors.credentials}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-npiNumber">NPI Number</Label>
            <Input
              id="bp-npiNumber"
              placeholder="1234567890"
              value={form.npiNumber}
              onChange={(e) => onFieldChange("npiNumber", e.target.value)}
              maxLength={10}
              className={errors.npiNumber ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">10-digit National Provider Identifier</p>
            {errors.npiNumber && (
              <p className="text-sm text-destructive">{errors.npiNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-taxId">Tax ID (EIN/SSN)</Label>
            <div className="relative">
              <Input
                id="bp-taxId"
                type={showTaxId ? "text" : "password"}
                placeholder="123456789"
                value={form.taxId}
                onChange={(e) => onFieldChange("taxId", e.target.value)}
                maxLength={9}
                className={`pr-10 ${errors.taxId ? "border-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={onToggleTaxId}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showTaxId ? "Hide Tax ID" : "Show Tax ID"}
              >
                {showTaxId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">9 digits, no dashes</p>
            {errors.taxId && (
              <p className="text-sm text-destructive">{errors.taxId}</p>
            )}
          </div>
        </div>

        {/* Practice Address */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Practice Address</h4>

          <div className="space-y-2">
            <Label htmlFor="bp-practiceName">Practice Name</Label>
            <Input
              id="bp-practiceName"
              placeholder="Your practice name"
              value={form.practiceName}
              onChange={(e) => onFieldChange("practiceName", e.target.value)}
              maxLength={200}
              className={errors.practiceName ? "border-destructive" : ""}
            />
            {errors.practiceName && (
              <p className="text-sm text-destructive">{errors.practiceName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-practiceAddress">Street Address</Label>
            <Input
              id="bp-practiceAddress"
              placeholder="123 Main St"
              value={form.practiceAddress}
              onChange={(e) => onFieldChange("practiceAddress", e.target.value)}
              maxLength={500}
              className={errors.practiceAddress ? "border-destructive" : ""}
            />
            {errors.practiceAddress && (
              <p className="text-sm text-destructive">{errors.practiceAddress}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-practiceCity">City</Label>
            <Input
              id="bp-practiceCity"
              placeholder="Portland"
              value={form.practiceCity}
              onChange={(e) => onFieldChange("practiceCity", e.target.value)}
              maxLength={200}
              className={errors.practiceCity ? "border-destructive" : ""}
            />
            {errors.practiceCity && (
              <p className="text-sm text-destructive">{errors.practiceCity}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bp-practiceState">State</Label>
              <Select
                value={form.practiceState}
                onValueChange={(v) => onFieldChange("practiceState", v)}
              >
                <SelectTrigger
                  id="bp-practiceState"
                  className={errors.practiceState ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.practiceState && (
                <p className="text-sm text-destructive">{errors.practiceState}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bp-practiceZip">ZIP Code</Label>
              <Input
                id="bp-practiceZip"
                placeholder="12345 or 12345-6789"
                value={form.practiceZip}
                onChange={(e) => onFieldChange("practiceZip", e.target.value)}
                maxLength={10}
                className={errors.practiceZip ? "border-destructive" : ""}
              />
              {errors.practiceZip && (
                <p className="text-sm text-destructive">{errors.practiceZip}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-practicePhone">Phone Number</Label>
            <Input
              id="bp-practicePhone"
              placeholder="(503) 555-0123"
              value={form.practicePhone}
              onChange={(e) => onFieldChange("practicePhone", e.target.value)}
              maxLength={20}
              className={errors.practicePhone ? "border-destructive" : ""}
            />
            {errors.practicePhone && (
              <p className="text-sm text-destructive">{errors.practicePhone}</p>
            )}
          </div>
        </div>

        {/* Licensing */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Licensing</h4>

          <div className="space-y-2">
            <Label htmlFor="bp-licenseNumber">License Number</Label>
            <Input
              id="bp-licenseNumber"
              placeholder="C12345"
              value={form.licenseNumber}
              onChange={(e) => onFieldChange("licenseNumber", e.target.value)}
              maxLength={100}
              className={errors.licenseNumber ? "border-destructive" : ""}
            />
            {errors.licenseNumber && (
              <p className="text-sm text-destructive">{errors.licenseNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-licenseState">License State</Label>
            <Select
              value={form.licenseState}
              onValueChange={(v) => onFieldChange("licenseState", v)}
            >
              <SelectTrigger
                id="bp-licenseState"
                className={errors.licenseState ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.licenseState && (
              <p className="text-sm text-destructive">{errors.licenseState}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-placeOfService">Place of Service</Label>
            <Select
              value={form.placeOfServiceCode}
              onValueChange={(v) => onFieldChange("placeOfServiceCode", v)}
            >
              <SelectTrigger id="bp-placeOfService">
                <SelectValue placeholder="Select place of service" />
              </SelectTrigger>
              <SelectContent>
                {PLACE_OF_SERVICE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Stedi Config Card ───────────────────────────────────────────────────────

function StediConfigCard() {
  const { data: stediConfig, isLoading } = useStediConfig();
  const setKey = useSetStediKey();
  const testConnection = useTestStediConnection();

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const isConfigured = stediConfig?.configured;

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    try {
      await setKey.mutateAsync(apiKey.trim());
      setApiKey("");
      setShowKey(false);
      setSaveSuccess(true);
      setTestResult(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // mutation error handled by TanStack Query
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      await testConnection.mutateAsync();
      setTestResult({ ok: true, message: "Connection successful" });
    } catch {
      setTestResult({ ok: false, message: "Connection failed. Check your API key." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Integrations</CardTitle>
        <CardDescription>
          Connect external services for insurance billing and claims.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div>
          <Label className="text-sm font-medium">Stedi (Insurance / EDI)</Label>
          {isLoading ? (
            <div className="flex items-center gap-2 mt-1" aria-busy="true">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Checking...</span>
            </div>
          ) : isConfigured ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-sm">Connected</span>
              {stediConfig?.keyLastFour && (
                <span className="text-xs text-muted-foreground">
                  (key ····{stediConfig.keyLastFour})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              <span className="text-sm text-muted-foreground">Not configured</span>
            </div>
          )}
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <Label htmlFor="stediApiKey">
            {isConfigured ? "Update API Key" : "API Key"}
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="stediApiKey"
                type={showKey ? "text" : "password"}
                placeholder={isConfigured ? "Enter new key to update" : "Enter your Stedi API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                maxLength={500}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              onClick={handleSaveKey}
              disabled={!apiKey.trim() || setKey.isPending}
              size="sm"
            >
              {setKey.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" /> API key saved
            </span>
          )}
          {setKey.isError && (
            <span className="text-sm text-destructive">
              Failed to save API key. Please try again.
            </span>
          )}
        </div>

        {/* Test Connection */}
        {isConfigured && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testConnection.isPending}
            >
              {testConnection.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            {testResult && (
              <p className={`text-sm ${testResult.ok ? "text-green-600" : "text-destructive"}`}>
                {testResult.ok && <Check className="h-4 w-4 inline mr-1" />}
                {testResult.message}
              </p>
            )}
          </div>
        )}

        {/* Stripe Online Payments */}
        <div className="border-t pt-4 mt-4">
          <Label className="text-sm font-medium mb-2 block">Online Payments (Stripe)</Label>
          <StripeStatusBadge />
        </div>
      </CardContent>
    </Card>
  );
}
