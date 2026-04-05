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

type FieldType = "TEXT" | "TEXTAREA" | "SELECT" | "MULTI_SELECT" | "DATE" | "NUMBER" | "CHECKBOX";

interface IntakeField {
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  required: boolean;
  section: string;
  sortOrder: number;
}

interface IntakeFormContent {
  type: "INTAKE_FORM";
  title: string;
  instructions: string;
  sections: string[];
  fields: IntakeField[];
}

interface IntakeFormEditorProps {
  content: IntakeFormContent;
  onChange: (content: IntakeFormContent) => void;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Text",
  TEXTAREA: "Long Text",
  SELECT: "Dropdown",
  MULTI_SELECT: "Multi-Select",
  DATE: "Date",
  NUMBER: "Number",
  CHECKBOX: "Checkbox",
};

// ── Sortable Field ───────────────────────────────────

function SortableField({
  field,
  index,
  sections,
  onUpdate,
  onDelete,
}: {
  field: IntakeField;
  index: number;
  sections: string[];
  onUpdate: (index: number, f: IntakeField) => void;
  onDelete: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `field-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const update = (patch: Partial<IntakeField>) => {
    onUpdate(index, { ...field, ...patch });
  };

  const hasOptions = field.type === "SELECT" || field.type === "MULTI_SELECT";

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <button className="cursor-grab touch-none text-muted-foreground" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[field.type]}</span>
        <span className="flex-1 text-sm truncate">{field.label || "Untitled field"}</span>
        <button onClick={() => onDelete(index)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pl-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Label</Label>
              <Input
                value={field.label}
                onChange={(e) => update({ label: e.target.value })}
                placeholder="Field label..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={field.type} onValueChange={(v) => {
                const newType = v as FieldType;
                const patch: Partial<IntakeField> = { type: newType };
                if ((newType === "SELECT" || newType === "MULTI_SELECT") && (!field.options || field.options.length === 0)) {
                  patch.options = ["Option 1", "Option 2"];
                }
                update(patch);
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Section</Label>
              <Select value={field.section} onValueChange={(v) => update({ section: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={field.placeholder ?? ""}
                onChange={(e) => update({ placeholder: e.target.value })}
                placeholder="Optional placeholder text"
                className="mt-1"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => update({ required: e.target.checked })}
              className="accent-primary"
            />
            Required
          </label>

          {/* Options for SELECT / MULTI_SELECT */}
          {hasOptions && (
            <div className="space-y-2">
              <Label className="text-xs">Options</Label>
              {(field.options || []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const opts = [...(field.options || [])];
                      opts[oi] = e.target.value;
                      update({ options: opts });
                    }}
                    placeholder={`Option ${oi + 1}`}
                    className="flex-1"
                  />
                  <button
                    onClick={() => update({ options: (field.options || []).filter((_, i) => i !== oi) })}
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
                onClick={() => update({ options: [...(field.options || []), ""] })}
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

export function IntakeFormPartEditor({ content, onChange }: IntakeFormEditorProps) {
  const [newSection, setNewSection] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const safeContent: IntakeFormContent = {
    type: "INTAKE_FORM",
    title: content.title ?? "",
    instructions: content.instructions ?? "",
    sections: content.sections?.length ? content.sections : ["General"],
    fields: content.fields ?? [],
  };

  const updateField = (patch: Partial<IntakeFormContent>) => {
    onChange({ ...safeContent, ...patch });
  };

  const addField = (type: FieldType) => {
    const field: IntakeField = {
      label: "",
      type,
      required: true,
      section: safeContent.sections[0] || "General",
      sortOrder: safeContent.fields.length,
    };
    if (type === "SELECT" || type === "MULTI_SELECT") {
      field.options = ["Option 1", "Option 2"];
    }
    updateField({ fields: [...safeContent.fields, field] });
  };

  const updateFieldAtIndex = (index: number, f: IntakeField) => {
    const fields = safeContent.fields.map((existing, i) => (i === index ? f : existing));
    updateField({ fields });
  };

  const deleteField = (index: number) => {
    const fields = safeContent.fields
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, sortOrder: i }));
    updateField({ fields });
  };

  const addSection = () => {
    if (newSection.trim() && !safeContent.sections.includes(newSection.trim())) {
      updateField({ sections: [...safeContent.sections, newSection.trim()] });
      setNewSection("");
    }
  };

  const removeSection = (s: string) => {
    if (safeContent.sections.length <= 1) return;
    const fallback = safeContent.sections.find((sec) => sec !== s) || "General";
    const fields = safeContent.fields.map((f) => (f.section === s ? { ...f, section: fallback } : f));
    updateField({
      sections: safeContent.sections.filter((sec) => sec !== s),
      fields,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).split("-")[1]);
    const newIndex = parseInt(String(over.id).split("-")[1]);
    const reordered = arrayMove(safeContent.fields, oldIndex, newIndex).map((f, i) => ({
      ...f,
      sortOrder: i,
    }));
    updateField({ fields: reordered });
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div>
        <Label className="text-xs">Instructions</Label>
        <Textarea
          value={safeContent.instructions}
          onChange={(e) => updateField({ instructions: e.target.value })}
          placeholder="Please complete all required fields..."
          className="mt-1"
          rows={2}
        />
      </div>

      {/* Sections */}
      <div>
        <Label className="text-xs mb-2 block">Sections</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {safeContent.sections.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
              {s}
              {safeContent.sections.length > 1 && (
                <button onClick={() => removeSection(s)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            placeholder="New section name..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && addSection()}
          />
          <Button type="button" variant="outline" size="sm" onClick={addSection}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
      </div>

      {/* Fields */}
      <div>
        <Label className="text-xs mb-2 block">Fields ({safeContent.fields.length})</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={safeContent.fields.map((_, i) => `field-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {safeContent.fields.map((f, i) => (
                <SortableField
                  key={`field-${i}`}
                  field={f}
                  index={i}
                  sections={safeContent.sections}
                  onUpdate={updateFieldAtIndex}
                  onDelete={deleteField}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Add field buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(([type, label]) => (
          <Button key={type} type="button" variant="outline" size="sm" onClick={() => addField(type)}>
            <Plus className="mr-1 h-3 w-3" /> {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
