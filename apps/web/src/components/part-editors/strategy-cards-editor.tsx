"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
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

interface Card {
  title: string;
  body: string;
  emoji?: string;
}

interface StrategyCardsEditorProps {
  content: { type: "STRATEGY_CARDS"; deckName: string; cards: Card[] };
  onChange: (content: any) => void;
}

function SortableCard({
  card,
  index,
  onUpdate,
  onDelete,
}: {
  card: Card;
  index: number;
  onUpdate: (index: number, card: Card) => void;
  onDelete: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 rounded-lg border bg-background p-3">
      <button className="cursor-grab touch-none text-muted-foreground mt-1" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Emoji"
            value={card.emoji || ""}
            onChange={(e) => onUpdate(index, { ...card, emoji: e.target.value })}
            className="w-16 text-center"
          />
          <Input
            placeholder="Card title"
            value={card.title}
            onChange={(e) => onUpdate(index, { ...card, title: e.target.value })}
            className="flex-1"
          />
        </div>
        <Textarea
          placeholder="Card body text..."
          value={card.body}
          onChange={(e) => onUpdate(index, { ...card, body: e.target.value })}
          rows={2}
        />
      </div>
      <button
        onClick={() => onDelete(index)}
        className="text-muted-foreground hover:text-destructive mt-1"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StrategyCardsPartEditor({ content, onChange }: StrategyCardsEditorProps) {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCardUpdate = (index: number, card: Card) => {
    const cards = [...content.cards];
    cards[index] = card;
    onChange({ ...content, cards });
  };

  const handleCardDelete = (index: number) => {
    confirm({
      title: "Delete card",
      description: "Delete this card?",
      confirmLabel: "Delete",
      onConfirm: () => {
        const cards = content.cards.filter((_, i) => i !== index);
        onChange({ ...content, cards });
      },
    });
  };

  const handleAddCard = () => {
    onChange({
      ...content,
      cards: [...content.cards, { title: "", body: "", emoji: "" }],
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).split("-")[1]);
    const newIndex = parseInt(String(over.id).split("-")[1]);
    onChange({ ...content, cards: arrayMove(content.cards, oldIndex, newIndex) });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Deck Name</Label>
        <Input
          placeholder="e.g., Memory Strategies"
          value={content.deckName || ""}
          onChange={(e) => onChange({ ...content, deckName: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Cards</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={content.cards.map((_, i) => `card-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {content.cards.map((card, i) => (
                <SortableCard
                  key={`card-${i}`}
                  card={card}
                  index={i}
                  onUpdate={handleCardUpdate}
                  onDelete={handleCardDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button type="button" variant="outline" size="sm" onClick={handleAddCard}>
          <Plus className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </div>
      {confirmDialog}
    </div>
  );
}
