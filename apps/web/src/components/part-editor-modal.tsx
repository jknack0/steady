"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Sparkles, PenLine, Smartphone } from "lucide-react";
import { PART_TYPE_CONFIG } from "@/components/part-card";
import { useGeneratePart } from "@/hooks/use-generate-part";
import { RNPartContentRenderer } from "@/components/mobile-preview/RNPartRenderers";
import { DEVICES } from "@/components/mobile-preview/devices";
import { DeviceFrame } from "@/components/mobile-preview/DeviceFrame";
import {
  TextPartEditor,
  VideoPartEditor,
  StrategyCardsPartEditor,
  JournalPromptPartEditor,
  ChecklistPartEditor,
  ResourceLinkPartEditor,
  DividerPartEditor,
  HomeworkPartEditor,
  AssessmentPartEditor,
  IntakeFormPartEditor,
  SmartGoalsPartEditor,
  StyledContentPartEditor,
  PdfPartEditor,
} from "@/components/part-editors";

// ── Default content per type ────────────────────────

const DEFAULT_CONTENT: Record<string, any> = {
  TEXT: { type: "TEXT", body: "", sections: [] },
  VIDEO: { type: "VIDEO", url: "", provider: "youtube" },
  STRATEGY_CARDS: { type: "STRATEGY_CARDS", deckName: "", cards: [] },
  JOURNAL_PROMPT: { type: "JOURNAL_PROMPT", prompts: [""], spaceSizeHint: "medium" },
  CHECKLIST: { type: "CHECKLIST", items: [{ text: "", sortOrder: 0 }] },
  RESOURCE_LINK: { type: "RESOURCE_LINK", url: "", description: "" },
  DIVIDER: { type: "DIVIDER", label: "" },
  HOMEWORK: {
    type: "HOMEWORK",
    dueTimingType: "BEFORE_NEXT_SESSION",
    dueTimingValue: null,
    completionRule: "ALL",
    completionMinimum: null,
    reminderCadence: "DAILY",
    items: [],
  },
  ASSESSMENT: { type: "ASSESSMENT", title: "", instructions: "", scoringEnabled: false, questions: [] },
  INTAKE_FORM: { type: "INTAKE_FORM", title: "", instructions: "", sections: ["General"], fields: [] },
  SMART_GOALS: { type: "SMART_GOALS", instructions: "", maxGoals: 3, categories: ["DAILY_ROUTINE", "WORK", "RELATIONSHIPS", "HEALTH", "SELF_CARE", "OTHER"], goals: [] },
  STYLED_CONTENT: { type: "STYLED_CONTENT", rawContent: "", styledHtml: "" },
  PDF: { type: "PDF", fileKey: "", url: "", fileName: "" },
};

export { DEFAULT_CONTENT };

// ── Type picker ─────────────────────────────────────

const CREATABLE_TYPES = [
  "STYLED_CONTENT",
  "VIDEO",
  "STRATEGY_CARDS",
  "JOURNAL_PROMPT",
  "CHECKLIST",
  "RESOURCE_LINK",
  "HOMEWORK",
  "ASSESSMENT",
  "INTAKE_FORM",
  "SMART_GOALS",
  "PDF",
  "DIVIDER",
];

const TYPE_DESCRIPTIONS: Record<string, string> = {
  TEXT: "Plain text content for reading",
  STYLED_CONTENT: "AI-styled rich content with themed formatting",
  VIDEO: "Embed a YouTube, Vimeo, or Loom video",
  STRATEGY_CARDS: "Swipeable deck of strategy/tip cards",
  JOURNAL_PROMPT: "Guided journal prompts with text entry",
  CHECKLIST: "Interactive checklist with progress tracking",
  RESOURCE_LINK: "Link to an external resource, file, or audio",
  DIVIDER: "Visual separator between content sections",
  HOMEWORK: "Structured homework with multiple item types",
  ASSESSMENT: "Questionnaire with likert, multiple choice, free text",
  INTAKE_FORM: "Multi-section intake form with various field types",
  SMART_GOALS: "Guided SMART goal setting worksheet",
  PDF: "Upload and display a PDF document",
};

const PLACEHOLDER_TITLES: Record<string, string> = {
  TEXT: "Introduction",
  STYLED_CONTENT: "Session Overview",
  VIDEO: "Breathing Exercise Video",
  STRATEGY_CARDS: "Coping Strategies",
  JOURNAL_PROMPT: "Weekly Reflection",
  CHECKLIST: "Pre-Session Checklist",
  RESOURCE_LINK: "Recommended Reading",
  DIVIDER: "Section Break",
  HOMEWORK: "Week 1 Homework",
  ASSESSMENT: "Anxiety Screening",
  INTAKE_FORM: "Client Background",
  SMART_GOALS: "Treatment Goals",
  PDF: "Handout",
};

// ── Content editor renderer ─────────────────────────

function ContentEditor({ type, content, onChange }: { type: string; content: any; onChange: (c: any) => void }) {
  switch (type) {
    case "TEXT": return <TextPartEditor content={content} onChange={onChange} />;
    case "VIDEO": return <VideoPartEditor content={content} onChange={onChange} />;
    case "STRATEGY_CARDS": return <StrategyCardsPartEditor content={content} onChange={onChange} />;
    case "JOURNAL_PROMPT": return <JournalPromptPartEditor content={content} onChange={onChange} />;
    case "CHECKLIST": return <ChecklistPartEditor content={content} onChange={onChange} />;
    case "RESOURCE_LINK": return <ResourceLinkPartEditor content={content} onChange={onChange} />;
    case "DIVIDER": return <DividerPartEditor content={content} onChange={onChange} />;
    case "HOMEWORK": return <HomeworkPartEditor content={content} onChange={onChange} />;
    case "ASSESSMENT": return <AssessmentPartEditor content={content} onChange={onChange} />;
    case "INTAKE_FORM": return <IntakeFormPartEditor content={content} onChange={onChange} />;
    case "SMART_GOALS": return <SmartGoalsPartEditor content={content} onChange={onChange} />;
    case "STYLED_CONTENT": return <StyledContentPartEditor content={content} onChange={onChange} />;
    case "PDF": return <PdfPartEditor content={content} onChange={onChange} />;
    default: return <p className="text-sm text-muted-foreground">Unknown part type</p>;
  }
}

// ── Inline Phone Preview ────────────────────────────

const previewDevice = DEVICES["iphone-se"];
const PREVIEW_SCALE = 0.55;
const bezel = 8;
const phoneW = previewDevice.width + bezel * 2;
const phoneH = previewDevice.height + bezel * 2;
const scaledW = Math.round(phoneW * PREVIEW_SCALE);
const scaledH = Math.round(phoneH * PREVIEW_SCALE);

function InlinePhonePreview({ type, title, content }: { type: string; title: string; content: any }) {
  return (
    <div className="flex justify-center">
      <div style={{ width: scaledW, height: scaledH, flexShrink: 0, overflow: "hidden" }}>
        <div style={{ width: phoneW, height: phoneH, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
          <DeviceFrame device={previewDevice}>
            <div className="bg-white px-4 py-3 border-b border-[#F0EDE8]">
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2D2D2D", fontFamily: "PlusJakartaSans_700Bold, system-ui, sans-serif" }}>
                {title || "Untitled"}
              </h3>
            </div>
            <RNPartContentRenderer part={{ type, content }} />
          </DeviceFrame>
        </div>
      </div>
    </div>
  );
}

// ── Create Part Modal ───────────────────────────────

interface CreatePartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { type: string; title: string; isRequired: boolean; content: any }) => Promise<void>;
  isPending: boolean;
}

// Types that support AI generation (excludes DIVIDER — too simple, and PDF — needs file upload)
const AI_GENERABLE_TYPES = new Set([
  "STYLED_CONTENT", "STRATEGY_CARDS", "JOURNAL_PROMPT", "CHECKLIST",
  "HOMEWORK", "ASSESSMENT", "INTAKE_FORM", "SMART_GOALS", "VIDEO", "RESOURCE_LINK",
]);

const AI_PLACEHOLDERS: Record<string, string> = {
  STYLED_CONTENT: "e.g., Explain the CBT model of anxiety. Cover the thought-feeling-behavior cycle, common thinking traps, and how to challenge automatic thoughts. Include a practical example.",
  STRATEGY_CARDS: "e.g., 5 grounding techniques for anxiety: 5-4-3-2-1 senses, cold water on wrists, box breathing, progressive muscle relaxation, counting backwards from 100 by 7s",
  JOURNAL_PROMPT: "e.g., Reflect on a time this week when you noticed an automatic thought. What was the situation? What did you think? How did it make you feel? What's an alternative perspective?",
  CHECKLIST: "e.g., Pre-session checklist: review last week's homework, complete mood tracker, write down 3 things to discuss, rate current anxiety 1-10, bring medication list",
  HOMEWORK: "e.g., Practice box breathing 5 min daily, journal about one trigger each day, review the cognitive distortions handout, track mood 3x daily using the app, try one new coping strategy from the strategy cards",
  ASSESSMENT: "e.g., Anxiety screening: rate worry frequency, physical symptoms (muscle tension, racing heart, trouble sleeping), avoidance behaviors, impact on work/relationships, current coping methods",
  INTAKE_FORM: "e.g., Client intake: demographics (name, age, pronouns), referral source, presenting concerns, mental health history, current medications, substance use, support system, treatment goals",
  SMART_GOALS: "e.g., Help the client set goals around daily routine management, medication adherence, and building a morning routine. Focus on ADHD-specific challenges.",
  VIDEO: "e.g., YouTube video about progressive muscle relaxation: https://youtube.com/watch?v=example",
  RESOURCE_LINK: "e.g., Link to the ADAA anxiety toolkit: https://adaa.org/understanding-anxiety",
};

export function CreatePartModal({ open, onOpenChange, onCreate, isPending }: CreatePartModalProps) {
  const [step, setStep] = useState<"type" | "editor">("type");
  const [mode, setMode] = useState<"ai" | "manual" | "preview">("ai");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [content, setContent] = useState<any>(null);
  const [rawInput, setRawInput] = useState("");
  const generatePart = useGeneratePart();

  const canUseAI = selectedType ? AI_GENERABLE_TYPES.has(selectedType) : false;

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    const config = PART_TYPE_CONFIG[type];
    setTitle(config?.label || type);
    setIsRequired(type !== "DIVIDER");
    setContent(DEFAULT_CONTENT[type]);
    setRawInput("");
    setMode(AI_GENERABLE_TYPES.has(type) ? "ai" : "manual");
    generatePart.reset();
    setStep("editor");
  };

  const handleGenerate = async () => {
    if (!selectedType || !rawInput.trim()) return;
    try {
      const result = await generatePart.mutateAsync({
        partType: selectedType,
        rawInput: rawInput.trim(),
      });
      setContent(result.content);
      if (result.title) setTitle(result.title);
      setMode("manual"); // Switch to manual to show + edit the generated content
    } catch {
      // Error shown via mutation state
    }
  };

  const handleCreate = async () => {
    if (!selectedType || !title.trim()) return;
    await onCreate({ type: selectedType, title: title.trim(), isRequired, content });
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("type");
      setSelectedType(null);
      setTitle("");
      setIsRequired(true);
      setContent(null);
      setRawInput("");
      setMode("ai");
      generatePart.reset();
    }, 200);
  };

  const config = selectedType ? PART_TYPE_CONFIG[selectedType] : null;
  const Icon = config?.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === "editor" ? "sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0" : "sm:max-w-lg"}>
        {step === "type" ? (
          <>
            <DialogHeader>
              <DialogTitle>Add Part</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
              {CREATABLE_TYPES.map((type) => {
                const tc = PART_TYPE_CONFIG[type];
                if (!tc) return null;
                const TIcon = tc.icon;
                return (
                  <button
                    key={type}
                    onClick={() => handleSelectType(type)}
                    className="flex flex-col items-center gap-1.5 rounded-lg border p-3 hover:shadow-md hover:border-primary/30 transition-all text-center"
                  >
                    <TIcon className={`h-5 w-5 ${tc.color}`} />
                    <span className="text-sm font-medium">{tc.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {TYPE_DESCRIPTIONS[type]}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="shrink-0 px-6 pt-6 pb-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep("type")}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {Icon && <Icon className={`h-5 w-5 ${config?.color}`} />}
                <DialogTitle>New {config?.label}</DialogTitle>
              </div>

              {/* Mode tabs */}
              <div className="flex border-b mt-3 -mx-6 px-6">
                {canUseAI && (
                  <button
                    type="button"
                    onClick={() => setMode("ai")}
                    className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                      mode === "ai"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate with AI
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    mode === "manual"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PenLine className="h-3.5 w-3.5" />
                  {canUseAI ? "Build Manually" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("preview")}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    mode === "preview"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Preview
                </button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
              {mode === "preview" ? (
                <InlinePhonePreview type={selectedType!} title={title} content={content} />
              ) : mode === "ai" && canUseAI ? (
                <>
                  {/* AI generation mode */}
                  <div className="space-y-2">
                    <Label>Describe what you want</Label>
                    <textarea
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder={AI_PLACEHOLDERS[selectedType!] || "Describe the content you want to create..."}
                      className="min-h-[160px] w-full rounded-md border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Write rough notes, bullet points, or a description. AI will generate the full structured {config?.label?.toLowerCase()}.
                    </p>
                  </div>

                  {generatePart.isError && (
                    <p className="text-sm text-destructive">Failed to generate. Try again or switch to manual.</p>
                  )}

                  <Button
                    onClick={handleGenerate}
                    disabled={generatePart.isPending || !rawInput.trim()}
                    className="w-full"
                  >
                    {generatePart.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating {config?.label}...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" />Generate {config?.label}</>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* Manual mode — title + required + editor */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="create-title">Title</Label>
                      <Input
                        id="create-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={PLACEHOLDER_TITLES[selectedType!] || "Part title"}
                        autoFocus={!canUseAI}
                      />
                    </div>
                    {selectedType !== "DIVIDER" && (
                      <button
                        type="button"
                        onClick={() => setIsRequired(!isRequired)}
                        className={`shrink-0 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                          isRequired
                            ? "bg-primary text-primary-foreground border-primary"
                            : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {isRequired ? "Required" : "Optional"}
                      </button>
                    )}
                  </div>

                  <Separator />

                  {content && (
                    <ContentEditor type={selectedType!} content={content} onChange={setContent} />
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {(mode === "manual" || mode === "preview") && (
              <div className="flex justify-end gap-2 border-t px-6 py-4 shrink-0">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!title.trim() || isPending}>
                  {isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                  ) : (
                    "Create Part"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Part Modal ─────────────────────────────────

interface EditPartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: { id: string; type: string; title: string; isRequired: boolean; content: any } | null;
  onSave: (data: { title?: string; isRequired?: boolean; content?: any }) => Promise<unknown>;
  onDelete: () => void;
  onDuplicate: () => void;
  onPreview?: () => void;
  saveStatus?: "idle" | "saving" | "saved" | "error";
}

export function EditPartModal({
  open,
  onOpenChange,
  part,
  onSave,
  onDelete,
  onDuplicate,
}: EditPartModalProps) {
  const [editMode, setEditMode] = useState<"edit" | "preview">("edit");
  const [title, setTitle] = useState(part?.title || "");
  const [isRequired, setIsRequired] = useState(part?.isRequired ?? true);
  const [content, setContent] = useState<any>(part?.content);
  const dirtyRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Sync when part changes
  useEffect(() => {
    if (part) {
      setTitle(part.title);
      setIsRequired(part.isRequired);
      setContent(part.content);
      dirtyRef.current = false;
      setEditMode("edit");
    }
  }, [part?.id]);

  const flushSave = useCallback(() => {
    if (!dirtyRef.current || !part) return;
    dirtyRef.current = false;
    setSaveStatus("saving");
    onSave({ title: title.trim() || part.title, isRequired, content })
      .then(() => {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      })
      .catch(() => setSaveStatus("idle"));
  }, [onSave, title, isRequired, content, part]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(flushSave, 1500);
  }, [flushSave]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleSave();
  };

  const handleRequiredToggle = () => {
    setIsRequired((prev) => {
      const next = !prev;
      dirtyRef.current = true;
      setTimeout(() => {
        onSave({ isRequired: next });
      }, 0);
      return next;
    });
  };

  const handleContentChange = (c: any) => {
    setContent(c);
    scheduleSave();
  };

  const handleClose = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (dirtyRef.current && part) {
      onSave({ title: title.trim() || part.title, isRequired, content });
    }
    onOpenChange(false);
  };

  if (!part) return null;

  const typeConfig = PART_TYPE_CONFIG[part.type] || PART_TYPE_CONFIG.TEXT;
  const Icon = typeConfig.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${typeConfig.color}`} />
              <DialogTitle className="text-base">{typeConfig.label}</DialogTitle>
              <span className="text-xs text-muted-foreground">
                {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onDuplicate}>Duplicate</Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => { onDelete(); onOpenChange(false); }}
              >
                Delete
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b mt-3 -mx-6 px-6">
            <button
              type="button"
              onClick={() => setEditMode("edit")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                editMode === "edit"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenLine className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setEditMode("preview")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                editMode === "preview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
          {editMode === "preview" ? (
            <InlinePhonePreview type={part.type} title={title} content={content} />
          ) : (
            <>
              {/* Title + Required */}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Part title"
                  />
                </div>
                {part.type !== "DIVIDER" && (
                  <button
                    type="button"
                    onClick={handleRequiredToggle}
                    className={`shrink-0 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                      isRequired
                        ? "bg-primary text-primary-foreground border-primary"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {isRequired ? "Required" : "Optional"}
                  </button>
                )}
              </div>

              <Separator />

              <ContentEditor type={part.type} content={content} onChange={handleContentChange} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t px-6 py-4 shrink-0">
          <Button onClick={handleClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
