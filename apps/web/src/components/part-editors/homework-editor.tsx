"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { FileUpload } from "@/components/file-upload";
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
import type { HomeworkItem, HomeworkContent } from "@steady/shared";

// Extract specific item variants from the discriminated union
type ActionItem = Extract<HomeworkItem, { type: "ACTION" }>;
type ResourceReviewItem = Extract<HomeworkItem, { type: "RESOURCE_REVIEW" }>;
type JournalPromptItem = Extract<HomeworkItem, { type: "JOURNAL_PROMPT" }>;
type BringToSessionItem = Extract<HomeworkItem, { type: "BRING_TO_SESSION" }>;
type FreeTextNoteItem = Extract<HomeworkItem, { type: "FREE_TEXT_NOTE" }>;

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
          placeholder="What does the participant need to do?"
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
          Add to participant&apos;s Steady System
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
            if (newType === "audio") {
              updates.resourceUrl = "";
            } else {
              updates.resourceKey = undefined;
              updates.audioDurationSecs = undefined;
              updates.audioDescription = undefined;
            }
            onUpdate({ ...item, ...updates });
          }}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="handout">Handout</option>
          <option value="video">Video</option>
          <option value="link">Link</option>
          <option value="audio">Audio</option>
        </select>
      </div>

      {isAudio ? (
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
        placeholder="Additional notes or instructions for the participant..."
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
      />
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
        Participant Preview
      </h4>
      <div className="mx-auto max-w-[375px] rounded-xl border bg-white p-4 shadow-sm">
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
      <div className="mb-1 text-[10px] font-semibold uppercase text-amber-600">
        {typeConfig?.label}
      </div>
      {item.type === "ACTION" && (
        <>
          <p className="text-sm text-gray-800">{item.description || "..."}</p>
          {(item.subSteps || []).length > 0 && (
            <ul className="mt-1 ml-4 list-disc text-xs text-gray-600">
              {item.subSteps!.map((s, i) => (
                <li key={i}>{s || "..."}</li>
              ))}
            </ul>
          )}
        </>
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
        </div>
      )}
      {item.type === "JOURNAL_PROMPT" && (
        <div className="space-y-1">
          {(item.prompts || []).map((p, i) => (
            <p key={i} className="text-sm text-gray-800">
              {p || "..."}
            </p>
          ))}
        </div>
      )}
      {item.type === "BRING_TO_SESSION" && (
        <p className="text-sm text-gray-800">{item.reminderText || "..."}</p>
      )}
      {item.type === "FREE_TEXT_NOTE" && (
        <p className="text-sm text-gray-800">{item.content || "..."}</p>
      )}
    </div>
  );
}

// ── Main Homework Editor ─────────────────────────────

export function HomeworkPartEditor({ content, onChange }: HomeworkEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleUpdateItem = (index: number, updated: HomeworkItem) => {
    const items = content.items.map((item, i) => (i === index ? updated : item));
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
    }

    onChange({ ...content, items: [...content.items, newItem] });
    setShowAddMenu(false);
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

      {/* Add Item */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
        {showAddMenu && (
          <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-md border bg-popover p-1 shadow-md">
            {ITEM_TYPES.map(({ type, label, icon: ItemIcon }) => (
              <button
                key={type}
                onClick={() => handleAddItem(type)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <ItemIcon className="h-4 w-4 text-orange-600" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
