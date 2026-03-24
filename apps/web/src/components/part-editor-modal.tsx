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
import { ArrowLeft, Loader2 } from "lucide-react";
import { PART_TYPE_CONFIG } from "@/components/part-card";
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

// ── Create Part Modal ───────────────────────────────

interface CreatePartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { type: string; title: string; isRequired: boolean; content: any }) => Promise<void>;
  isPending: boolean;
}

export function CreatePartModal({ open, onOpenChange, onCreate, isPending }: CreatePartModalProps) {
  const [step, setStep] = useState<"type" | "editor">("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [content, setContent] = useState<any>(null);

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    const config = PART_TYPE_CONFIG[type];
    setTitle(config?.label || type);
    setIsRequired(type !== "DIVIDER");
    setContent(DEFAULT_CONTENT[type]);
    setStep("editor");
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
            <DialogHeader className="shrink-0 px-6 pt-6">
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
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
              {/* Title + Required */}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="create-title">Title</Label>
                  <Input
                    id="create-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={PLACEHOLDER_TITLES[selectedType!] || "Part title"}
                    autoFocus
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

              {/* Part editor */}
              {content && (
                <ContentEditor type={selectedType!} content={content} onChange={setContent} />
              )}
            </div>

            {/* Footer */}
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
  onPreview,
}: EditPartModalProps) {
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
      // Save immediately for toggle
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
    // Flush pending save
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
        <DialogHeader className="shrink-0 px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${typeConfig.color}`} />
              <DialogTitle className="text-base">{typeConfig.label}</DialogTitle>
              <span className="text-xs text-muted-foreground">
                {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onPreview && (
                <Button variant="ghost" size="sm" onClick={onPreview}>Preview</Button>
              )}
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
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
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

          {/* Part editor */}
          <ContentEditor type={part.type} content={content} onChange={handleContentChange} />
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t px-6 py-4 shrink-0">
          <Button onClick={handleClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
