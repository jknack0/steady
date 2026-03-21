"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProgram, useUpdateProgram } from "@/hooks/use-programs";
import {
  useCreateModule,
  useDeleteModule,
  useReorderModules,
} from "@/hooks/use-modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Eye,
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
import type { Module } from "@/hooks/use-programs";
import { EnrollmentSection } from "@/components/enrollment-section";
import { PhonePreviewModal } from "@/components/phone-preview-modal";
import Link from "next/link";

function SortableModuleCard({
  module,
  programId,
  onDelete,
}: {
  module: Module;
  programId: string;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm"
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <Link
        href={`/programs/${programId}/modules/${module.id}`}
        className="flex flex-1 items-center justify-between hover:bg-accent/50 rounded-md p-1 -m-1 transition-colors"
      >
        <div className="flex-1">
          <h3 className="font-medium">{module.title}</h3>
          {module.subtitle && (
            <p className="text-sm text-muted-foreground">{module.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {module.estimatedMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {module.estimatedMinutes}m
            </span>
          )}
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {module.partCount ?? 0} parts
          </span>
        </div>
      </Link>

      <button
        onClick={() => onDelete(module.id)}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddModuleForm({
  programId,
  onDone,
}: {
  programId: string;
  onDone: () => void;
}) {
  const createModule = useCreateModule(programId);
  const [title, setTitle] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createModule.mutateAsync({ title: title.trim() });
    setTitle("");
    onDone();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border border-dashed p-4"
    >
      <Input
        placeholder="New module title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1"
        autoFocus
      />
      <Button type="submit" size="sm" disabled={createModule.isPending || !title.trim()}>
        {createModule.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Add"
        )}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

export default function ProgramEditorPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;
  const { data: program, isLoading } = useProgram(programId);
  const updateProgram = useUpdateProgram(programId);
  const deleteModule = useDeleteModule(programId);
  const reorderModules = useReorderModules(programId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addingModule, setAddingModule] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [descValue, setDescValue] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !program?.modules) return;

      const oldIndex = program.modules.findIndex((m) => m.id === active.id);
      const newIndex = program.modules.findIndex((m) => m.id === over.id);
      const reordered = arrayMove(program.modules, oldIndex, newIndex);
      reorderModules.mutate(reordered.map((m) => m.id));
    },
    [program?.modules, reorderModules]
  );

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== program?.title) {
      updateProgram.mutate({ title: titleValue.trim() });
    }
  };

  const handleDescBlur = () => {
    setEditingDesc(false);
    const newDesc = descValue.trim() || undefined;
    if (descValue !== (program?.description ?? "")) {
      updateProgram.mutate({ description: newDesc });
    }
  };

  const handleStatusToggle = () => {
    if (!program) return;
    const newStatus = program.status === "DRAFT" ? "PUBLISHED" : "DRAFT";
    updateProgram.mutate({ status: newStatus as any });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Program not found</p>
        <Button variant="link" onClick={() => router.push("/programs")}>
          Back to programs
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => router.push("/programs")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Programs
      </Button>

      {/* Program Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          {editingTitle ? (
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()}
              className="text-2xl font-bold h-auto py-1"
              autoFocus
            />
          ) : (
            <h1
              className="text-3xl font-bold cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 transition-colors"
              onClick={() => {
                setTitleValue(program.title);
                setEditingTitle(true);
              }}
            >
              {program.title}
            </h1>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Badge
              variant="outline"
              className={
                program.status === "PUBLISHED"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-yellow-100 text-yellow-800 border-yellow-200"
              }
            >
              {program.status.toLowerCase()}
            </Badge>
          </div>
        </div>

        {editingDesc ? (
          <Input
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={handleDescBlur}
            onKeyDown={(e) => e.key === "Enter" && handleDescBlur()}
            placeholder="Add a description..."
            className="text-muted-foreground"
            autoFocus
          />
        ) : (
          <p
            className="text-muted-foreground cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 transition-colors"
            onClick={() => {
              setDescValue(program.description ?? "");
              setEditingDesc(true);
            }}
          >
            {program.description || "Click to add a description..."}
          </p>
        )}
      </div>

      {/* Settings Panel (collapsible) */}
      <div className="mb-8 rounded-lg border">
        <button
          className="flex w-full items-center justify-between p-4 text-left font-medium"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          Program Settings
          {settingsOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {settingsOpen && (
          <div className="border-t p-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Cadence</Label>
                <Select
                  value={program.cadence}
                  onValueChange={(v) => updateProgram.mutate({ cadence: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                    <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Enrollment</Label>
                <Select
                  value={program.enrollmentMethod}
                  onValueChange={(v) =>
                    updateProgram.mutate({ enrollmentMethod: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVITE">Invite Only</SelectItem>
                    <SelectItem value="LINK">Link</SelectItem>
                    <SelectItem value="CODE">Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Session Type</Label>
                <Select
                  value={program.sessionType}
                  onValueChange={(v) =>
                    updateProgram.mutate({ sessionType: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_ON_ONE">One-on-One</SelectItem>
                    <SelectItem value="GROUP">Group</SelectItem>
                    <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Follow-up Count</Label>
                <Input
                  type="number"
                  min={0}
                  value={program.followUpCount}
                  onChange={(e) =>
                    updateProgram.mutate({
                      followUpCount: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Button
                  variant="outline"
                  onClick={handleStatusToggle}
                  className="justify-start"
                >
                  {program.status === "DRAFT"
                    ? "Publish Program"
                    : "Revert to Draft"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Module List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Modules</h2>
          {!addingModule && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingModule(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Module
            </Button>
          )}
        </div>

        {program.modules && program.modules.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={program.modules.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {program.modules.map((mod) => (
                  <SortableModuleCard
                    key={mod.id}
                    module={mod}
                    programId={programId}
                    onDelete={(id) => {
                      if (confirm("Delete this module and all its parts?")) {
                        deleteModule.mutate(id);
                      }
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          !addingModule && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <Layers className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">No modules yet</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingModule(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add First Module
              </Button>
            </div>
          )
        )}

        {addingModule && (
          <div className="mt-2">
            <AddModuleForm
              programId={programId}
              onDone={() => setAddingModule(false)}
            />
          </div>
        )}
      </div>

      {/* Enrollments */}
      <EnrollmentSection programId={programId} programStatus={program.status} />

      <PhonePreviewModal
        programId={programId}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
