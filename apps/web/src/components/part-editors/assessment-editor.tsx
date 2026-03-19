"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ────────────────────────────────────────────

type QuestionType = "LIKERT" | "MULTIPLE_CHOICE" | "FREE_TEXT" | "YES_NO";

interface AssessmentQuestion {
  question: string;
  type: QuestionType;
  options?: string[];
  likertMin?: number;
  likertMax?: number;
  likertMinLabel?: string;
  likertMaxLabel?: string;
  required: boolean;
  sortOrder: number;
}

interface AssessmentContent {
  type: "ASSESSMENT";
  title: string;
  instructions: string;
  scoringEnabled: boolean;
  questions: AssessmentQuestion[];
}

interface AssessmentEditorProps {
  content: AssessmentContent;
  onChange: (content: AssessmentContent) => void;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  LIKERT: "Likert Scale",
  MULTIPLE_CHOICE: "Multiple Choice",
  FREE_TEXT: "Free Text",
  YES_NO: "Yes / No",
};

// ── Question Editor ──────────────────────────────────

function SortableQuestion({
  question,
  index,
  onUpdate,
  onDelete,
}: {
  question: AssessmentQuestion;
  index: number;
  onUpdate: (index: number, q: AssessmentQuestion) => void;
  onDelete: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `q-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const update = (patch: Partial<AssessmentQuestion>) => {
    onUpdate(index, { ...question, ...patch });
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <button className="cursor-grab touch-none text-muted-foreground" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-xs font-medium text-muted-foreground">Q{index + 1}</span>
        <span className="text-xs text-muted-foreground">({QUESTION_TYPE_LABELS[question.type]})</span>
        <span className="flex-1 text-sm truncate">{question.question || "Untitled question"}</span>
        <button onClick={() => onDelete(index)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pl-6">
          <div>
            <Label className="text-xs">Question Text</Label>
            <Textarea
              value={question.question}
              onChange={(e) => update({ question: e.target.value })}
              placeholder="Enter your question..."
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-xs">Type</Label>
              <Select value={question.type} onValueChange={(v) => {
                const newType = v as QuestionType;
                const patch: Partial<AssessmentQuestion> = { type: newType };
                if (newType === "LIKERT") {
                  patch.likertMin = question.likertMin ?? 1;
                  patch.likertMax = question.likertMax ?? 5;
                  patch.likertMinLabel = question.likertMinLabel ?? "Strongly Disagree";
                  patch.likertMaxLabel = question.likertMaxLabel ?? "Strongly Agree";
                }
                if (newType === "MULTIPLE_CHOICE" && (!question.options || question.options.length === 0)) {
                  patch.options = ["Option 1", "Option 2"];
                }
                update(patch);
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-xs mt-5">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => update({ required: e.target.checked })}
                className="accent-primary"
              />
              Required
            </label>
          </div>

          {/* Likert config */}
          {question.type === "LIKERT" && (
            <div className="space-y-2 rounded border p-3 bg-background">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Min Value</Label>
                  <Input
                    type="number"
                    value={question.likertMin ?? 1}
                    onChange={(e) => update({ likertMin: parseInt(e.target.value) || 1 })}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Max Value</Label>
                  <Input
                    type="number"
                    value={question.likertMax ?? 5}
                    onChange={(e) => update({ likertMax: parseInt(e.target.value) || 5 })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Min Label</Label>
                  <Input
                    value={question.likertMinLabel ?? ""}
                    onChange={(e) => update({ likertMinLabel: e.target.value })}
                    placeholder="e.g., Strongly Disagree"
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Max Label</Label>
                  <Input
                    value={question.likertMaxLabel ?? ""}
                    onChange={(e) => update({ likertMaxLabel: e.target.value })}
                    placeholder="e.g., Strongly Agree"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Multiple choice options */}
          {question.type === "MULTIPLE_CHOICE" && (
            <div className="space-y-2">
              <Label className="text-xs">Options</Label>
              {(question.options || []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const opts = [...(question.options || [])];
                      opts[oi] = e.target.value;
                      update({ options: opts });
                    }}
                    placeholder={`Option ${oi + 1}`}
                    className="flex-1"
                  />
                  <button
                    onClick={() => {
                      const opts = (question.options || []).filter((_, i) => i !== oi);
                      update({ options: opts });
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => update({ options: [...(question.options || []), ""] })}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Option
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Editor ──────────────────────────────────────

export function AssessmentPartEditor({ content, onChange }: AssessmentEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const safeContent: AssessmentContent = {
    type: "ASSESSMENT",
    title: content.title ?? "",
    instructions: content.instructions ?? "",
    scoringEnabled: content.scoringEnabled ?? false,
    questions: content.questions ?? [],
  };

  const updateField = (patch: Partial<AssessmentContent>) => {
    onChange({ ...safeContent, ...patch });
  };

  const addQuestion = (type: QuestionType) => {
    const base: AssessmentQuestion = {
      question: "",
      type,
      required: true,
      sortOrder: safeContent.questions.length,
    };
    if (type === "LIKERT") {
      base.likertMin = 1;
      base.likertMax = 5;
      base.likertMinLabel = "Strongly Disagree";
      base.likertMaxLabel = "Strongly Agree";
    }
    if (type === "MULTIPLE_CHOICE") {
      base.options = ["Option 1", "Option 2"];
    }
    updateField({ questions: [...safeContent.questions, base] });
  };

  const updateQuestion = (index: number, q: AssessmentQuestion) => {
    const questions = safeContent.questions.map((existing, i) => (i === index ? q : existing));
    updateField({ questions });
  };

  const deleteQuestion = (index: number) => {
    const questions = safeContent.questions
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, sortOrder: i }));
    updateField({ questions });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).split("-")[1]);
    const newIndex = parseInt(String(over.id).split("-")[1]);
    const reordered = arrayMove(safeContent.questions, oldIndex, newIndex).map((q, i) => ({
      ...q,
      sortOrder: i,
    }));
    updateField({ questions: reordered });
  };

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Assessment Title</Label>
          <Input
            value={safeContent.title}
            onChange={(e) => updateField({ title: e.target.value })}
            placeholder="e.g., ADHD Symptom Checklist"
            className="mt-1"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm pb-2">
            <input
              type="checkbox"
              checked={safeContent.scoringEnabled}
              onChange={(e) => updateField({ scoringEnabled: e.target.checked })}
              className="accent-primary"
            />
            Enable scoring
          </label>
        </div>
      </div>

      <div>
        <Label className="text-xs">Instructions (shown to participant)</Label>
        <Textarea
          value={safeContent.instructions}
          onChange={(e) => updateField({ instructions: e.target.value })}
          placeholder="Please answer each question honestly..."
          className="mt-1"
          rows={2}
        />
      </div>

      {/* Questions */}
      <div>
        <Label className="text-xs mb-2 block">Questions ({safeContent.questions.length})</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={safeContent.questions.map((_, i) => `q-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {safeContent.questions.map((q, i) => (
                <SortableQuestion
                  key={`q-${i}`}
                  question={q}
                  index={i}
                  onUpdate={updateQuestion}
                  onDelete={deleteQuestion}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Add question buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([type, label]) => (
          <Button key={type} type="button" variant="outline" size="sm" onClick={() => addQuestion(type)}>
            <Plus className="mr-1 h-3 w-3" /> {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
