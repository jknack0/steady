"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  FileText,
  BookOpen,
  Bell,
  StickyNote,
  Eye,
  EyeOff,
  Repeat,
  Music,
  Table2,
  Upload,
  Loader2,
  Gauge,
  Timer,
  Smile,
  CalendarCheck,
  Smartphone,
} from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { useParseHomeworkPdf } from "@/hooks/use-parse-homework-pdf";
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
import dynamic from "next/dynamic";
import type { HomeworkItem, HomeworkContent } from "@steady/shared";

const MobilePreviewModal = dynamic(
  () => import("@/components/mobile-preview/MobilePreviewModal").then((m) => m.MobilePreviewModal),
  { ssr: false }
);

// Extract specific item variants from the discriminated union
type ActionItem = Extract<HomeworkItem, { type: "ACTION" }>;
type ResourceReviewItem = Extract<HomeworkItem, { type: "RESOURCE_REVIEW" }>;
type JournalPromptItem = Extract<HomeworkItem, { type: "JOURNAL_PROMPT" }>;
type BringToSessionItem = Extract<HomeworkItem, { type: "BRING_TO_SESSION" }>;
type FreeTextNoteItem = Extract<HomeworkItem, { type: "FREE_TEXT_NOTE" }>;
type WorksheetItem = Extract<HomeworkItem, { type: "WORKSHEET" }>;
type RatingScaleItem = Extract<HomeworkItem, { type: "RATING_SCALE" }>;
type TimerItem = Extract<HomeworkItem, { type: "TIMER" }>;
type MoodCheckItem = Extract<HomeworkItem, { type: "MOOD_CHECK" }>;
type HabitTrackerItem = Extract<HomeworkItem, { type: "HABIT_TRACKER" }>;

interface HomeworkEditorProps {
  content: HomeworkContent;
  onChange: (content: HomeworkContent) => void;
}

const ITEM_TYPES: { type: HomeworkItem["type"]; label: string; icon: React.ElementType }[] = [
  { type: "ACTION", label: "Action Item", icon: CheckCircle2 },
  { type: "RESOURCE_REVIEW", label: "Resource Review", icon: FileText },
  { type: "JOURNAL_PROMPT", label: "Journal Prompt", icon: BookOpen },
  { type: "BRING_TO_SESSION", label: "Bring-to-Session", icon: Bell },
  { type: "FREE_TEXT_NOTE", label: "Free Text Note", icon: StickyNote },
  { type: "WORKSHEET", label: "Worksheet", icon: Table2 },
  { type: "RATING_SCALE", label: "Rating Scale", icon: Gauge },
  { type: "TIMER", label: "Timer", icon: Timer },
  { type: "MOOD_CHECK", label: "Mood Check", icon: Smile },
  { type: "HABIT_TRACKER", label: "Habit Tracker", icon: CalendarCheck },
];

// ── Homework Settings ────────────────────────────────

function HomeworkSettings({
  content,
  onChange,
}: {
  content: HomeworkContent;
  onChange: (c: HomeworkContent) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <h4 className="text-sm font-semibold">Homework Settings</h4>

      {/* Due Timing */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Due Timing</Label>
        <div className="space-y-1.5">
          {([
            ["BEFORE_NEXT_SESSION", "Before next session"],
            ["SPECIFIC_DATE", "Specific date"],
            ["DAYS_AFTER_UNLOCK", "Days after module unlock"],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="dueTimingType"
                value={value}
                checked={content.dueTimingType === value}
                onChange={() =>
                  onChange({ ...content, dueTimingType: value, dueTimingValue: null })
                }
                className="accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
        {content.dueTimingType === "SPECIFIC_DATE" && (
          <Input
            type="date"
            value={(content.dueTimingValue as string) || ""}
            onChange={(e) => onChange({ ...content, dueTimingValue: e.target.value })}
            className="w-48"
          />
        )}
        {content.dueTimingType === "DAYS_AFTER_UNLOCK" && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={(content.dueTimingValue as number) || ""}
              onChange={(e) =>
                onChange({ ...content, dueTimingValue: parseInt(e.target.value) || null })
              }
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        )}
      </div>

      {/* Completion Rule */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Completion Rule</Label>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="completionRule"
              checked={content.completionRule === "ALL"}
              onChange={() =>
                onChange({ ...content, completionRule: "ALL", completionMinimum: null })
              }
              className="accent-primary"
            />
            All items required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="completionRule"
              checked={content.completionRule === "X_OF_Y"}
              onChange={() =>
                onChange({ ...content, completionRule: "X_OF_Y", completionMinimum: 1 })
              }
              className="accent-primary"
            />
            Minimum items
          </label>
        </div>
        {content.completionRule === "X_OF_Y" && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={content.items.length || 99}
              value={content.completionMinimum || ""}
              onChange={(e) =>
                onChange({ ...content, completionMinimum: parseInt(e.target.value) || null })
              }
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              of {content.items.length} items
            </span>
          </div>
        )}
      </div>

      {/* Reminder Cadence */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Reminder Cadence</Label>
        <select
          value={content.reminderCadence}
          onChange={(e) =>
            onChange({ ...content, reminderCadence: e.target.value as HomeworkContent["reminderCadence"] })
          }
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="DAILY">Daily</option>
          <option value="EVERY_OTHER_DAY">Every other day</option>
          <option value="MID_WEEK">Mid-week only</option>
        </select>
      </div>

      <Separator />

      {/* Recurrence */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          <Label className="text-xs text-muted-foreground">Repeat This Homework</Label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={(content.recurrence || "NONE") !== "NONE"}
            onChange={(e) =>
              onChange({
                ...content,
                recurrence: e.target.checked ? "DAILY" : "NONE",
                recurrenceDays: [],
                recurrenceEndDate: null,
              })
            }
            className="accent-primary"
          />
          Enable recurring homework
        </label>

        {(content.recurrence || "NONE") !== "NONE" && (
          <div className="ml-6 space-y-3">
            {/* Recurrence frequency */}
            <div className="space-y-1.5">
              {([
                ["DAILY", "Every day"],
                ["WEEKLY", "Weekly (pick a day)"],
                ["CUSTOM", "Custom days"],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="recurrence"
                    value={value}
                    checked={content.recurrence === value}
                    onChange={() =>
                      onChange({
                        ...content,
                        recurrence: value,
                        recurrenceDays: value === "DAILY" ? [] : content.recurrenceDays,
                      })
                    }
                    className="accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Day picker for WEEKLY */}
            {content.recurrence === "WEEKLY" && (
              <div className="space-y-1">
                <Label className="text-xs">Repeat on</Label>
                <div className="flex gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          onChange({ ...content, recurrenceDays: [i] })
                        }
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          content.recurrenceDays?.includes(i)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {day}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Day picker for CUSTOM (multi-select) */}
            {content.recurrence === "CUSTOM" && (
              <div className="space-y-1">
                <Label className="text-xs">Repeat on (select multiple)</Label>
                <div className="flex gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day, i) => {
                      const selected = content.recurrenceDays?.includes(i);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const days = selected
                              ? (content.recurrenceDays || []).filter(
                                  (d) => d !== i
                                )
                              : [...(content.recurrenceDays || []), i].sort();
                            onChange({ ...content, recurrenceDays: days });
                          }}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            selected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* End date */}
            <div className="space-y-1">
              <Label className="text-xs">Repeat until</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="recurrenceEnd"
                    checked={!content.recurrenceEndDate}
                    onChange={() =>
                      onChange({ ...content, recurrenceEndDate: null })
                    }
                    className="accent-primary"
                  />
                  Ongoing
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="recurrenceEnd"
                    checked={!!content.recurrenceEndDate}
                    onChange={() =>
                      onChange({
                        ...content,
                        recurrenceEndDate:
                          new Date(Date.now() + 30 * 86400000)
                            .toISOString()
                            .split("T")[0],
                      })
                    }
                    className="accent-primary"
                  />
                  Until date
                </label>
              </div>
              {content.recurrenceEndDate && (
                <Input
                  type="date"
                  value={content.recurrenceEndDate}
                  onChange={(e) =>
                    onChange({
                      ...content,
                      recurrenceEndDate: e.target.value || null,
                    })
                  }
                  className="w-48"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Item Editors ─────────────────────────────────────

function ActionItemEditor({
  item,
  onUpdate,
}: {
  item: ActionItem;
  onUpdate: (item: ActionItem) => void;
}) {
  const addSubStep = () => {
    onUpdate({ ...item, subSteps: [...(item.subSteps || []), ""] });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Description</Label>
        <textarea
          value={item.description || ""}
          onChange={(e) => onUpdate({ ...item, description: e.target.value })}
          placeholder="What does the client need to do?"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
        />
      </div>

      {/* Sub-steps */}
      <div>
        <Label className="text-xs">Sub-steps</Label>
        <div className="mt-1 space-y-1.5">
          {(item.subSteps || []).map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
              <Input
                value={step}
                onChange={(e) => {
                  const steps = [...(item.subSteps || [])];
                  steps[i] = e.target.value;
                  onUpdate({ ...item, subSteps: steps });
                }}
                placeholder={`Step ${i + 1}`}
                className="flex-1"
              />
              <button
                onClick={() => {
                  const steps = (item.subSteps || []).filter((_, idx) => idx !== i);
                  onUpdate({ ...item, subSteps: steps });
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={addSubStep} className="mt-1">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add sub-step
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={item.addToSteadySystem || false}
            onChange={(e) => onUpdate({ ...item, addToSteadySystem: e.target.checked })}
            className="accent-primary"
          />
          Add to client&apos;s Steady System
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs">Due offset (optional)</Label>
        <Input
          type="number"
          min={0}
          value={item.dueDateOffsetDays ?? ""}
          onChange={(e) =>
            onUpdate({
              ...item,
              dueDateOffsetDays: e.target.value ? parseInt(e.target.value) : null,
            })
          }
          placeholder="days"
          className="w-20"
        />
        <span className="text-xs text-muted-foreground">days after unlock</span>
      </div>
    </div>
  );
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseDuration(str: string): number | undefined {
  const parts = str.split(":").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return undefined;
}

function ResourceReviewEditor({
  item,
  onUpdate,
}: {
  item: ResourceReviewItem;
  onUpdate: (item: ResourceReviewItem) => void;
}) {
  const isAudio = item.resourceType === "audio";

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Resource Title</Label>
        <Input
          value={item.resourceTitle || ""}
          onChange={(e) => onUpdate({ ...item, resourceTitle: e.target.value })}
          placeholder={isAudio ? "e.g., Session 3 Imaginal Exposure Recording" : "Title of the resource"}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Resource Type</Label>
        <select
          value={item.resourceType || "link"}
          onChange={(e) => {
            const newType = e.target.value as ResourceReviewItem["resourceType"];
            const updates: Partial<ResourceReviewItem> = { resourceType: newType };
            if (newType === "audio" || newType === "pdf") {
              updates.resourceUrl = "";
            }
            if (newType !== "audio") {
              updates.audioDurationSecs = undefined;
              updates.audioDescription = undefined;
            }
            if (newType !== "audio" && newType !== "pdf") {
              updates.resourceKey = undefined;
            }
            onUpdate({ ...item, ...updates });
          }}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="handout">Handout</option>
          <option value="video">Video</option>
          <option value="link">Link</option>
          <option value="audio">Audio</option>
          <option value="pdf">PDF</option>
        </select>
      </div>

      {item.resourceType === "pdf" ? (
        <div>
          <Label className="text-xs">PDF File</Label>
          <FileUpload
            context="pdf"
            value={item.resourceKey || null}
            onChange={(key, publicUrl) => {
              if (key) {
                onUpdate({ ...item, resourceKey: key, resourceUrl: publicUrl || "" });
              } else {
                onUpdate({ ...item, resourceKey: undefined, resourceUrl: "" });
              }
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Accepts .pdf
          </p>
        </div>
      ) : isAudio ? (
        <>
          <div>
            <Label className="text-xs">Audio File</Label>
            <FileUpload
              context="audio"
              value={item.resourceKey || null}
              onChange={(key, publicUrl) => {
                if (key) {
                  onUpdate({ ...item, resourceKey: key, resourceUrl: publicUrl || "" });
                } else {
                  onUpdate({ ...item, resourceKey: undefined, resourceUrl: "" });
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Accepts .mp3, .m4a, .wav, .aac, .ogg (max 500 MB)
            </p>
          </div>
          <div>
            <Label className="text-xs">Duration (MM:SS)</Label>
            <Input
              value={item.audioDurationSecs ? formatDuration(item.audioDurationSecs) : ""}
              onChange={(e) => {
                const secs = parseDuration(e.target.value);
                onUpdate({ ...item, audioDurationSecs: secs });
              }}
              placeholder="45:00"
              className="mt-1 w-32"
            />
          </div>
          <div>
            <Label className="text-xs">Listening Instructions (optional)</Label>
            <textarea
              value={item.audioDescription || ""}
              onChange={(e) => onUpdate({ ...item, audioDescription: e.target.value || undefined })}
              placeholder="e.g., Listen to this recording once daily. Find a quiet place and allow 45 minutes."
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
            />
          </div>
        </>
      ) : (
        <div>
          <Label className="text-xs">URL</Label>
          <Input
            value={item.resourceUrl || ""}
            onChange={(e) => onUpdate({ ...item, resourceUrl: e.target.value })}
            placeholder="https://..."
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
}

function JournalPromptItemEditor({
  item,
  onUpdate,
}: {
  item: JournalPromptItem;
  onUpdate: (item: JournalPromptItem) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Prompts</Label>
        <div className="mt-1 space-y-1.5">
          {(item.prompts || []).map((prompt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={prompt}
                onChange={(e) => {
                  const prompts = [...(item.prompts || [])];
                  prompts[i] = e.target.value;
                  onUpdate({ ...item, prompts });
                }}
                placeholder={`Prompt ${i + 1}`}
                className="flex-1"
              />
              <button
                onClick={() => {
                  const prompts = (item.prompts || []).filter((_, idx) => idx !== i);
                  onUpdate({ ...item, prompts });
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onUpdate({ ...item, prompts: [...(item.prompts || []), ""] })}
          className="mt-1"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add prompt
        </Button>
      </div>
      <div>
        <Label className="text-xs">Space Size</Label>
        <select
          value={item.spaceSizeHint || "medium"}
          onChange={(e) =>
            onUpdate({ ...item, spaceSizeHint: e.target.value as "small" | "medium" | "large" })
          }
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>
  );
}

function BringToSessionEditor({
  item,
  onUpdate,
}: {
  item: BringToSessionItem;
  onUpdate: (item: BringToSessionItem) => void;
}) {
  return (
    <div>
      <Label className="text-xs">Reminder Text</Label>
      <Input
        value={item.reminderText || ""}
        onChange={(e) => onUpdate({ ...item, reminderText: e.target.value })}
        placeholder="e.g., Bring your completed worksheet"
        className="mt-1"
      />
    </div>
  );
}

function FreeTextNoteEditor({
  item,
  onUpdate,
}: {
  item: FreeTextNoteItem;
  onUpdate: (item: FreeTextNoteItem) => void;
}) {
  return (
    <div>
      <Label className="text-xs">Note Content</Label>
      <textarea
        value={item.content || ""}
        onChange={(e) => onUpdate({ ...item, content: e.target.value })}
        placeholder="Additional notes or instructions for the client..."
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
      />
    </div>
  );
}

function WorksheetItemEditor({
  item,
  onUpdate,
}: {
  item: WorksheetItem;
  onUpdate: (item: WorksheetItem) => void;
}) {
  const addColumn = () => {
    const columns = [...item.columns, { label: `Column ${item.columns.length + 1}`, description: "" }];
    onUpdate({ ...item, columns });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Instructions (optional)</Label>
        <textarea
          value={item.instructions || ""}
          onChange={(e) => onUpdate({ ...item, instructions: e.target.value })}
          placeholder="Explain how to fill in the worksheet..."
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
        />
      </div>

      {/* Columns */}
      <div>
        <Label className="text-xs">Columns</Label>
        <div className="mt-1 space-y-2">
          {item.columns.map((col, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md border bg-muted/20 p-2">
              <div className="flex-1 space-y-1">
                <Input
                  value={col.label}
                  onChange={(e) => {
                    const columns = [...item.columns];
                    columns[i] = { ...columns[i], label: e.target.value };
                    onUpdate({ ...item, columns });
                  }}
                  placeholder={`Column ${i + 1} label`}
                />
                <Input
                  value={col.description || ""}
                  onChange={(e) => {
                    const columns = [...item.columns];
                    columns[i] = { ...columns[i], description: e.target.value };
                    onUpdate({ ...item, columns });
                  }}
                  placeholder="Description (optional)"
                  className="text-xs"
                />
              </div>
              {item.columns.length > 1 && (
                <button
                  onClick={() => {
                    const columns = item.columns.filter((_, idx) => idx !== i);
                    onUpdate({ ...item, columns });
                  }}
                  className="mt-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {item.columns.length < 10 && (
          <Button type="button" variant="ghost" size="sm" onClick={addColumn} className="mt-1">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add column
          </Button>
        )}
      </div>

      {/* Row count */}
      <div className="flex items-center gap-2">
        <Label className="text-xs">Number of rows</Label>
        <Input
          type="number"
          min={1}
          max={20}
          value={item.rowCount}
          onChange={(e) =>
            onUpdate({ ...item, rowCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })
          }
          className="w-20"
        />
      </div>

      <div>
        <Label className="text-xs">Tips (optional)</Label>
        <textarea
          value={item.tips || ""}
          onChange={(e) => onUpdate({ ...item, tips: e.target.value })}
          placeholder="Any tips or guidance for completing the worksheet..."
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
        />
      </div>
    </div>
  );
}

function RatingScaleItemEditor({
  item,
  onUpdate,
}: {
  item: RatingScaleItem;
  onUpdate: (item: RatingScaleItem) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Description</Label>
        <textarea
          value={item.description || ""}
          onChange={(e) => onUpdate({ ...item, description: e.target.value })}
          placeholder="What should the participant rate?"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
        />
      </div>
      <div className="flex items-center gap-4">
        <div>
          <Label className="text-xs">Min</Label>
          <Input
            type="number"
            min={0}
            max={9}
            value={item.min ?? 1}
            onChange={(e) => onUpdate({ ...item, min: parseInt(e.target.value) || 0 })}
            className="mt-1 w-20"
          />
        </div>
        <div>
          <Label className="text-xs">Max</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={item.max ?? 10}
            onChange={(e) => onUpdate({ ...item, max: parseInt(e.target.value) || 10 })}
            className="mt-1 w-20"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label className="text-xs">Min Label (optional)</Label>
          <Input
            value={item.minLabel || ""}
            onChange={(e) => onUpdate({ ...item, minLabel: e.target.value || undefined })}
            placeholder="e.g., Not at all"
            className="mt-1"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Max Label (optional)</Label>
          <Input
            value={item.maxLabel || ""}
            onChange={(e) => onUpdate({ ...item, maxLabel: e.target.value || undefined })}
            placeholder="e.g., Extremely"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

function TimerItemEditor({
  item,
  onUpdate,
}: {
  item: TimerItem;
  onUpdate: (item: TimerItem) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Description</Label>
        <textarea
          value={item.description || ""}
          onChange={(e) => onUpdate({ ...item, description: e.target.value })}
          placeholder="What should the participant do during the timer?"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
        />
      </div>
      <div>
        <Label className="text-xs">Duration (MM:SS)</Label>
        <Input
          value={item.durationSeconds ? formatDuration(item.durationSeconds) : ""}
          onChange={(e) => {
            const secs = parseDuration(e.target.value);
            if (secs !== undefined) {
              onUpdate({ ...item, durationSeconds: Math.max(10, Math.min(7200, secs)) });
            }
          }}
          placeholder="5:00"
          className="mt-1 w-32"
        />
        <p className="text-xs text-muted-foreground mt-1">Min 0:10, max 120:00</p>
      </div>
    </div>
  );
}

function MoodCheckItemEditor({
  item,
  onUpdate,
}: {
  item: MoodCheckItem;
  onUpdate: (item: MoodCheckItem) => void;
}) {
  const moods = item.moods || [
    { emoji: "\ud83d\ude0a", label: "Great" },
    { emoji: "\ud83d\ude42", label: "Good" },
    { emoji: "\ud83d\ude10", label: "Okay" },
    { emoji: "\ud83d\ude14", label: "Low" },
    { emoji: "\ud83d\ude22", label: "Struggling" },
  ];

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Description (optional)</Label>
        <Input
          value={item.description || ""}
          onChange={(e) => onUpdate({ ...item, description: e.target.value || undefined })}
          placeholder="e.g., How are you feeling right now?"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Mood Options</Label>
        <div className="mt-1 space-y-1.5">
          {moods.map((mood, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={mood.emoji}
                onChange={(e) => {
                  const updated = [...moods];
                  updated[i] = { ...updated[i], emoji: e.target.value };
                  onUpdate({ ...item, moods: updated });
                }}
                className="w-16 text-center"
                maxLength={4}
              />
              <Input
                value={mood.label}
                onChange={(e) => {
                  const updated = [...moods];
                  updated[i] = { ...updated[i], label: e.target.value };
                  onUpdate({ ...item, moods: updated });
                }}
                placeholder="Label"
                className="flex-1"
              />
              {moods.length > 2 && (
                <button
                  onClick={() => {
                    const updated = moods.filter((_, idx) => idx !== i);
                    onUpdate({ ...item, moods: updated });
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {moods.length < 10 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ ...item, moods: [...moods, { emoji: "\ud83d\ude36", label: "" }] })}
            className="mt-1"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add mood
          </Button>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={item.includeNote || false}
          onChange={(e) => onUpdate({ ...item, includeNote: e.target.checked })}
          className="accent-primary"
        />
        Include optional note field
      </label>
    </div>
  );
}

function HabitTrackerItemEditor({
  item,
  onUpdate,
}: {
  item: HabitTrackerItem;
  onUpdate: (item: HabitTrackerItem) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Habit Label</Label>
        <Input
          value={item.habitLabel || ""}
          onChange={(e) => onUpdate({ ...item, habitLabel: e.target.value })}
          placeholder="e.g., Did you take your medication?"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <textarea
          value={item.description || ""}
          onChange={(e) => onUpdate({ ...item, description: e.target.value })}
          placeholder="Additional context about this habit..."
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
        />
      </div>
    </div>
  );
}

// ── Sortable Homework Item ───────────────────────────

function SortableHomeworkItem({
  item,
  index,
  onUpdate,
  onDelete,
}: {
  item: HomeworkItem;
  index: number;
  onUpdate: (index: number, item: HomeworkItem) => void;
  onDelete: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `hw-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeConfig = ITEM_TYPES.find((t) => t.type === item.type) || ITEM_TYPES[0];
  const Icon = typeConfig.icon;

  const renderItemEditor = () => {
    switch (item.type) {
      case "ACTION":
        return <ActionItemEditor item={item} onUpdate={(updated) => onUpdate(index, updated)} />;
      case "RESOURCE_REVIEW":
        return <ResourceReviewEditor item={item} onUpdate={(updated) => onUpdate(index, updated)} />;
      case "JOURNAL_PROMPT":
        return (
          <JournalPromptItemEditor item={item} onUpdate={(updated) => onUpdate(index, updated)} />
        );
      case "BRING_TO_SESSION":
        return (
          <BringToSessionEditor item={item} onUpdate={(updated) => onUpdate(index, updated)} />
        );
      case "FREE_TEXT_NOTE":
        return (
          <FreeTextNoteEditor item={item} onUpdate={(updated) => onUpdate(index, updated)} />
        );
      case "WORKSHEET":
        return <WorksheetItemEditor item={item} onUpdate={(updated) => onUpdate(index, updated)} />;
      case "RATING_SCALE":
        return <RatingScaleItemEditor item={item} onUpdate={(updated) => onUpdate(index, updated)} />;
      case "TIMER":
        return <TimerItemEditor item={item} onUpdate={(updated) => onUpdate(index, updated)} />;
      case "MOOD_CHECK":
        return <MoodCheckItemEditor item={item} onUpdate={(updated) => onUpdate(index, updated)} />;
      case "HABIT_TRACKER":
        return <HabitTrackerItemEditor item={item} onUpdate={(updated) => onUpdate(index, updated)} />;
      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card">
      {/* Item header */}
      <div className="flex items-center gap-2 p-3">
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Icon className="h-4 w-4 text-orange-600" />
        <span className="flex-1 text-sm font-medium">{typeConfig.label}</span>
        <button
          onClick={() => onDelete(index)}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Item editor */}
      {expanded && (
        <div className="border-t px-4 py-3 pl-12">{renderItemEditor()}</div>
      )}
    </div>
  );
}

// ── Participant Preview ──────────────────────────────

function ParticipantPreview({ content }: { content: HomeworkContent }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
        Client Preview
      </h4>
      <div className="mx-auto max-w-[375px] rounded-xl border bg-white p-4 shadow-sm">
        {/* Interactive badge */}
        <div className="mb-3 flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1.5">
          <svg className="h-3.5 w-3.5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          <span className="text-[11px] font-medium text-teal-700">Participants complete this homework interactively in the app</span>
        </div>

        {/* Due timing */}
        <div className="mb-3 text-xs text-gray-500">
          Due:{" "}
          {content.dueTimingType === "BEFORE_NEXT_SESSION"
            ? "Before next session"
            : content.dueTimingType === "SPECIFIC_DATE"
              ? content.dueTimingValue || "Date TBD"
              : `${content.dueTimingValue || "?"} days after unlock`}
        </div>

        {/* Completion rule */}
        <div className="mb-4 text-xs text-gray-500">
          {content.completionRule === "ALL"
            ? "Complete all items"
            : `Complete at least ${content.completionMinimum || "?"} of ${content.items.length} items`}
        </div>

        {/* Items */}
        {content.items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">No items yet</p>
        ) : (
          <div className="space-y-3">
            {content.items.map((item, i) => (
              <PreviewItem key={i} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewItem({ item }: { item: HomeworkItem }) {
  const typeConfig = ITEM_TYPES.find((t) => t.type === item.type);

  return (
    <div className="rounded-lg bg-amber-50 p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase text-amber-600">
        {typeConfig?.label}
      </div>
      {item.type === "ACTION" && (
        <div>
          <div className="flex items-start gap-2">
            <div className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-gray-300" />
            <p className="text-sm text-gray-800">{item.description || "..."}</p>
          </div>
          {(item.subSteps || []).length > 0 && (
            <div className="mt-2 ml-6 space-y-1.5">
              {item.subSteps!.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 shrink-0 rounded border border-gray-300" />
                  <span className="text-xs text-gray-600">{s || "..."}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {item.type === "RESOURCE_REVIEW" && (
        <div>
          <p className="text-sm text-gray-800">
            {item.resourceTitle || "Untitled"}{" "}
            <span className="text-xs text-gray-500">({item.resourceType})</span>
          </p>
          {item.resourceType === "audio" && item.audioDurationSecs ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Duration: {formatDuration(item.audioDurationSecs)}
            </p>
          ) : null}
          {item.resourceType === "audio" && item.audioDescription ? (
            <p className="text-xs text-gray-500 mt-0.5 italic">{item.audioDescription}</p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-4 w-4 shrink-0 rounded border-2 border-gray-300" />
            <span className="text-xs text-gray-500">Mark as reviewed</span>
          </div>
        </div>
      )}
      {item.type === "JOURNAL_PROMPT" && (
        <div className="space-y-2">
          {(item.prompts || []).map((p, i) => (
            <div key={i}>
              <p className="text-sm text-gray-800 mb-1">{p || "..."}</p>
              <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-300 min-h-[40px]">
                Write your response...
              </div>
            </div>
          ))}
        </div>
      )}
      {item.type === "BRING_TO_SESSION" && (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 shrink-0 rounded border-2 border-gray-300" />
          <p className="text-sm text-gray-800">{item.reminderText || "..."}</p>
        </div>
      )}
      {item.type === "FREE_TEXT_NOTE" && (
        <div>
          <p className="text-sm text-gray-800">{item.content || "..."}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-4 w-4 shrink-0 rounded border-2 border-gray-300" />
            <span className="text-xs text-gray-500">Got it</span>
          </div>
        </div>
      )}
      {item.type === "CHOICE" && (
        <div>
          {item.description && <p className="text-sm text-gray-800 mb-2">{item.description}</p>}
          <div className="space-y-1.5">
            {(item.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-md border border-gray-200 bg-white px-3 py-2">
                <div className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />
                <div>
                  <span className="text-sm text-gray-800">{opt.label}</span>
                  {opt.detail && <p className="text-[10px] text-gray-500">{opt.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {item.type === "WORKSHEET" && (
        <div>
          {item.instructions && <p className="text-xs text-gray-600 mb-2">{item.instructions}</p>}
          <div className="space-y-2">
            {Array.from({ length: Math.min(item.rowCount, 2) }).map((_, ri) => (
              <div key={ri} className="rounded-md border border-gray-200 bg-white p-2">
                <p className="text-[10px] font-medium text-gray-400 mb-1">Row {ri + 1}</p>
                {item.columns.map((col, ci) => (
                  <div key={ci} className="mb-1.5">
                    <p className="text-[10px] font-medium text-gray-500">{col.label}</p>
                    <div className="mt-0.5 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] text-gray-300">
                      Enter {col.label.toLowerCase()}...
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {item.rowCount > 2 && (
              <p className="text-[10px] text-gray-400 text-center">+ {item.rowCount - 2} more rows</p>
            )}
          </div>
          {item.tips && <p className="text-xs text-gray-500 mt-2 italic">{item.tips}</p>}
        </div>
      )}
      {item.type === "RATING_SCALE" && (
        <div>
          <p className="text-sm text-gray-800">{item.description || "..."}</p>
          <div className="mt-2 flex items-center gap-1 flex-wrap justify-center">
            {item.minLabel && <span className="text-[10px] text-gray-400 mr-1">{item.minLabel}</span>}
            {Array.from({ length: (item.max ?? 10) - (item.min ?? 1) + 1 }).map((_, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center text-xs text-gray-500 hover:border-teal-400 transition-colors">
                {(item.min ?? 1) + i}
              </div>
            ))}
            {item.maxLabel && <span className="text-[10px] text-gray-400 ml-1">{item.maxLabel}</span>}
          </div>
        </div>
      )}
      {item.type === "TIMER" && (
        <div className="text-center">
          <p className="text-sm text-gray-800 mb-2">{item.description || "..."}</p>
          <div className="text-2xl font-mono text-gray-700 mb-2">
            {formatDuration(item.durationSeconds)}
          </div>
          <div className="inline-block rounded-lg bg-teal-600 px-5 py-1.5 text-xs font-semibold text-white">
            Start
          </div>
        </div>
      )}
      {item.type === "MOOD_CHECK" && (
        <div>
          {item.description && <p className="text-sm text-gray-800 mb-2">{item.description}</p>}
          <div className="flex gap-2 justify-center">
            {(item.moods || []).map((mood, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 hover:border-teal-400 transition-colors">
                <span className="text-xl">{mood.emoji}</span>
                <span className="text-[10px] text-gray-500">{mood.label}</span>
              </div>
            ))}
          </div>
          {item.includeNote && (
            <div className="mt-2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-300">
              Add a note (optional)...
            </div>
          )}
        </div>
      )}
      {item.type === "HABIT_TRACKER" && (
        <div>
          <p className="text-sm font-medium text-gray-800">{item.habitLabel || "..."}</p>
          {item.description && <p className="text-xs text-gray-600 mt-1">{item.description}</p>}
          <div className="mt-2 flex gap-2">
            <div className="flex-1 rounded-lg border-2 border-gray-200 bg-white py-2 text-center text-xs font-medium text-gray-500 hover:border-teal-400 transition-colors">Yes</div>
            <div className="flex-1 rounded-lg border-2 border-gray-200 bg-white py-2 text-center text-xs font-medium text-gray-500 hover:border-red-300 transition-colors">No</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Homework Editor ─────────────────────────────

export function HomeworkPartEditor({ content: rawContent, onChange }: HomeworkEditorProps) {
  // Ensure all items have sortOrder (may be missing from DB)
  const content = {
    ...rawContent,
    items: rawContent.items.map((item, i) => ({ ...item, sortOrder: item.sortOrder ?? i })),
  } as HomeworkContent;

  const [showPreview, setShowPreview] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [pdfKey, setPdfKey] = useState<string | null>(null);
  const parsePdf = useParseHomeworkPdf();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleUpdateItem = (index: number, updated: HomeworkItem) => {
    const items = content.items.map((item, i) => (i === index ? { ...updated, sortOrder: updated.sortOrder ?? i } : { ...item, sortOrder: item.sortOrder ?? i }));
    onChange({ ...content, items });
  };

  const handleDeleteItem = (index: number) => {
    const items = content.items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, sortOrder: i }) as HomeworkItem);
    onChange({ ...content, items });
  };

  const handleAddItem = (type: HomeworkItem["type"]) => {
    const sortOrder = content.items.length;
    let newItem: HomeworkItem;

    switch (type) {
      case "ACTION":
        newItem = { type, sortOrder, description: "", subSteps: [], addToSteadySystem: false, dueDateOffsetDays: null };
        break;
      case "RESOURCE_REVIEW":
        newItem = { type, sortOrder, resourceTitle: "", resourceType: "link", resourceUrl: "" };
        break;
      case "JOURNAL_PROMPT":
        newItem = { type, sortOrder, prompts: [""], spaceSizeHint: "medium" };
        break;
      case "BRING_TO_SESSION":
        newItem = { type, sortOrder, reminderText: "" };
        break;
      case "FREE_TEXT_NOTE":
        newItem = { type, sortOrder, content: "" };
        break;
      case "CHOICE":
        newItem = { type, sortOrder, description: "", options: [{ label: "" }, { label: "" }] };
        break;
      case "WORKSHEET":
        newItem = {
          type,
          sortOrder,
          instructions: "",
          columns: [
            { label: "Column 1", description: "" },
            { label: "Column 2", description: "" },
            { label: "Column 3", description: "" },
          ],
          rowCount: 5,
          tips: "",
        };
        break;
      case "RATING_SCALE":
        newItem = { type, sortOrder, description: "", min: 1, max: 10 };
        break;
      case "TIMER":
        newItem = { type, sortOrder, description: "", durationSeconds: 300 };
        break;
      case "MOOD_CHECK":
        newItem = {
          type,
          sortOrder,
          moods: [
            { emoji: "\ud83d\ude0a", label: "Great" },
            { emoji: "\ud83d\ude42", label: "Good" },
            { emoji: "\ud83d\ude10", label: "Okay" },
            { emoji: "\ud83d\ude14", label: "Low" },
            { emoji: "\ud83d\ude22", label: "Struggling" },
          ],
          includeNote: false,
        };
        break;
      case "HABIT_TRACKER":
        newItem = { type, sortOrder, description: "", habitLabel: "" };
        break;
    }

    onChange({ ...content, items: [...content.items, newItem] });
    setShowAddMenu(false);
  };

  const handlePdfImport = async () => {
    if (!pdfKey) return;
    try {
      const result = await parsePdf.mutateAsync(pdfKey);
      // Re-index all items: existing + new
      const existingCount = content.items.length;
      const newItems = result.items.map((item, i) => ({
        ...item,
        sortOrder: existingCount + i,
      }));
      onChange({
        ...content,
        items: [...content.items, ...newItems] as HomeworkContent["items"],
      });
      setShowPdfImport(false);
      setPdfKey(null);
    } catch {
      // error shown via parsePdf.error
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).split("-")[1]);
    const newIndex = parseInt(String(over.id).split("-")[1]);
    const reordered = arrayMove(content.items, oldIndex, newIndex).map((item, i) => ({
      ...item,
      sortOrder: i,
    }) as HomeworkItem);
    onChange({ ...content, items: reordered });
  };

  return (
    <div className="space-y-4">
      {/* Settings */}
      <HomeworkSettings content={content} onChange={onChange} />

      <Separator />

      {/* Item List Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">
          Homework Items ({content.items.length})
        </h4>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMobilePreview(true)}
          >
            <Smartphone className="mr-1 h-4 w-4" />
            Mobile Preview
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <>
                <EyeOff className="mr-1 h-4 w-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="mr-1 h-4 w-4" />
                Preview
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && <ParticipantPreview content={content} />}

      {/* Sortable Items */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={content.items.map((_, i) => `hw-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {content.items.map((item, i) => (
              <SortableHomeworkItem
                key={`hw-${i}`}
                item={item}
                index={i}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Item / Import */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddMenu(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPdfImport(true)}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import from PDF
        </Button>
      </div>

      {/* PDF Import Dialog */}
      <Dialog open={showPdfImport} onOpenChange={(open) => { setShowPdfImport(open); if (!open) { setPdfKey(null); parsePdf.reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Homework from PDF</DialogTitle>
            <DialogDescription>
              Upload a PDF worksheet and AI will convert it into structured homework items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FileUpload
              context="pdf"
              value={pdfKey}
              onChange={(key) => { setPdfKey(key); parsePdf.reset(); }}
            />
            {parsePdf.error && (
              <p className="text-sm text-destructive">
                {parsePdf.error.message || "Failed to parse PDF. Please try again."}
              </p>
            )}
            <Button
              type="button"
              onClick={handlePdfImport}
              disabled={!pdfKey || parsePdf.isPending}
              className="w-full"
            >
              {parsePdf.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing PDF...
                </>
              ) : (
                "Generate Homework Items"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddMenu} onOpenChange={setShowAddMenu}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Homework Item</DialogTitle>
            <DialogDescription>
              Choose an item type to add to this homework assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-2">
            {ITEM_TYPES.map(({ type, label, icon: ItemIcon }) => (
              <button
                key={type}
                onClick={() => handleAddItem(type)}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent hover:border-primary/30 transition-colors text-center"
              >
                <ItemIcon className="h-6 w-6 text-orange-600" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Preview Modal (RN Web) */}
      <MobilePreviewModal
        open={showMobilePreview}
        onOpenChange={setShowMobilePreview}
        content={content}
        title="Homework"
      />
    </div>
  );
}
