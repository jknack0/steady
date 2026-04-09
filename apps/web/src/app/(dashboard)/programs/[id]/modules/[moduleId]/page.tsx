"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  useParts,
  useCreatePart,
  useUpdatePart,
  useDeletePart,
  useReorderParts,
} from "@/hooks/use-parts";
import { useUpdateModule } from "@/hooks/use-modules";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAutosave } from "@/hooks/use-autosave";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SaveIndicator } from "@/components/save-indicator";
import { PartCard, PART_TYPE_CONFIG } from "@/components/part-card";
import { CreatePartModal, EditPartModal } from "@/components/part-editor-modal";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Module } from "@/hooks/use-programs";

const PhonePreviewModal = dynamic(
  () =>
    import("@/components/phone-preview-modal").then(
      (mod) => mod.PhonePreviewModal
    ),
  { ssr: false }
);


export default function ModuleEditorPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;
  const moduleId = params.moduleId as string;

  const queryClient = useQueryClient();
  const updateModule = useUpdateModule(programId);
  const { data: parts, isLoading: partsLoading } = useParts(programId, moduleId);
  const createPart = useCreatePart(programId, moduleId);
  const updatePart = useUpdatePart(programId, moduleId);
  const deletePart = useDeletePart(programId, moduleId);
  const reorderParts = useReorderParts(programId, moduleId);

  // Fetch all modules for this program (for navigation + current module)
  const { data: allModules, isLoading: moduleLoading } = useQuery<Module[]>({
    queryKey: ["modules", programId],
    queryFn: () => api.get<Module[]>(`/api/programs/${programId}/modules`),
  });

  const module = allModules?.find((m) => m.id === moduleId);
  const currentIndex = allModules?.findIndex((m) => m.id === moduleId) ?? -1;
  const prevModule = currentIndex > 0 ? allModules![currentIndex - 1] : null;
  const nextModule = allModules && currentIndex < allModules.length - 1 ? allModules[currentIndex + 1] : null;

  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<"content" | "settings">("content");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPartId, setPreviewPartId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [summaryValue, setSummaryValue] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [editPartId, setEditPartId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Module field auto-save
  const moduleFieldSaveFn = useCallback(
    async (data: any) => {
      await updateModule.mutateAsync({ id: moduleId, data });
      queryClient.invalidateQueries({ queryKey: ["module", programId, moduleId] });
    },
    [updateModule, moduleId, programId, queryClient]
  );
  const { save: saveModuleField, status: moduleSaveStatus } = useAutosave(moduleFieldSaveFn, 1000);

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== module?.title) {
      saveModuleField({ title: titleValue.trim() });
    }
  };

  const handleSummaryBlur = () => {
    setEditingSummary(false);
    if (summaryValue !== (module?.summary ?? "")) {
      saveModuleField({ summary: summaryValue.trim() || undefined });
    }
  };

  const handleCreatePart = async (data: { type: string; title: string; isRequired: boolean; content: any }) => {
    await createPart.mutateAsync({
      type: data.type as any,
      title: data.title,
      isRequired: data.isRequired,
      content: data.content,
    });
  };

  const handlePartUpdate = useCallback(
    async (partId: string, data: any) => {
      await updatePart.mutateAsync({ id: partId, data });
    },
    [updatePart]
  );

  const handlePartDelete = (partId: string) => {
    confirm({
      title: "Delete part",
      description: "Delete this part? This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: () => deletePart.mutate(partId),
    });
  };

  const handlePartDuplicate = async (partId: string) => {
    const part = parts?.find((p) => p.id === partId);
    if (!part) return;
    await createPart.mutateAsync({
      type: part.type as any,
      title: `${part.title} (Copy)`,
      isRequired: part.isRequired,
      content: part.content as any,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !parts) return;
    const oldIndex = parts.findIndex((p) => p.id === active.id);
    const newIndex = parts.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(parts, oldIndex, newIndex);
    reorderParts.mutate(reordered.map((p) => p.id));
  };

  if (moduleLoading || partsLoading) {
    return <LoadingState />;
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Module not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back + Module Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/programs/${programId}`)}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Program
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={!prevModule}
            onClick={() => prevModule && router.push(`/programs/${programId}/modules/${prevModule.id}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {currentIndex + 1} / {allModules?.length ?? 0}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!nextModule}
            onClick={() => nextModule && router.push(`/programs/${programId}/modules/${nextModule.id}`)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Module Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
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
                setTitleValue(module.title);
                setEditingTitle(true);
              }}
            >
              {module.title}
            </h1>
          )}
          <SaveIndicator status={moduleSaveStatus} />
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => { setPreviewPartId(null); setPreviewOpen(true); }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
        </div>

        {editingSummary ? (
          <Textarea
            value={summaryValue}
            onChange={(e) => setSummaryValue(e.target.value)}
            onBlur={handleSummaryBlur}
            placeholder="Module summary..."
            className="mt-2"
            rows={3}
            autoFocus
          />
        ) : (
          <p
            className="text-sm text-muted-foreground mt-2 cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 transition-colors"
            onClick={() => {
              setSummaryValue(module.summary ?? "");
              setEditingSummary(true);
            }}
          >
            {module.summary || "Click to add a summary..."}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {([
          { key: "content" as const, label: "Content" },
          { key: "settings" as const, label: "Settings" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Unlock Rule</Label>
            <Select
              value={module.unlockRule}
              onValueChange={(v) => saveModuleField({ unlockRule: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEQUENTIAL">Sequential</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="TIME_BASED">Time-Based</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {module.unlockRule === "TIME_BASED" && (
            <div className="grid gap-2">
              <Label>Unlock Delay (days)</Label>
              <Input
                type="number"
                min={1}
                value={module.unlockDelayDays ?? ""}
                onChange={(e) =>
                  saveModuleField({ unlockDelayDays: parseInt(e.target.value) || undefined } as any)
                }
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Estimated Time (minutes)</Label>
            <Input
              type="number"
              min={1}
              value={module.estimatedMinutes ?? ""}
              onChange={(e) =>
                saveModuleField({ estimatedMinutes: parseInt(e.target.value) || undefined })
              }
            />
          </div>
        </div>
      )}

      {/* Content Tab — Parts List */}
      {activeTab === "content" && <>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Parts</h2>
          <Button size="sm" variant="outline" disabled={createPart.isPending} onClick={() => setAddPartOpen(true)}>
            {createPart.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Part
          </Button>
        </div>

        {parts && parts.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={parts.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {parts.map((part) => (
                  <PartCard
                    key={part.id}
                    part={part}
                    onClick={() => setEditPartId(part.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-muted-foreground mb-3">No parts yet</p>
            <Button size="sm" variant="outline" onClick={() => setAddPartOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Part
            </Button>
          </div>
        )}
      </div>
      </>}

      {/* Add Part Modal */}
      <CreatePartModal
        open={addPartOpen}
        onOpenChange={setAddPartOpen}
        onCreate={handleCreatePart}
        isPending={createPart.isPending}
      />

      {/* Edit Part Modal */}
      <EditPartModal
        open={!!editPartId}
        onOpenChange={(open) => { if (!open) setEditPartId(null); }}
        part={parts?.find((p) => p.id === editPartId) || null}
        onSave={(data) => handlePartUpdate(editPartId!, data)}
        onDelete={() => { handlePartDelete(editPartId!); setEditPartId(null); }}
        onDuplicate={() => { handlePartDuplicate(editPartId!); setEditPartId(null); }}
      />

      <PhonePreviewModal
        programId={programId}
        partId={previewPartId}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
      {confirmDialog}
    </div>
  );
}
