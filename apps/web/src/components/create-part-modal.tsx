"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PART_TYPE_CONFIG } from "@/components/part-card";

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

interface CreatePartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { type: string; title: string; isRequired: boolean; content: any }) => Promise<void>;
  isPending: boolean;
}

export function CreatePartModal({ open, onOpenChange, onCreate, isPending }: CreatePartModalProps) {
  const [step, setStep] = useState<"type" | "details">("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [isRequired, setIsRequired] = useState(true);

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    const config = PART_TYPE_CONFIG[type];
    setTitle(config?.label || type);
    setIsRequired(type !== "DIVIDER");
    setStep("details");
  };

  const handleCreate = async () => {
    if (!selectedType || !title.trim()) return;
    await onCreate({
      type: selectedType,
      title: title.trim(),
      isRequired,
      content: DEFAULT_CONTENT[selectedType],
    });
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStep("type");
      setSelectedType(null);
      setTitle("");
      setIsRequired(true);
    }, 200);
  };

  const handleBack = () => {
    setStep("type");
    setSelectedType(null);
  };

  const config = selectedType ? PART_TYPE_CONFIG[selectedType] : null;
  const Icon = config?.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === "type" ? (
          <>
            <DialogHeader>
              <DialogTitle>Add Part</DialogTitle>
              <DialogDescription>Choose a content type to add to this module.</DialogDescription>
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
                    className="flex flex-col items-center gap-1.5 rounded-lg border p-3 hover:bg-accent hover:border-primary/30 transition-colors text-center group"
                  >
                    <TIcon className={`h-5 w-5 ${tc.color}`} />
                    <span className="text-sm font-medium">{tc.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight hidden group-hover:block">
                      {TYPE_DESCRIPTIONS[type]?.slice(0, 50)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2">
                  {Icon && <Icon className={`h-5 w-5 ${config?.color}`} />}
                  <DialogTitle>New {config?.label}</DialogTitle>
                </div>
              </div>
              <DialogDescription>
                {TYPE_DESCRIPTIONS[selectedType!] || "Set up the basics, then customize after creating."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="part-title">Title</Label>
                <Input
                  id="part-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`e.g., ${getPlaceholderTitle(selectedType!)}`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && title.trim()) handleCreate();
                  }}
                />
              </div>

              {/* Required toggle */}
              {selectedType !== "DIVIDER" && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Required</Label>
                    <p className="text-xs text-muted-foreground">
                      Participants must complete this to finish the module
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRequired(!isRequired)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      isRequired ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        isRequired ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Create button */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Part"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getPlaceholderTitle(type: string): string {
  switch (type) {
    case "TEXT": return "Introduction";
    case "STYLED_CONTENT": return "Session Overview";
    case "VIDEO": return "Breathing Exercise Video";
    case "STRATEGY_CARDS": return "Coping Strategies";
    case "JOURNAL_PROMPT": return "Weekly Reflection";
    case "CHECKLIST": return "Pre-Session Checklist";
    case "RESOURCE_LINK": return "Recommended Reading";
    case "DIVIDER": return "Section Break";
    case "HOMEWORK": return "Week 1 Homework";
    case "ASSESSMENT": return "Anxiety Screening";
    case "INTAKE_FORM": return "Client Background";
    case "SMART_GOALS": return "Treatment Goals";
    case "PDF": return "Handout";
    default: return "New Part";
  }
}
