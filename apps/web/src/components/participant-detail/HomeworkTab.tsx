"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/loading-state";
import { CreatePartModal } from "@/components/part-editor-modal";
import {
  Plus,
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";

interface HWInstance {
  id: string;
  partId: string | null;
  participantId: string | null;
  enrollmentId: string | null;
  title: string | null;
  content: any;
  dueDate: string;
  status: "PENDING" | "COMPLETED" | "SKIPPED" | "MISSED";
  completedAt: string | null;
  response: Record<string, any> | null;
  part: { id: string; title: string; content: any; moduleId: string } | null;
}

interface HomeworkTabProps {
  participantId: string;
  participantProfileId: string;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "text-green-600",
  PENDING: "text-amber-600",
  SKIPPED: "text-gray-500",
  MISSED: "text-red-500",
};

export function HomeworkTab({ participantId, participantProfileId }: HomeworkTabProps) {
  const queryClient = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignPending, setAssignPending] = useState(false);

  const { data: instances, isLoading } = useQuery<HWInstance[]>({
    queryKey: ["participant-homework", participantId],
    queryFn: () => api.get(`/api/clinician/participants/${participantId}/homework`),
  });

  const handleCreateHomework = async (data: { type: string; title: string; isRequired: boolean; content: any }) => {
    setAssignPending(true);
    try {
      await api.post(`/api/clinician/participants/${participantId}/homework`, {
        title: data.title,
        content: data.content,
      });
      queryClient.invalidateQueries({ queryKey: ["participant-homework", participantId] });
      setShowAssign(false);
    } finally {
      setAssignPending(false);
    }
  };

  if (isLoading) return <LoadingState />;

  const pending = (instances || []).filter(i => i.status === "PENDING");
  const completed = (instances || []).filter(i => i.status === "COMPLETED");
  const other = (instances || []).filter(i => i.status !== "PENDING" && i.status !== "COMPLETED");

  const renderInstance = (inst: HWInstance) => {
    const hwTitle = inst.title || inst.part?.title || "Homework";
    const items = inst.content?.items || inst.part?.content?.items || [];
    const responses = inst.response || {};
    const hasResponses = Object.keys(responses).length > 0;
    const isExpanded = expandedId === inst.id;

    return (
      <div
        key={inst.id}
        className={cn("rounded-lg border p-4 transition-all", hasResponses && "cursor-pointer hover:shadow-sm")}
        onClick={() => hasResponses && setExpandedId(isExpanded ? null : inst.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn("h-2 w-2 rounded-full shrink-0", inst.status === "COMPLETED" ? "bg-green-500" : inst.status === "PENDING" ? "bg-amber-500" : inst.status === "MISSED" ? "bg-red-500" : "bg-gray-400")} />
            <span className="text-sm font-medium truncate">{hwTitle}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[inst.status])}>
              {inst.status.charAt(0) + inst.status.slice(1).toLowerCase()}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {new Date(inst.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            {hasResponses && (
              <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
            )}
          </div>
        </div>

        {/* Expanded responses */}
        {isExpanded && hasResponses && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {items.map((item: any, i: number) => {
              const key = String(item.sortOrder ?? i);
              const resp = responses[key];
              if (!resp) return null;

              return (
                <div key={key} className="rounded-md bg-muted/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[9px]">{item.type?.replace(/_/g, " ")}</Badge>
                    {item.description && <span className="text-xs text-muted-foreground truncate">{item.description}</span>}
                    {item.habitLabel && <span className="text-xs text-muted-foreground">{item.habitLabel}</span>}
                  </div>
                  <div className="text-sm">
                    {resp.type === "ACTION" && (
                      <div className="flex items-center gap-1">
                        {resp.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span>{resp.completed ? "Completed" : "Not completed"}</span>
                      </div>
                    )}
                    {resp.type === "JOURNAL_PROMPT" && resp.entries?.map((e: string, j: number) => (
                      <p key={j} className="text-xs bg-white rounded px-2 py-1.5 mt-1 border">{e || <span className="text-muted-foreground italic">No response</span>}</p>
                    ))}
                    {resp.type === "RATING_SCALE" && <span className="font-semibold text-primary">{resp.value}{item.max ? `/${item.max}` : ""}</span>}
                    {resp.type === "MOOD_CHECK" && <span>{item.moods?.find((m: any) => m.label === resp.mood)?.emoji} {resp.mood}{resp.note ? ` — ${resp.note}` : ""}</span>}
                    {resp.type === "HABIT_TRACKER" && <Badge variant={resp.done ? "default" : "secondary"} className="text-[10px]">{resp.done ? "Yes" : "No"}</Badge>}
                    {resp.type === "CHOICE" && <span>{item.options?.[resp.selectedIndex]?.label || `Option ${resp.selectedIndex + 1}`}</span>}
                    {resp.type === "TIMER" && <span>{Math.floor(resp.elapsedSeconds / 60)}:{(resp.elapsedSeconds % 60).toString().padStart(2, "0")} — {resp.completed ? "Completed" : "Partial"}</span>}
                    {resp.type === "RESOURCE_REVIEW" && <span>{resp.reviewed ? "Reviewed" : "Not reviewed"}</span>}
                    {resp.type === "WORKSHEET" && <span className="text-xs text-muted-foreground">{resp.rows?.length || 0} rows filled</span>}
                    {(resp.type === "BRING_TO_SESSION" || resp.type === "FREE_TEXT_NOTE") && <span>{resp.acknowledged ? "Acknowledged" : "Not seen"}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Homework</h3>
          <p className="text-sm text-muted-foreground">
            Assignments and responses from this client.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAssign(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Homework
        </Button>
      </div>

      {/* Assign Homework -- reuses the part creation modal locked to HOMEWORK type */}
      <CreatePartModal
        open={showAssign}
        onOpenChange={setShowAssign}
        onCreate={handleCreateHomework}
        isPending={assignPending}
        lockedType="HOMEWORK"
      />

      {/* Content */}
      {(!instances || instances.length === 0) ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No homework assigned yet</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => setShowAssign(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Homework
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pending ({pending.length})</h4>
              <div className="space-y-2">{pending.map(renderInstance)}</div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Completed ({completed.length})</h4>
              <div className="space-y-2">{completed.map(renderInstance)}</div>
            </div>
          )}
          {other.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Skipped / Missed ({other.length})</h4>
              <div className="space-y-2">{other.map(renderInstance)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
