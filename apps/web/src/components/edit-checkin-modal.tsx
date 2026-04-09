"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, X, Plus } from "lucide-react";
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
import { useUpdateDailyTracker } from "@/hooks/use-daily-trackers";
import type { TrackerFieldType } from "@steady/shared";

const FIELD_TYPE_LABELS: Record<TrackerFieldType, string> = {
  SCALE: "Scale",
  NUMBER: "Number",
  YES_NO: "Yes/No",
  MULTI_CHECK: "Multi-Check",
  FREE_TEXT: "Free Text",
  TIME: "Time",
  FEELINGS_WHEEL: "Feelings Wheel",
};

const FIELD_TYPES: TrackerFieldType[] = [
  "SCALE",
  "NUMBER",
  "YES_NO",
  "MULTI_CHECK",
  "FREE_TEXT",
  "TIME",
  "FEELINGS_WHEEL",
];

interface LocalField {
  id?: string;
  label: string;
  fieldType: TrackerFieldType;
  options: { min: number; max: number; minLabel?: string; maxLabel?: string } | { choices: string[] } | { maxSelections: number } | null;
  sortOrder: number;
  isRequired: boolean;
}

interface EditCheckinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackerId: string;
  participantId: string;
  fields: Array<{
    id?: string;
    label: string;
    fieldType: string;
    options: any;
    sortOrder: number;
    isRequired: boolean;
  }>;
}

function SortableField({
  field,
  index,
  onDelete,
}: {
  field: LocalField;
  index: number;
  onDelete: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `field-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-background p-2"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm font-medium truncate">{field.label}</span>
      <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {FIELD_TYPE_LABELS[field.fieldType] ?? field.fieldType}
      </span>
      <button
        type="button"
        onClick={() => onDelete(index)}
        className="text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function EditCheckinModal({
  open,
  onOpenChange,
  trackerId,
  participantId,
  fields,
}: EditCheckinModalProps) {
  const queryClient = useQueryClient();
  const updateTracker = useUpdateDailyTracker(trackerId);

  const [localFields, setLocalFields] = useState<LocalField[]>([]);
  const [newFieldType, setNewFieldType] = useState<TrackerFieldType>("SCALE");
  const [newFieldLabel, setNewFieldLabel] = useState("");

  // Type-specific option state
  const [scaleMin, setScaleMin] = useState(1);
  const [scaleMax, setScaleMax] = useState(10);
  const [scaleMinLabel, setScaleMinLabel] = useState("");
  const [scaleMaxLabel, setScaleMaxLabel] = useState("");
  const [multiCheckChoices, setMultiCheckChoices] = useState("");

  // Reset local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalFields(
        fields.map((f) => ({
          ...f,
          fieldType: f.fieldType as TrackerFieldType,
        }))
      );
      setNewFieldLabel("");
      setNewFieldType("SCALE");
      setScaleMin(1);
      setScaleMax(10);
      setScaleMinLabel("");
      setScaleMaxLabel("");
      setMultiCheckChoices("");
    }
  }, [open, fields]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).split("-")[1]);
    const newIndex = parseInt(String(over.id).split("-")[1]);
    setLocalFields((prev) =>
      arrayMove(prev, oldIndex, newIndex).map((f, i) => ({ ...f, sortOrder: i }))
    );
  };

  const handleDeleteField = (index: number) => {
    setLocalFields((prev) =>
      prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, sortOrder: i }))
    );
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;

    let options: LocalField["options"] = null;

    if (newFieldType === "SCALE") {
      options = {
        min: scaleMin,
        max: scaleMax,
        ...(scaleMinLabel ? { minLabel: scaleMinLabel } : {}),
        ...(scaleMaxLabel ? { maxLabel: scaleMaxLabel } : {}),
      };
    } else if (newFieldType === "MULTI_CHECK") {
      const choices = multiCheckChoices
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (choices.length === 0) return;
      options = { choices };
    } else if (newFieldType === "FEELINGS_WHEEL") {
      options = { maxSelections: 3 };
    }

    setLocalFields((prev) => [
      ...prev,
      {
        label: newFieldLabel.trim(),
        fieldType: newFieldType,
        options,
        sortOrder: prev.length,
        isRequired: true,
      },
    ]);

    // Reset add form
    setNewFieldLabel("");
    setScaleMin(1);
    setScaleMax(10);
    setScaleMinLabel("");
    setScaleMaxLabel("");
    setMultiCheckChoices("");
  };

  const handleSave = () => {
    updateTracker.mutate(
      {
        fields: localFields.map((f) => ({
          label: f.label,
          fieldType: f.fieldType,
          options: f.options,
          sortOrder: f.sortOrder,
          isRequired: f.isRequired,
        })),
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["participant-checkin", participantId] });
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Edit Check-in</DialogTitle>
          <DialogDescription>
            Add, remove, or reorder fields for this client&apos;s daily check-in.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {/* Field list */}
          {localFields.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No fields yet. Add one below.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={localFields.map((_, i) => `field-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {localFields.map((field, i) => (
                    <SortableField
                      key={`field-${i}`}
                      field={field}
                      index={i}
                      onDelete={handleDeleteField}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add field section */}
          <div className="mt-6 rounded-md border p-4 space-y-3">
            <h4 className="text-sm font-medium">Add Field</h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="new-field-type" className="text-xs">
                  Type
                </Label>
                <select
                  id="new-field-type"
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as TrackerFieldType)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {FIELD_TYPE_LABELS[ft]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-field-label" className="text-xs">
                  Label
                </Label>
                <Input
                  id="new-field-label"
                  placeholder="e.g., Mood"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                />
              </div>
            </div>

            {/* Type-specific options */}
            {newFieldType === "SCALE" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="scale-min" className="text-xs">
                    Min
                  </Label>
                  <Input
                    id="scale-min"
                    type="number"
                    value={scaleMin}
                    onChange={(e) => setScaleMin(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="scale-max" className="text-xs">
                    Max
                  </Label>
                  <Input
                    id="scale-max"
                    type="number"
                    value={scaleMax}
                    onChange={(e) => setScaleMax(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="scale-min-label" className="text-xs">
                    Min Label (optional)
                  </Label>
                  <Input
                    id="scale-min-label"
                    placeholder="e.g., Low"
                    value={scaleMinLabel}
                    onChange={(e) => setScaleMinLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="scale-max-label" className="text-xs">
                    Max Label (optional)
                  </Label>
                  <Input
                    id="scale-max-label"
                    placeholder="e.g., High"
                    value={scaleMaxLabel}
                    onChange={(e) => setScaleMaxLabel(e.target.value)}
                  />
                </div>
              </div>
            )}

            {newFieldType === "MULTI_CHECK" && (
              <div className="space-y-1">
                <Label htmlFor="multi-choices" className="text-xs">
                  Choices (comma-separated)
                </Label>
                <Input
                  id="multi-choices"
                  placeholder="e.g., Exercise, Meditation, Journaling"
                  value={multiCheckChoices}
                  onChange={(e) => setMultiCheckChoices(e.target.value)}
                />
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleAddField} disabled={!newFieldLabel.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
        </DialogBody>
        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateTracker.isPending}>
            {updateTracker.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
