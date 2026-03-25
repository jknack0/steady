"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useDailyTracker, useUpdateDailyTracker } from "@/hooks/use-daily-trackers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
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

interface FieldConfig {
  id?: string;
  label: string;
  fieldType: "SCALE" | "NUMBER" | "YES_NO" | "MULTI_CHECK" | "FREE_TEXT" | "TIME";
  options: any;
  sortOrder: number;
  isRequired: boolean;
}

const FIELD_TYPES = [
  { value: "SCALE", label: "Scale (slider)" },
  { value: "NUMBER", label: "Number" },
  { value: "YES_NO", label: "Yes / No" },
  { value: "MULTI_CHECK", label: "Multi-select Checkboxes" },
  { value: "FREE_TEXT", label: "Free Text" },
  { value: "TIME", label: "Time" },
] as const;

// ── Field Editor ────────────────────────────────────

function SortableFieldEditor({
  field,
  index,
  onUpdate,
  onDelete,
}: {
  field: FieldConfig;
  index: number;
  onUpdate: (index: number, field: FieldConfig) => void;
  onDelete: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `field-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <button
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Label</Label>
              <Input
                value={field.label}
                onChange={(e) =>
                  onUpdate(index, { ...field, label: e.target.value })
                }
                placeholder="Field label"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <select
                value={field.fieldType}
                onChange={(e) =>
                  onUpdate(index, {
                    ...field,
                    fieldType: e.target.value as FieldConfig["fieldType"],
                    options:
                      e.target.value === "SCALE"
                        ? { min: 0, max: 10, minLabel: "", maxLabel: "" }
                        : e.target.value === "MULTI_CHECK"
                          ? { choices: [""] }
                          : null,
                  })
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {ft.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scale options */}
          {field.fieldType === "SCALE" && (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Min</Label>
                <Input
                  type="number"
                  value={field.options?.min ?? 0}
                  onChange={(e) =>
                    onUpdate(index, {
                      ...field,
                      options: { ...field.options, min: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Max</Label>
                <Input
                  type="number"
                  value={field.options?.max ?? 10}
                  onChange={(e) =>
                    onUpdate(index, {
                      ...field,
                      options: { ...field.options, max: parseInt(e.target.value) || 10 },
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Min Label</Label>
                <Input
                  value={field.options?.minLabel ?? ""}
                  onChange={(e) =>
                    onUpdate(index, {
                      ...field,
                      options: { ...field.options, minLabel: e.target.value },
                    })
                  }
                  placeholder="e.g., None"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Max Label</Label>
                <Input
                  value={field.options?.maxLabel ?? ""}
                  onChange={(e) =>
                    onUpdate(index, {
                      ...field,
                      options: { ...field.options, maxLabel: e.target.value },
                    })
                  }
                  placeholder="e.g., Extreme"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Multi-check choices */}
          {field.fieldType === "MULTI_CHECK" && (
            <div>
              <Label className="text-xs">Choices</Label>
              <div className="mt-1 space-y-1">
                {(field.options?.choices || []).map((choice: string, ci: number) => (
                  <div key={ci} className="flex items-center gap-2">
                    <Input
                      value={choice}
                      onChange={(e) => {
                        const choices = [...(field.options?.choices || [])];
                        choices[ci] = e.target.value;
                        onUpdate(index, {
                          ...field,
                          options: { ...field.options, choices },
                        });
                      }}
                      placeholder={`Choice ${ci + 1}`}
                      className="flex-1"
                    />
                    <button
                      onClick={() => {
                        const choices = (field.options?.choices || []).filter(
                          (_: string, i: number) => i !== ci
                        );
                        onUpdate(index, {
                          ...field,
                          options: { ...field.options, choices },
                        });
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
                onClick={() => {
                  const choices = [...(field.options?.choices || []), ""];
                  onUpdate(index, {
                    ...field,
                    options: { ...field.options, choices },
                  });
                }}
                className="mt-1"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add choice
              </Button>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={field.isRequired}
              onChange={(e) =>
                onUpdate(index, { ...field, isRequired: e.target.checked })
              }
              className="accent-primary"
            />
            Required
          </label>
        </div>

        <button
          onClick={() => onDelete(index)}
          className="mt-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Editor ─────────────────────────────────────

export default function TrackerEditorPage() {
  const params = useParams();
  const trackerId = params.trackerId as string;

  const { data: tracker, isLoading } = useDailyTracker(trackerId);
  const updateTracker = useUpdateDailyTracker(trackerId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reminderTime, setReminderTime] = useState("20:00");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (tracker) {
      setName(tracker.name);
      setDescription(tracker.description || "");
      setReminderTime(tracker.reminderTime);
      setIsActive(tracker.isActive);
      setFields(
        tracker.fields.map((f) => ({
          id: f.id,
          label: f.label,
          fieldType: f.fieldType,
          options: f.options,
          sortOrder: f.sortOrder,
          isRequired: f.isRequired,
        }))
      );
    }
  }, [tracker]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const markChanged = useCallback(() => setHasChanges(true), []);

  const handleUpdateField = (index: number, field: FieldConfig) => {
    setFields((prev) => prev.map((f, i) => (i === index ? field : f)));
    markChanged();
  };

  const handleDeleteField = (index: number) => {
    setFields((prev) =>
      prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, sortOrder: i }))
    );
    markChanged();
  };

  const handleAddField = () => {
    setFields((prev) => [
      ...prev,
      {
        label: "",
        fieldType: "SCALE",
        options: { min: 0, max: 10, minLabel: "", maxLabel: "" },
        sortOrder: prev.length,
        isRequired: true,
      },
    ]);
    markChanged();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).split("-")[1]);
    const newIndex = parseInt(String(over.id).split("-")[1]);
    setFields((prev) =>
      arrayMove(prev, oldIndex, newIndex).map((f, i) => ({ ...f, sortOrder: i }))
    );
    markChanged();
  };

  const handleSave = async () => {
    await updateTracker.mutateAsync({
      name,
      description: description || undefined,
      reminderTime,
      isActive,
      fields: fields.map((f) => ({
        label: f.label,
        fieldType: f.fieldType,
        options: f.options,
        sortOrder: f.sortOrder,
        isRequired: f.isRequired,
      })),
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (!tracker) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tracker not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-end mb-6">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateTracker.isPending || !hasChanges}
        >
          {updateTracker.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Tracker Settings */}
      <div className="space-y-4 rounded-lg border bg-muted/30 p-4 mb-6">
        <h3 className="text-sm font-semibold">Tracker Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                markChanged();
              }}
              placeholder="Tracker name"
              className="mt-1"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                markChanged();
              }}
              placeholder="Brief description for the client"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Reminder Time</Label>
            <Input
              type="time"
              value={reminderTime}
              onChange={(e) => {
                setReminderTime(e.target.value);
                markChanged();
              }}
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm mb-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => {
                  setIsActive(e.target.checked);
                  markChanged();
                }}
                className="accent-primary"
              />
              Active
              <Badge
                variant="outline"
                className={
                  isActive
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-gray-100 text-gray-800 border-gray-200"
                }
              >
                {isActive ? "on" : "off"}
              </Badge>
            </label>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Fields ({fields.length})
        </h3>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={fields.map((_, i) => `field-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {fields.map((field, i) => (
              <SortableFieldEditor
                key={`field-${i}`}
                field={field}
                index={i}
                onUpdate={handleUpdateField}
                onDelete={handleDeleteField}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddField}
        className="mt-3"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Field
      </Button>
    </div>
  );
}
