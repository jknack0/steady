"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
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

interface ChecklistItem {
  text: string;
  sortOrder: number;
}

interface ChecklistEditorProps {
  content: { type: "CHECKLIST"; items: ChecklistItem[] };
  onChange: (content: any) => void;
}

function SortableItem({
  item,
  index,
  onUpdate,
  onDelete,
}: {
  item: ChecklistItem;
  index: number;
  onUpdate: (index: number, text: string) => void;
  onDelete: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `item-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button className="cursor-grab touch-none text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="h-4 w-4 rounded border border-muted-foreground/30" />
      <Input
        placeholder={`Item ${index + 1}...`}
        value={item.text}
        onChange={(e) => onUpdate(index, e.target.value)}
        className="flex-1"
      />
      <button onClick={() => onDelete(index)} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ChecklistPartEditor({ content, onChange }: ChecklistEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleUpdate = (index: number, text: string) => {
    const items = content.items.map((item, i) => (i === index ? { ...item, text } : item));
    onChange({ ...content, items });
  };

  const handleDelete = (index: number) => {
    const items = content.items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, sortOrder: i }));
    onChange({ ...content, items });
  };

  const handleAdd = () => {
    onChange({
      ...content,
      items: [...content.items, { text: "", sortOrder: content.items.length }],
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).split("-")[1]);
    const newIndex = parseInt(String(over.id).split("-")[1]);
    const reordered = arrayMove(content.items, oldIndex, newIndex).map((item, i) => ({
      ...item,
      sortOrder: i,
    }));
    onChange({ ...content, items: reordered });
  };

  return (
    <div className="space-y-3">
      <Label>Checklist Items</Label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={content.items.map((_, i) => `item-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {content.items.map((item, i) => (
              <SortableItem
                key={`item-${i}`}
                item={item}
                index={i}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Add Item
      </Button>
    </div>
  );
}
