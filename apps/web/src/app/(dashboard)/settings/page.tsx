"use client";

import { useState, useEffect, useCallback } from "react";
import { useClinicianConfig, useSaveClinicianConfig } from "@/hooks/use-config";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  MODULE_REGISTRY,
  MODULE_CATEGORIES,
  getModulesForCategory,
} from "@steady/shared";
import type { ModuleId, ModuleCategory } from "@steady/shared";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";

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

const CATEGORY_LABELS: Record<string, string> = {
  MONITORING: "Monitoring",
  ENGAGEMENT: "Engagement",
  PRODUCTIVITY: "Productivity",
  CLINICAL: "Clinical",
  COMMUNICATION: "Communication",
  BILLING: "Billing",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: config, isLoading, isError } = useClinicianConfig();
  const saveConfig = useSaveClinicianConfig();

  // Form state
  const [providerType, setProviderType] = useState("OTHER");
  const [primaryModality, setPrimaryModality] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [defaultTrackerPreset, setDefaultTrackerPreset] = useState("");
  const [defaultAssessments, setDefaultAssessments] = useState<
    Array<{ instrumentId: string; frequency: string }>
  >([]);

  // Save status
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Populate form when config loads
  useEffect(() => {
    if (config) {
      setProviderType(config.providerType || "OTHER");
      setPrimaryModality(config.primaryModality || "");
      setPracticeName(config.practiceName || "");
      setEnabledModules(config.enabledModules || []);
      setDefaultTrackerPreset(config.defaultTrackerPreset || "");
      setDefaultAssessments(
        (config.defaultAssessments || []).map((a: any) => ({
          ...a,
          instrumentId: normalizeInstrumentId(a.instrumentId),
        }))
      );
    }
  }, [config]);

  // Clear success indicator after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const toggleModule = useCallback((moduleId: string) => {
    setEnabledModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  }, []);

  const addAssessment = useCallback(() => {
    setDefaultAssessments((prev) => [
      ...prev,
      { instrumentId: "PHQ9", frequency: "MONTHLY" },
    ]);
  }, []);

  const removeAssessment = useCallback((index: number) => {
    setDefaultAssessments((prev) => prev.filter((_, i) => i !== index));
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
    // Build dashboard layout from enabled modules that have dashboardWidget
    const dashboardLayout = enabledModules
      .filter((id) => {
        const mod = MODULE_REGISTRY[id as ModuleId];
        return mod?.dashboardWidget;
      })
      .map((widgetId) => ({ widgetId, visible: true }));

    await saveConfig.mutateAsync({
      providerType,
      primaryModality: primaryModality || undefined,
      practiceName: practiceName || undefined,
      enabledModules,
      dashboardLayout,
      defaultTrackerPreset: defaultTrackerPreset || undefined,
      defaultAssessments:
        defaultAssessments.length > 0 ? defaultAssessments : undefined,
    });

    setSaveSuccess(true);
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">
          Practice configuration and preferences.
        </p>
        <LoadingState />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-destructive">
          Failed to load configuration. Please try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Practice configuration and preferences.
      </p>

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

        {/* ── Enabled Modules ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enabled Modules</CardTitle>
            <CardDescription>
              Choose which modules are available for your clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {MODULE_CATEGORIES.map((category) => {
              const modules = getModulesForCategory(category as ModuleCategory);
              if (modules.length === 0) return null;

              return (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {CATEGORY_LABELS[category] || category}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {modules.map((mod) => {
                      const isEnabled = enabledModules.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleModule(mod.id)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleModule(mod.id); } }}
                          className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                            isEnabled
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <Checkbox
                            checked={isEnabled}
                            onCheckedChange={() => toggleModule(mod.id)}
                            className="mt-0.5"
                            aria-label={`Toggle ${mod.label}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">
                              {mod.label}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {mod.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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

        {/* ── Save Button ────────────────────────────────────── */}
        <div className="flex items-center gap-3 pb-8">
          <Button
            onClick={handleSave}
            disabled={saveConfig.isPending || enabledModules.length === 0}
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

          {enabledModules.length === 0 && (
            <span className="text-sm text-muted-foreground">
              Enable at least one module to save.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
