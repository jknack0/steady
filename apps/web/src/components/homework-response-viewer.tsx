"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  ChevronRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────

interface HomeworkInstance {
  id: string;
  partId: string;
  enrollmentId: string;
  dueDate: string;
  status: "PENDING" | "COMPLETED" | "SKIPPED" | "MISSED";
  completedAt: string | null;
  response: Record<string, any> | null;
  part: {
    id: string;
    title: string;
    content: any;
    moduleId: string;
  };
}

// ── Status helpers ───────────────────────────────────

const STATUS_CONFIG = {
  COMPLETED: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Completed" },
  PENDING: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Pending" },
  SKIPPED: { icon: XCircle, color: "text-gray-500", bg: "bg-gray-50", label: "Skipped" },
  MISSED: { icon: Circle, color: "text-red-500", bg: "bg-red-50", label: "Missed" },
};

// ── Main Component ───────────────────────────────────

interface HomeworkResponseViewerProps {
  participantId: string; // the user.id from the clinician's participant detail
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HomeworkResponseViewer({ participantId, open, onOpenChange }: HomeworkResponseViewerProps) {
  const { data: instances, isLoading } = useQuery<HomeworkInstance[]>({
    queryKey: ["participant-homework", participantId],
    queryFn: () => api.get(`/api/clinician/participants/${participantId}/homework`),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Homework Responses</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
          ) : !instances || instances.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No homework instances found.</div>
          ) : (
            <div className="space-y-3">
              {instances.map((instance) => (
                <InstanceCard key={instance.id} instance={instance} />
              ))}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

// ── Instance Card ────────────────────────────────────

function InstanceCard({ instance }: { instance: HomeworkInstance }) {
  const config = STATUS_CONFIG[instance.status];
  const Icon = config.icon;
  const items = instance.part.content?.items || [];
  const responses = instance.response || {};
  const hasResponses = Object.keys(responses).length > 0;

  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <span className="text-sm font-semibold">{instance.part.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
          <span className="text-[10px] text-muted-foreground">
            Due {new Date(instance.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* Responses */}
      {hasResponses ? (
        <div className="space-y-2 mt-3">
          {items.map((item: any, i: number) => {
            const key = String(item.sortOrder ?? i);
            const resp = responses[key];
            if (!resp) return null;

            return (
              <div key={key} className="rounded-md bg-white border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[9px]">
                    {item.type?.replace(/_/g, " ")}
                  </Badge>
                  {item.description && (
                    <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                  )}
                </div>
                <ResponseDisplay item={item} response={resp} />
              </div>
            );
          })}
        </div>
      ) : instance.status === "COMPLETED" ? (
        <p className="text-xs text-muted-foreground mt-2">Completed without detailed responses (legacy).</p>
      ) : null}
    </div>
  );
}

// ── Response Display per Item Type ───────────────────

function ResponseDisplay({ item, response }: { item: any; response: any }) {
  switch (response.type) {
    case "ACTION":
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {response.completed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-sm">{item.description || "Action item"}</span>
          </div>
          {item.subSteps?.length > 0 && response.subStepsDone?.length > 0 && (
            <div className="ml-5 space-y-0.5">
              {item.subSteps.map((step: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  {response.subStepsDone[i] ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={response.subStepsDone[i] ? "line-through text-muted-foreground" : ""}>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "JOURNAL_PROMPT":
      return (
        <div className="space-y-2">
          {(item.prompts || []).map((prompt: string, i: number) => (
            <div key={i}>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">{prompt}</p>
              <p className="text-sm bg-muted/50 rounded px-2 py-1.5">
                {response.entries?.[i] || <span className="text-muted-foreground italic">No response</span>}
              </p>
            </div>
          ))}
        </div>
      );

    case "WORKSHEET":
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1 bg-muted/50 text-left">#</th>
                {item.columns?.map((col: any, i: number) => (
                  <th key={i} className="border px-2 py-1 bg-muted/50 text-left">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(response.rows || []).map((row: any, ri: number) => (
                <tr key={ri}>
                  <td className="border px-2 py-1 text-muted-foreground">{ri + 1}</td>
                  {item.columns?.map((col: any, ci: number) => (
                    <td key={ci} className="border px-2 py-1">{row[col.label] || ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "CHOICE":
      return (
        <div>
          {(item.options || []).map((opt: any, i: number) => (
            <div key={i} className={`flex items-center gap-2 text-sm py-0.5 ${response.selectedIndex === i ? "font-medium" : "text-muted-foreground"}`}>
              {response.selectedIndex === i ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      );

    case "RESOURCE_REVIEW":
      return (
        <div className="flex items-center gap-2 text-sm">
          {response.reviewed ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /><span>Reviewed</span></>
          ) : (
            <><Circle className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Not reviewed</span></>
          )}
        </div>
      );

    case "RATING_SCALE":
      return (
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">{response.value}</span>
          {item.min != null && item.max != null && (
            <span className="text-xs text-muted-foreground">/ {item.max}</span>
          )}
          {item.minLabel && item.maxLabel && (
            <span className="text-xs text-muted-foreground">
              ({item.minLabel} → {item.maxLabel})
            </span>
          )}
        </div>
      );

    case "TIMER":
      return (
        <div className="flex items-center gap-3 text-sm">
          <span>
            {Math.floor(response.elapsedSeconds / 60)}:{(response.elapsedSeconds % 60).toString().padStart(2, "0")} elapsed
          </span>
          {response.completed ? (
            <Badge className="text-[10px] bg-green-100 text-green-700">Completed</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Partial</Badge>
          )}
        </div>
      );

    case "MOOD_CHECK":
      return (
        <div>
          <div className="flex items-center gap-2">
            {item.moods?.find((m: any) => m.label === response.mood) && (
              <span className="text-xl">{item.moods.find((m: any) => m.label === response.mood).emoji}</span>
            )}
            <span className="text-sm font-medium">{response.mood}</span>
          </div>
          {response.note && (
            <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1">{response.note}</p>
          )}
        </div>
      );

    case "HABIT_TRACKER":
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{item.habitLabel}:</span>
          <Badge variant={response.done ? "default" : "secondary"} className="text-[10px]">
            {response.done ? "Yes" : "No"}
          </Badge>
        </div>
      );

    case "BRING_TO_SESSION":
      return (
        <div className="flex items-center gap-2 text-sm">
          {response.acknowledged ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /><span>Acknowledged</span></>
          ) : (
            <><Circle className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Not acknowledged</span></>
          )}
        </div>
      );

    case "FREE_TEXT_NOTE":
      return (
        <div className="flex items-center gap-2 text-sm">
          {response.acknowledged ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /><span>Read</span></>
          ) : (
            <><Circle className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Not read</span></>
          )}
        </div>
      );

    default:
      return <pre className="text-xs text-muted-foreground">{JSON.stringify(response, null, 2)}</pre>;
  }
}
