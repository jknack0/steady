"use client";

import { useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SaveIndicator } from "@/components/save-indicator";
import { useAutosave } from "@/hooks/use-autosave";
import {
  TextPartEditor,
  VideoPartEditor,
  StrategyCardsPartEditor,
  JournalPromptPartEditor,
  ChecklistPartEditor,
  ResourceLinkPartEditor,
  DividerPartEditor,
  HomeworkPartEditor,
  AssessmentPartEditor,
  IntakeFormPartEditor,
  SmartGoalsPartEditor,
} from "@/components/part-editors";
import type { Part } from "@/hooks/use-parts";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  MoreVertical,
  Pencil,
  ToggleLeft,
  Trash2,
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
} from "lucide-react";

const PART_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  TEXT: { icon: FileText, label: "Text", color: "text-blue-600" },
  VIDEO: { icon: Video, label: "Video", color: "text-purple-600" },
  STRATEGY_CARDS: { icon: Layers, label: "Strategy Cards", color: "text-amber-600" },
  JOURNAL_PROMPT: { icon: BookOpen, label: "Journal Prompt", color: "text-green-600" },
  CHECKLIST: { icon: CheckSquare, label: "Checklist", color: "text-teal-600" },
  RESOURCE_LINK: { icon: Link, label: "Resource Link", color: "text-sky-brand" },
  DIVIDER: { icon: Minus, label: "Divider", color: "text-gray-500" },
  HOMEWORK: { icon: ClipboardList, label: "Homework", color: "text-orange-600" },
  ASSESSMENT: { icon: FileQuestion, label: "Assessment", color: "text-red-600" },
  INTAKE_FORM: { icon: FormInput, label: "Intake Form", color: "text-pink-600" },
  SMART_GOALS: { icon: Target, label: "SMART Goals", color: "text-emerald-600" },
};

interface PartCardProps {
  part: Part;
  onUpdate: (data: { title?: string; isRequired?: boolean; content?: any }) => Promise<unknown>;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function PartCard({ part, onUpdate, onDelete, onDuplicate }: PartCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(part.title);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: part.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const contentSaveFn = useCallback(
    async (content: any) => {
      await onUpdate({ content });
    },
    [onUpdate]
  );

  const { save: saveContent, status: saveStatus } = useAutosave(contentSaveFn);

  const handleContentChange = (content: any) => {
    saveContent(content);
  };

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== part.title) {
      onUpdate({ title: titleValue.trim() });
    }
  };

  const typeConfig = PART_TYPE_CONFIG[part.type] || PART_TYPE_CONFIG.TEXT;
  const Icon = typeConfig.icon;

  const renderEditor = () => {
    const content = part.content as any;
    switch (part.type) {
      case "TEXT":
        return <TextPartEditor content={content} onChange={handleContentChange} />;
      case "VIDEO":
        return <VideoPartEditor content={content} onChange={handleContentChange} />;
      case "STRATEGY_CARDS":
        return <StrategyCardsPartEditor content={content} onChange={handleContentChange} />;
      case "JOURNAL_PROMPT":
        return <JournalPromptPartEditor content={content} onChange={handleContentChange} />;
      case "CHECKLIST":
        return <ChecklistPartEditor content={content} onChange={handleContentChange} />;
      case "RESOURCE_LINK":
        return <ResourceLinkPartEditor content={content} onChange={handleContentChange} />;
      case "DIVIDER":
        return <DividerPartEditor content={content} onChange={handleContentChange} />;
      case "HOMEWORK":
        return <HomeworkPartEditor content={content} onChange={handleContentChange} />;
      case "ASSESSMENT":
        return <AssessmentPartEditor content={content} onChange={handleContentChange} />;
      case "INTAKE_FORM":
        return <IntakeFormPartEditor content={content} onChange={handleContentChange} />;
      case "SMART_GOALS":
        return <SmartGoalsPartEditor content={content} onChange={handleContentChange} />;
      default:
        return (
          <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
            {typeConfig.label} editor coming in Phase 2
          </div>
        );
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card shadow-sm">
      {/* Card Header */}
      <div className="flex items-center gap-2 p-3">
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <Icon className={cn("h-4 w-4", typeConfig.color)} />

        {editingTitle ? (
          <Input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()}
            className="h-7 text-sm flex-1"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-sm font-medium cursor-pointer hover:text-primary truncate"
            onClick={() => setExpanded(!expanded)}
          >
            {part.title}
          </span>
        )}

        <SaveIndicator status={saveStatus} />

        <Badge variant={part.isRequired ? "default" : "secondary"} className="text-xs shrink-0">
          {part.isRequired ? "Required" : "Optional"}
        </Badge>

        <Badge variant="outline" className="text-xs shrink-0">
          {typeConfig.label}
        </Badge>

        {/* Dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-1 hover:bg-accent">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setTitleValue(part.title);
                setEditingTitle(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Title
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onUpdate({ isRequired: !part.isRequired })}
            >
              <ToggleLeft className="mr-2 h-4 w-4" />
              {part.isRequired ? "Mark Optional" : "Mark Required"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded Editor */}
      {expanded && (
        <div className="border-t px-4 py-4 pl-14">{renderEditor()}</div>
      )}
    </div>
  );
}

export { PART_TYPE_CONFIG };
