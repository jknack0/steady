"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { usePrepareSession, useCompleteSession } from "@/hooks/use-sessions";
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
import { cn } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  BarChart3,
  BookOpen,
  Plus,
  Trash2,
  Send,
} from "lucide-react";
import Link from "next/link";

export default function PrepareSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError } = usePrepareSession(id);
  const completeSession = useCompleteSession(id);

  const [showComplete, setShowComplete] = useState(false);
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [moduleCompletedId, setModuleCompletedId] = useState<string>("");
  const [tasksToAssign, setTasksToAssign] = useState<Array<{ title: string }>>([]);
  const [newTask, setNewTask] = useState("");

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-muted-foreground">Failed to load session data.</p>
      </div>
    );
  }

  const handleComplete = async () => {
    await completeSession.mutateAsync({
      clinicianNotes: notes || undefined,
      participantSummary: summary || undefined,
      moduleCompletedId: moduleCompletedId || undefined,
      tasksToAssign: tasksToAssign.length > 0 ? tasksToAssign : undefined,
    });
    router.push("/sessions");
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasksToAssign([...tasksToAssign, { title: newTask.trim() }]);
    setNewTask("");
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/sessions"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Sessions
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Prepare for Session</h1>
          <p className="text-sm text-muted-foreground">
            {data.participant.name} · {data.program.title} ·{" "}
            {new Date(data.session.scheduledAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Button onClick={() => setShowComplete(true)}>
          <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Session
        </Button>
      </div>

      {/* Complete Session Dialog */}
      {showComplete && (
        <div className="rounded-lg border border-primary bg-primary/5 p-5 mb-6 space-y-4">
          <h3 className="font-semibold">Complete Session</h3>

          <div>
            <label className="text-sm font-medium block mb-1">Clinician Notes</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px] resize-y"
              placeholder="Session notes (private)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Participant Summary</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[60px] resize-y"
              placeholder="Summary shared with participant..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Module Completed</label>
            <Select value={moduleCompletedId} onValueChange={setModuleCompletedId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {data.moduleProgress
                  .filter((mp) => mp.status !== "LOCKED")
                  .map((mp) => (
                    <SelectItem key={mp.moduleId} value={mp.moduleId}>
                      {mp.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Tasks to Assign</label>
            <div className="space-y-2 mb-2">
              {tasksToAssign.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm flex-1">{t.title}</span>
                  <button
                    onClick={() => setTasksToAssign(tasksToAssign.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Task title..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <Button variant="outline" size="sm" onClick={addTask}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleComplete} disabled={completeSession.isPending}>
              {completeSession.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Mark Completed
            </Button>
            <Button variant="ghost" onClick={() => setShowComplete(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="rounded-lg border p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Quick Stats (4 weeks)
          </h3>
          <div className="space-y-3">
            <StatRow
              label="Task Completion"
              value={`${data.quickStats.taskCompletionRate}%`}
              detail={`${data.quickStats.tasksCompleted}/${data.quickStats.tasksTotal}`}
            />
            <StatRow
              label="Journal Entries"
              value={`${data.quickStats.journalEntries}`}
              detail="entries"
            />
          </div>
        </div>

        {/* Last Session Notes */}
        <div className="rounded-lg border p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Last Session
          </h3>
          {data.lastSession ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {new Date(data.lastSession.date).toLocaleDateString()}
              </p>
              <p className="text-sm">
                {data.lastSession.notes || "No notes recorded."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">First session.</p>
          )}
        </div>

        {/* Module Progress */}
        <div className="rounded-lg border p-5">
          <h3 className="font-semibold mb-3">Module Progress</h3>
          <div className="space-y-2">
            {data.moduleProgress.map((mp) => (
              <div key={mp.moduleId} className="flex items-center gap-2">
                {mp.status === "COMPLETED" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : mp.status === "LOCKED" ? (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Clock className="h-4 w-4 text-primary" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    mp.moduleId === data.currentModuleId && "font-medium"
                  )}
                >
                  {mp.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Homework Status */}
      <div className="rounded-lg border p-5 mt-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Homework Status
        </h3>
        {data.homeworkByModule.filter((m) => m.homework.length > 0).length === 0 ? (
          <p className="text-sm text-muted-foreground">No homework assignments.</p>
        ) : (
          <div className="space-y-4">
            {data.homeworkByModule
              .filter((m) => m.homework.length > 0)
              .map((mod) => (
                <div key={mod.moduleId}>
                  <p className="text-sm font-medium mb-2">{mod.moduleTitle}</p>
                  <div className="space-y-1">
                    {mod.homework.map((hw) => (
                      <div key={hw.partId} className="flex items-center gap-2">
                        {hw.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">{hw.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Recent Shared Journal */}
      {data.recentJournal.length > 0 && (
        <div className="rounded-lg border p-5 mt-6">
          <h3 className="font-semibold mb-3">Recent Shared Journal</h3>
          <div className="space-y-3">
            {data.recentJournal.map((entry) => (
              <div key={entry.id} className="border-b pb-2 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">
                    {new Date(entry.entryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {entry.regulationScore && (
                    <Badge variant="outline" className="text-xs">
                      Score: {entry.regulationScore}/10
                    </Badge>
                  )}
                </div>
                {entry.freeformContent && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {entry.freeformContent}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground ml-1">{detail}</span>
      </div>
    </div>
  );
}
