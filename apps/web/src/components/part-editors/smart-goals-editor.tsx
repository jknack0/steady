"use client";

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
import { Plus, Trash2, ChevronDown, ChevronRight, Target } from "lucide-react";
import { useState } from "react";

// ── Types ────────────────────────────────────────────

type GoalCategory = "DAILY_ROUTINE" | "WORK" | "RELATIONSHIPS" | "HEALTH" | "SELF_CARE" | "OTHER";

interface SmartGoal {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  category: GoalCategory;
  sortOrder: number;
}

interface SmartGoalsContent {
  type: "SMART_GOALS";
  instructions: string;
  maxGoals: number;
  categories: string[];
  goals: SmartGoal[];
}

interface SmartGoalsEditorProps {
  content: SmartGoalsContent;
  onChange: (content: SmartGoalsContent) => void;
}

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  DAILY_ROUTINE: "Daily Routine",
  WORK: "Work / School",
  RELATIONSHIPS: "Relationships",
  HEALTH: "Health",
  SELF_CARE: "Self-Care",
  OTHER: "Other",
};

const SMART_FIELDS: { key: keyof Pick<SmartGoal, "specific" | "measurable" | "achievable" | "relevant" | "timeBound">; label: string; hint: string }[] = [
  { key: "specific", label: "Specific", hint: "What exactly do you want to accomplish?" },
  { key: "measurable", label: "Measurable", hint: "How will you know when it's achieved?" },
  { key: "achievable", label: "Achievable", hint: "Is this realistic given your current situation?" },
  { key: "relevant", label: "Relevant", hint: "Why does this matter to you right now?" },
  { key: "timeBound", label: "Time-Bound", hint: "By when will you accomplish this?" },
];

// ── Goal Card ────────────────────────────────────────

function GoalCard({
  goal,
  index,
  onUpdate,
  onDelete,
}: {
  goal: SmartGoal;
  index: number;
  onUpdate: (index: number, g: SmartGoal) => void;
  onDelete: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const update = (patch: Partial<SmartGoal>) => {
    onUpdate(index, { ...goal, ...patch });
  };

  const summary = goal.specific || "Untitled goal";

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-emerald-600 shrink-0" />
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-xs font-medium text-muted-foreground">Goal {index + 1}</span>
        <span className="text-xs rounded-full bg-muted px-2 py-0.5">
          {CATEGORY_LABELS[goal.category] || goal.category}
        </span>
        <span className="flex-1 text-sm truncate">{summary}</span>
        <button onClick={() => onDelete(index)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pl-6">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={goal.category} onValueChange={(v) => update({ category: v as GoalCategory })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {SMART_FIELDS.map(({ key, label, hint }) => (
            <div key={key}>
              <Label className="text-xs">
                <span className="font-semibold text-emerald-700">{label[0]}</span>
                <span>{label.slice(1)}</span>
              </Label>
              <Textarea
                value={goal[key]}
                onChange={(e) => update({ [key]: e.target.value })}
                placeholder={hint}
                className="mt-1"
                rows={2}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Editor ──────────────────────────────────────

export function SmartGoalsPartEditor({ content, onChange }: SmartGoalsEditorProps) {
  const safeContent: SmartGoalsContent = {
    type: "SMART_GOALS",
    instructions: content.instructions ?? "",
    maxGoals: content.maxGoals ?? 3,
    categories: content.categories?.length
      ? content.categories
      : ["DAILY_ROUTINE", "WORK", "RELATIONSHIPS", "HEALTH", "SELF_CARE", "OTHER"],
    goals: content.goals ?? [],
  };

  const updateField = (patch: Partial<SmartGoalsContent>) => {
    onChange({ ...safeContent, ...patch });
  };

  const addGoal = () => {
    const goal: SmartGoal = {
      specific: "",
      measurable: "",
      achievable: "",
      relevant: "",
      timeBound: "",
      category: "OTHER",
      sortOrder: safeContent.goals.length,
    };
    updateField({ goals: [...safeContent.goals, goal] });
  };

  const updateGoal = (index: number, g: SmartGoal) => {
    const goals = safeContent.goals.map((existing, i) => (i === index ? g : existing));
    updateField({ goals });
  };

  const deleteGoal = (index: number) => {
    const goals = safeContent.goals
      .filter((_, i) => i !== index)
      .map((g, i) => ({ ...g, sortOrder: i }));
    updateField({ goals });
  };

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Max Goals (participant can set up to)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={safeContent.maxGoals}
            onChange={(e) => updateField({ maxGoals: parseInt(e.target.value) || 3 })}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Instructions</Label>
        <Textarea
          value={safeContent.instructions}
          onChange={(e) => updateField({ instructions: e.target.value })}
          placeholder="Set goals that are Specific, Measurable, Achievable, Relevant, and Time-bound..."
          className="mt-1"
          rows={2}
        />
      </div>

      {/* Pre-filled goals (clinician templates) */}
      <div>
        <Label className="text-xs mb-2 block">
          Pre-filled Goals ({safeContent.goals.length})
          <span className="font-normal text-muted-foreground ml-1">
            — optional templates the participant starts with
          </span>
        </Label>
        <div className="space-y-2">
          {safeContent.goals.map((g, i) => (
            <GoalCard
              key={i}
              goal={g}
              index={i}
              onUpdate={updateGoal}
              onDelete={deleteGoal}
            />
          ))}
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addGoal}>
        <Plus className="mr-1 h-4 w-4" /> Add Goal Template
      </Button>
    </div>
  );
}
