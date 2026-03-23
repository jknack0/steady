"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MODULE_REGISTRY,
  MODULE_CATEGORIES,
  PROVIDER_PRESETS,
  getPresetsForProviderType,
  getModulesForCategory,
} from "@steady/shared";
import type { ProviderType, ModuleId, ModuleCategory } from "@steady/shared";
import type { ProviderPreset } from "@steady/shared";
import { useCreateConfigFromPreset, useSaveClinicianConfig } from "@/hooks/use-config";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Activity,
  BookOpen,
  PenLine,
  ClipboardCheck,
  Lightbulb,
  Pill,
  AlertTriangle,
  CheckSquare,
  Calendar,
  Headphones,
  GraduationCap,
  FileText,
  MessageSquareLock,
  Receipt,
  Stethoscope,
  Brain,
  HeartPulse,
  Sparkles,
  UserCog,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  BarChart3,
  MessageCircle,
  Wrench,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Icon maps ──────────────────────────────────────────────────────────────

const MODULE_ICONS: Record<string, React.ElementType> = {
  daily_tracker: Activity,
  homework: BookOpen,
  journal: PenLine,
  assessments: ClipboardCheck,
  strategy_cards: Lightbulb,
  medication_tracker: Pill,
  side_effects: AlertTriangle,
  todo_list: CheckSquare,
  calendar: Calendar,
  audio_resources: Headphones,
  program_modules: GraduationCap,
  pre_visit_summary: FileText,
  secure_messaging: MessageSquareLock,
  rtm_billing: Receipt,
};

const CATEGORY_ICONS: Record<ModuleCategory, React.ElementType> = {
  MONITORING: BarChart3,
  ENGAGEMENT: Sparkles,
  PRODUCTIVITY: Wrench,
  CLINICAL: HeartPulse,
  COMMUNICATION: MessageCircle,
  BILLING: DollarSign,
};

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  MONITORING: "Monitoring",
  ENGAGEMENT: "Engagement",
  PRODUCTIVITY: "Productivity",
  CLINICAL: "Clinical",
  COMMUNICATION: "Communication",
  BILLING: "Billing",
};

// ── Provider type config ───────────────────────────────────────────────────

interface ProviderOption {
  type: ProviderType;
  label: string;
  description: string;
  icon: React.ElementType;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    type: "THERAPIST",
    label: "Therapist / Counselor",
    description: "CBT, DBT, trauma-focused, and other therapeutic modalities",
    icon: Brain,
  },
  {
    type: "PSYCHOLOGIST",
    label: "Psychologist",
    description: "Assessment-driven treatment with outcome measurement",
    icon: ClipboardCheck,
  },
  {
    type: "PSYCHIATRIST",
    label: "Psychiatrist",
    description: "Medication management with symptom and side effect tracking",
    icon: Stethoscope,
  },
  {
    type: "PSYCH_NP",
    label: "Psychiatric NP",
    description: "Medication-focused care with monitoring tools",
    icon: HeartPulse,
  },
  {
    type: "COACH",
    label: "Coach",
    description: "Executive function coaching with productivity tools",
    icon: UserCog,
  },
  {
    type: "OTHER",
    label: "Other",
    description: "General configuration — customize to fit your practice",
    icon: HelpCircle,
  },
];

// ── Step components ────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
              step === currentStep
                ? "bg-primary text-primary-foreground"
                : step < currentStep
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {step < currentStep ? <Check className="h-4 w-4" /> : step}
          </div>
          {step < 3 && (
            <div
              className={cn(
                "h-0.5 w-12 transition-colors",
                step < currentStep ? "bg-primary/40" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ProviderTypeStep({
  onSelect,
}: {
  onSelect: (type: ProviderType) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to STEADY</h1>
        <p className="text-muted-foreground text-lg">
          What type of provider are you? This helps us recommend the best starting configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {PROVIDER_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              onClick={() => onSelect(option.type)}
              className="group text-left"
            >
              <Card className="h-full transition-all hover:border-primary hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{option.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{option.description}</CardDescription>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PresetStep({
  providerType,
  onSelect,
  onBack,
}: {
  providerType: ProviderType;
  onSelect: (presetId: string | null) => void;
  onBack: () => void;
}) {
  const presets = getPresetsForProviderType(providerType);
  // For "OTHER" or types with no specific presets, also include GENERAL
  const allPresets =
    presets.length === 0
      ? [PROVIDER_PRESETS.GENERAL]
      : presets;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Choose your starting template</h1>
        <p className="text-muted-foreground text-lg">
          Pick a preset that matches your practice style. You can customize everything in the next step.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {allPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className="group text-left"
          >
            <Card className="h-full transition-all hover:border-primary hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{preset.label}</CardTitle>
                <CardDescription>{preset.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {preset.enabledModules.map((moduleId) => {
                    const mod = MODULE_REGISTRY[moduleId as ModuleId];
                    if (!mod) return null;
                    return (
                      <Badge key={moduleId} variant="secondary" className="text-xs">
                        {mod.label}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </button>
        ))}

        {/* Custom option */}
        <button
          onClick={() => onSelect(null)}
          className="group text-left"
        >
          <Card className="h-full transition-all hover:border-primary hover:shadow-md border-dashed group-focus-visible:ring-2 group-focus-visible:ring-ring">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Custom</CardTitle>
              <CardDescription>Start from scratch and pick your own modules</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You will select which modules to enable in the next step.
              </p>
            </CardContent>
          </Card>
        </button>
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}

function ModulesStep({
  enabledModules,
  onToggle,
  onFinish,
  onBack,
  isSubmitting,
}: {
  enabledModules: Set<string>;
  onToggle: (moduleId: string) => void;
  onFinish: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Customize your modules</h1>
        <p className="text-muted-foreground text-lg">
          Toggle the features you want to use. You can always change these later in Settings.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {MODULE_CATEGORIES.map((category) => {
          const modules = getModulesForCategory(category);
          if (modules.length === 0) return null;
          const CategoryIcon = CATEGORY_ICONS[category];
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {CATEGORY_LABELS[category]}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modules.map((mod) => {
                  const ModIcon = MODULE_ICONS[mod.id] ?? Activity;
                  const isEnabled = enabledModules.has(mod.id);
                  return (
                    <Card
                      key={mod.id}
                      className={cn(
                        "transition-all",
                        isEnabled ? "border-primary/40 bg-primary/5" : ""
                      )}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                            isEnabled
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <ModIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{mod.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {mod.description}
                          </p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => onToggle(mod.id)}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 pt-4 pb-8">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onFinish} disabled={isSubmitting} className="gap-2 px-8">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              Finish Setup
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const createFromPreset = useCreateConfigFromPreset();
  const saveConfig = useSaveClinicianConfig();

  const [step, setStep] = useState(1);
  const [providerType, setProviderType] = useState<ProviderType | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());

  const handleProviderSelect = useCallback((type: ProviderType) => {
    setProviderType(type);
    setStep(2);
  }, []);

  const handlePresetSelect = useCallback(
    (presetId: string | null) => {
      setSelectedPresetId(presetId);

      if (presetId) {
        const preset = PROVIDER_PRESETS[presetId as keyof typeof PROVIDER_PRESETS];
        if (preset) {
          setEnabledModules(new Set(preset.enabledModules as unknown as string[]));
        }
      } else {
        setEnabledModules(new Set());
      }

      setStep(3);
    },
    []
  );

  const handleModuleToggle = useCallback((moduleId: string) => {
    setEnabledModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  const handleFinish = useCallback(async () => {
    try {
      if (selectedPresetId) {
        // Create from preset first
        await createFromPreset.mutateAsync(selectedPresetId);

        // Check if user toggled any modules differently from the preset
        const preset = PROVIDER_PRESETS[selectedPresetId as keyof typeof PROVIDER_PRESETS];
        if (preset) {
          const presetModules = new Set(preset.enabledModules as unknown as string[]);
          const hasOverrides =
            enabledModules.size !== presetModules.size ||
            [...enabledModules].some((m) => !presetModules.has(m)) ||
            [...presetModules].some((m) => !enabledModules.has(m));

          if (hasOverrides) {
            await saveConfig.mutateAsync({
              providerType: providerType!,
              enabledModules: [...enabledModules],
              dashboardLayout: [],
            });
          }
        }
      } else {
        // Custom config — save directly
        await saveConfig.mutateAsync({
          providerType: providerType!,
          enabledModules: [...enabledModules],
          dashboardLayout: [],
        });
      }

      await refreshUser();
      router.push("/programs");
    } catch {
      // Errors are handled by TanStack Query — mutation state shows error
    }
  }, [selectedPresetId, enabledModules, providerType, createFromPreset, saveConfig, refreshUser, router]);

  const isSubmitting = createFromPreset.isPending || saveConfig.isPending;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center py-12 px-4">
      <StepIndicator currentStep={step} />

      {step === 1 && <ProviderTypeStep onSelect={handleProviderSelect} />}

      {step === 2 && providerType && (
        <PresetStep
          providerType={providerType}
          onSelect={handlePresetSelect}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <ModulesStep
          enabledModules={enabledModules}
          onToggle={handleModuleToggle}
          onFinish={handleFinish}
          onBack={() => setStep(2)}
          isSubmitting={isSubmitting}
        />
      )}

      {(createFromPreset.isError || saveConfig.isError) && (
        <div className="mt-4 text-sm text-destructive text-center max-w-md">
          Something went wrong saving your configuration. Please try again.
        </div>
      )}
    </div>
  );
}
