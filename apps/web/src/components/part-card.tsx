"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  FileText,
  Video,
  Layers,
  BookOpen,
  CheckSquare,
  Link,
  Minus,
  ClipboardList,
  FileQuestion,
  FormInput,
  Target,
  Sparkles,
} from "lucide-react";
import type { Part } from "@/hooks/use-parts";

const PART_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  TEXT: { icon: FileText, label: "Text", color: "text-blue-400" },
  VIDEO: { icon: Video, label: "Video", color: "text-purple-400" },
  STRATEGY_CARDS: { icon: Layers, label: "Strategy Cards", color: "text-amber-400" },
  JOURNAL_PROMPT: { icon: BookOpen, label: "Journal Prompt", color: "text-green-400" },
  CHECKLIST: { icon: CheckSquare, label: "Checklist", color: "text-teal" },
  RESOURCE_LINK: { icon: Link, label: "Resource Link", color: "text-sky-brand" },
  DIVIDER: { icon: Minus, label: "Divider", color: "text-warm-200" },
  HOMEWORK: { icon: ClipboardList, label: "Homework", color: "text-orange-400" },
  ASSESSMENT: { icon: FileQuestion, label: "Assessment", color: "text-rose" },
  INTAKE_FORM: { icon: FormInput, label: "Intake Form", color: "text-pink-400" },
  SMART_GOALS: { icon: Target, label: "SMART Goals", color: "text-sage" },
  STYLED_CONTENT: { icon: Sparkles, label: "Styled Content", color: "text-violet-400" },
  PDF: { icon: FileText, label: "PDF Document", color: "text-red-400" },
};

interface PartCardProps {
  part: Part;
  onClick: () => void;
}

export function PartCard({ part, onClick }: PartCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: part.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeConfig = PART_TYPE_CONFIG[part.type] || PART_TYPE_CONFIG.TEXT;
  const Icon = typeConfig.icon;

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center gap-2 p-3">
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <button
          onClick={onClick}
          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <Icon className={cn("h-4 w-4 shrink-0", typeConfig.color)} />
          <span className="text-sm font-medium truncate">{part.title}</span>
        </button>

        <Badge variant="outline" className="text-xs shrink-0">
          {typeConfig.label}
        </Badge>

        <Badge variant={part.isRequired ? "default" : "secondary"} className="text-xs shrink-0">
          {part.isRequired ? "Required" : "Optional"}
        </Badge>
      </div>
    </div>
  );
}

export { PART_TYPE_CONFIG };
