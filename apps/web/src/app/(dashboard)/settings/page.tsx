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
import { useStediConfig, useSetStediKey, useTestStediConnection } from "@/hooks/use-stedi-config";

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
  const { data: config, isLoading, isError } = useClinicianConfig();
  const saveConfig = useSaveClinicianConfig();
  const saveHomeworkLabelsMutation = useSaveHomeworkLabels();

  // Form state
  const [providerType, setProviderType] = useState("OTHER");
  const [primaryModality, setPrimaryModality] = useState("");
  const [practiceName, setPracticeName] = useState("");
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

  // Clear success indicator after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

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
    await Promise.all([
      saveConfig.mutateAsync({
        providerType,
        primaryModality: primaryModality || undefined,
        practiceName: practiceName || undefined,
        defaultTrackerPreset: defaultTrackerPreset || undefined,
        defaultAssessments:
          defaultAssessments.length > 0 ? defaultAssessments : undefined,
      }),
      saveHomeworkLabelsMutation.mutateAsync(homeworkLabels),
    ]);

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
            disabled={saveConfig.isPending}
          >
            {saveConfig.isPending ? (
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

          {saveConfig.isError && (
            <span className="text-sm text-destructive">
              Failed to save. Please try again.
            </span>
          )}

        </div>
      </div>
    </div>
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
      </CardContent>
    </Card>
  );
}
