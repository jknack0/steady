"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useManageEnrollment,
  usePushTask,
  useUnlockModule,
  type ParticipantDetail,
} from "@/hooks/use-clinician-participants";
import { useCreateSession } from "@/hooks/use-sessions";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRtmEnrollments } from "@/hooks/use-rtm";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useClinicianConfig, useSaveClientOverviewLayout } from "@/hooks/use-config";
import { normalizeDashboardLayout, getClientOverviewWidgets } from "@steady/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { HomeworkResponseViewer } from "@/components/homework-response-viewer";
import { CreateProgramDialog } from "@/app/(dashboard)/programs/create-program-dialog";
const AssignmentModal = dynamic(
  () =>
    import("@/components/assignment/AssignmentModal").then(
      (mod) => mod.AssignmentModal
    ),
  { ssr: false }
);
import { WidgetGrid } from "@/components/widget-grid";
import { CLIENT_WIDGET_COMPONENTS } from "@/components/client-widgets";
import { DemographicsSection } from "./DemographicsSection";
import { RtmEnrollmentDialog } from "./RtmEnrollmentDialog";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Lock,
  Unlock,
  Send,
  Calendar,
  Pause,
  Play,
  X,
  Plus,
  Sparkles,
  ChevronRight,
  Settings2,
  MoreHorizontal,
  BookOpen,
  ClipboardList,
  Target,
  Activity,
} from "lucide-react";

// ── Sub-components ──────────────────────────────────────────

function EnrollmentCard({
  enrollment,
  onRemove,
  isRemoving,
}: {
  enrollment: ParticipantDetail["enrollments"][0];
  onRemove?: () => void;
  isRemoving?: boolean;
}) {
  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    PAUSED: "bg-yellow-100 text-yellow-800",
    INVITED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-gray-100 text-gray-800",
    DROPPED: "bg-red-100 text-red-800",
  };

  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-center justify-between mb-3">
        <Link href={`/programs/${enrollment.program.id}`} className="font-semibold hover:underline">
          {enrollment.program.title}
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(STATUS_COLORS[enrollment.status])}>
            {enrollment.status.toLowerCase()}
          </Badge>
          {onRemove && enrollment.status !== "DROPPED" && enrollment.status !== "COMPLETED" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={isRemoving}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </div>
      {enrollment.program.description && (
        <p className="text-sm text-muted-foreground mb-3">
          {enrollment.program.description}
        </p>
      )}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Cadence: {enrollment.program.cadence.toLowerCase()}</span>
        <span>
          Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
        </span>
        {enrollment.completedAt && (
          <span>
            Completed: {new Date(enrollment.completedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function ModuleTimeline({
  moduleProgress,
  currentModuleId,
}: {
  moduleProgress: ParticipantDetail["enrollments"][0]["moduleProgress"];
  currentModuleId: string | null;
}) {
  const sorted = [...moduleProgress].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <ClipboardList className="h-4 w-4" /> Module Progress
      </h3>
      <div className="space-y-3">
        {sorted.map((mp) => {
          const isCurrent = mp.moduleId === currentModuleId;
          const Icon =
            mp.status === "COMPLETED"
              ? CheckCircle2
              : mp.status === "LOCKED"
                ? Lock
                : Circle;
          const iconColor =
            mp.status === "COMPLETED"
              ? "text-green-600"
              : mp.status === "LOCKED"
                ? "text-muted-foreground"
                : "text-primary";

          return (
            <div
              key={mp.moduleId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                isCurrent && "border-primary bg-primary/5"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", iconColor)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {mp.moduleTitle}
                  {isCurrent && (
                    <span className="ml-2 text-xs text-primary font-normal">
                      Current
                    </span>
                  )}
                </p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {mp.estimatedMinutes && (
                    <span>{mp.estimatedMinutes} min</span>
                  )}
                  {mp.completedAt && (
                    <span>
                      Completed{" "}
                      {new Date(mp.completedAt).toLocaleDateString()}
                    </span>
                  )}
                  {mp.unlockedAt && !mp.completedAt && (
                    <span>
                      Unlocked{" "}
                      {new Date(mp.unlockedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  mp.status === "COMPLETED" && "bg-green-50 text-green-700",
                  mp.status === "LOCKED" && "bg-gray-50 text-gray-500",
                  (mp.status === "UNLOCKED" || mp.status === "IN_PROGRESS") &&
                    "bg-blue-50 text-blue-700"
                )}
              >
                {mp.status.replace("_", " ").toLowerCase()}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomeworkDetail({
  homeworkProgress,
  currentModuleId,
  onViewResponses,
}: {
  homeworkProgress: ParticipantDetail["enrollments"][0]["homeworkProgress"];
  currentModuleId: string | null;
  onViewResponses?: () => void;
}) {
  const hasAnyHomework = homeworkProgress.length > 0;

  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Homework
        </h3>
        {hasAnyHomework && onViewResponses && (
          <Button variant="ghost" size="sm" onClick={onViewResponses} className="text-xs">
            View All Responses
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
      {!hasAnyHomework ? (
        <p className="text-sm text-muted-foreground">No homework assignments yet.</p>
      ) : (
      <div className="space-y-2">
        {homeworkProgress.map((hw) => (
          <div
            key={hw.partId}
            className="flex items-center gap-3 p-2 rounded"
          >
            {hw.status === "COMPLETED" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-sm flex-1">{hw.partTitle}</span>
            {hw.completedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(hw.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function QuickActions({
  participantId,
  enrollment,
}: {
  participantId: string;
  enrollment: ParticipantDetail["enrollments"][0];
}) {
  const [taskTitle, setTaskTitle] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionUrl, setSessionUrl] = useState("");
  const [showRtmDialog, setShowRtmDialog] = useState(false);
  const pushTask = usePushTask(participantId);
  const unlockModule = useUnlockModule(participantId);
  const createSession = useCreateSession();
  const { data: rtmEnrollments } = useRtmEnrollments();

  const hasActiveRtm = rtmEnrollments?.some(
    (e: any) => e.clientId === participantId && (e.status === "ACTIVE" || e.status === "PENDING_CONSENT")
  );

  const nextLocked = [...enrollment.moduleProgress]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .find((mp) => mp.status === "LOCKED");

  const handleScheduleSession = async () => {
    if (!sessionDate) return;
    await createSession.mutateAsync({
      enrollmentId: enrollment.id,
      scheduledAt: new Date(sessionDate).toISOString(),
      videoCallUrl: sessionUrl || undefined,
    });
    setSessionDate("");
    setSessionUrl("");
    setShowSessionForm(false);
  };

  const handlePushTask = async () => {
    if (!taskTitle.trim()) return;
    await pushTask.mutateAsync({ title: taskTitle.trim() });
    setTaskTitle("");
    setShowTaskForm(false);
  };

  const handleUnlock = async () => {
    if (!nextLocked) return;
    await unlockModule.mutateAsync({
      enrollmentId: enrollment.id,
      moduleId: nextLocked.moduleId,
    });
  };

  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-semibold mb-3">Quick Actions</h3>
      <div className="space-y-2">
        {/* Unlock Next Module */}
        {nextLocked && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-left"
            onClick={handleUnlock}
            disabled={unlockModule.isPending}
          >
            <Unlock className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">
              {unlockModule.isPending ? "Unlocking..." : `Unlock: ${nextLocked.moduleTitle}`}
            </span>
          </Button>
        )}

        {/* Push a Task */}
        {!showTaskForm ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowTaskForm(true)}
          >
            <Send className="h-4 w-4 mr-2" />
            Push a Task
          </Button>
        ) : (
          <div className="space-y-2 p-3 border rounded-lg">
            <Input
              placeholder="Task title..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handlePushTask()}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handlePushTask}
                disabled={pushTask.isPending || !taskTitle.trim()}
              >
                {pushTask.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                Send
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTaskForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Schedule Session */}
        {!showSessionForm ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowSessionForm(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Session
          </Button>
        ) : (
          <div className="space-y-2 p-3 border rounded-lg">
            <Input
              type="datetime-local"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Video call URL (optional)"
              value={sessionUrl}
              onChange={(e) => setSessionUrl(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleScheduleSession}
                disabled={createSession.isPending || !sessionDate}
              >
                {createSession.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Calendar className="h-3 w-3 mr-1" />
                )}
                Schedule
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSessionForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Enable RTM */}
        {!hasActiveRtm && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start mt-2"
            onClick={() => setShowRtmDialog(true)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Enable RTM Billing
          </Button>
        )}
        {hasActiveRtm && (
          <Link href="/rtm">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-green-700 mt-2"
            >
              <Activity className="h-4 w-4 mr-2" />
              RTM Active — View Dashboard
            </Button>
          </Link>
        )}
      </div>

      <RtmEnrollmentDialog
        open={showRtmDialog}
        onOpenChange={setShowRtmDialog}
        clientId={participantId}
        enrollmentId={enrollment.id}
      />
    </div>
  );
}

function SmartGoals({
  goals,
}: {
  goals: ParticipantDetail["smartGoals"];
}) {
  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Target className="h-4 w-4" /> SMART Goals
      </h3>
      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No SMART goals submitted yet.</p>
      ) : (
        <div className="space-y-3">
          {goals.map((g, i) => (
            <div key={i} className="text-sm">
              <p className="font-medium text-xs text-muted-foreground mb-1">
                {g.partTitle}
              </p>
              <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-32">
                {typeof g.goals === "string"
                  ? g.goals
                  : JSON.stringify(g.goals, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SharedJournal({
  entries,
}: {
  entries: ParticipantDetail["journalEntries"];
}) {
  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4" /> Shared Journal
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No shared journal entries.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.slice(0, 5).map((entry) => (
            <div key={entry.id} className="border-b pb-2 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">
                  {new Date(entry.entryDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
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
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
      No data yet
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function CalendarHeatmap({
  calendar,
}: {
  calendar: Array<{
    date: string;
    hasEntry: boolean;
    regulationScore: number | null;
  }>;
}) {
  if (calendar.length === 0) {
    return <EmptyChart />;
  }

  const entryMap = new Map(calendar.map((c) => [c.date, c]));
  const weeks: Array<
    Array<{ date: string; entry: (typeof calendar)[0] | null }>
  > = [];

  const start = new Date();
  start.setDate(start.getDate() - 27);
  let currentWeek: Array<{
    date: string;
    entry: (typeof calendar)[0] | null;
  }> = [];

  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    currentWeek.push({ date: dateStr, entry: entryMap.get(dateStr) || null });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="flex gap-1 mb-1">
        {dayLabels.map((d, i) => (
          <div
            key={i}
            className="w-8 text-center text-[10px] text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1">
            {week.map((day) => {
              const hasEntry = !!day.entry;
              const score = day.entry?.regulationScore;
              const bg = !hasEntry
                ? "bg-secondary"
                : score && score >= 7
                  ? "bg-green-400"
                  : score && score >= 4
                    ? "bg-yellow-400"
                    : score
                      ? "bg-rose-400"
                      : "bg-primary";

              return (
                <div
                  key={day.date}
                  className={cn("w-8 h-8 rounded-sm", bg)}
                  title={`${day.date}${hasEntry ? ` · Score: ${score ?? "—"}` : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── OverviewTab (main export) ───────────────────────────────

interface OverviewTabProps {
  data: ParticipantDetail;
  participantId: string;
}

export function OverviewTab({ data, participantId }: OverviewTabProps) {
  const [hwViewerOpen, setHwViewerOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [createForClientOpen, setCreateForClientOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const manage = useManageEnrollment(participantId);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const { data: clinicianConfig } = useClinicianConfig();

  // Fetch per-client config (may have a custom clientOverviewLayout)
  const { data: clientConfig } = useQuery<{
    clientOverviewLayout?: Array<{
      widgetId: string;
      visible: boolean;
      column?: "main" | "sidebar";
      order?: number;
      settings?: Record<string, unknown>;
    }> | null;
  } | null>({
    queryKey: ["client-config", participantId],
    queryFn: () => api.get(`/api/config/clients/${participantId}`),
  });

  const saveLayout = useSaveClientOverviewLayout(participantId);

  // Resolve layout: per-client -> clinician default -> empty
  const clientOverviewWidgets = useMemo(() => getClientOverviewWidgets(), []);
  const resolvedLayout = useMemo(() => {
    const raw =
      clientConfig?.clientOverviewLayout ??
      clinicianConfig?.clientOverviewLayout ??
      [];
    return normalizeDashboardLayout(raw, clientOverviewWidgets);
  }, [clientConfig, clinicianConfig, clientOverviewWidgets]);

  const enrollment = data.enrollments.find((e) => e.status === "ACTIVE" || e.status === "PAUSED" || e.status === "INVITED") ?? null;
  if (!enrollment) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed py-12 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium">Not enrolled in a program</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Enroll this client in a program to track their progress, assign modules, and schedule sessions.
          </p>
          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={() => setAssignModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Enroll in Program
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreateForClientOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Program
            </Button>
          </div>
        </div>
        <DemographicsSection demographics={data.demographics} participantId={participantId} />
        <AssignmentModal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          participantId={data.participantProfileId}
          participantName={`${data.participant.firstName} ${data.participant.lastName}`.trim()}
        />
        <CreateProgramDialog
          open={createForClientOpen}
          onOpenChange={setCreateForClientOpen}
          preselectedClient={{ id: data.participant.id, name: `${data.participant.firstName} ${data.participant.lastName}`.trim() }}
        />
      </div>
    );
  }

  const participantName = `${data.participant.firstName} ${data.participant.lastName}`.trim();

  // Dashboard data passed to widgets
  const dashboardData = {
    participant: data.participant,
    enrollment,
    enrollments: data.enrollments,
    smartGoals: data.smartGoals,
    journalEntries: data.journalEntries,
    participantId,
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setAssignModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Program
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCreateForClientOpen(true)}>
          <Sparkles className="mr-2 h-4 w-4" />
          Create Program
        </Button>
        <Button
          variant={isCustomizing ? "default" : "outline"}
          size="sm"
          onClick={() => setIsCustomizing(!isCustomizing)}
        >
          <Settings2 className="mr-2 h-4 w-4" />
          {isCustomizing ? "Done" : "Customize"}
        </Button>
        {enrollment && enrollment.status !== "DROPPED" && enrollment.status !== "COMPLETED" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() =>
                  confirm({
                    title: "Remove from Program",
                    description: `Remove this client from "${enrollment.program.title}"? Their progress will be preserved but they will no longer have access.`,
                    confirmLabel: "Remove",
                    variant: "danger",
                    onConfirm: () => manage.mutate({ enrollmentId: enrollment.id, action: "drop" }),
                  })
                }
              >
                <X className="mr-2 h-4 w-4" />
                Remove from Program
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Patient Demographics (CMS-1500 Box 3 & 5) */}
      <DemographicsSection demographics={data.demographics} participantId={participantId} />

      {/* Widget Grid */}
      <WidgetGrid
        layout={resolvedLayout}
        isEditing={isCustomizing}
        dashboardData={dashboardData}
        onLayoutChange={isCustomizing ? (newLayout) => saveLayout.mutate(newLayout) : undefined}
        enabledModules={clinicianConfig?.enabledModules ?? []}
        page="client_overview"
        componentRegistry={CLIENT_WIDGET_COMPONENTS}
      />

      {/* Homework Response Viewer */}
      <HomeworkResponseViewer
        participantId={participantId}
        open={hwViewerOpen}
        onOpenChange={setHwViewerOpen}
      />

      {/* Assignment Modal */}
      <AssignmentModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        participantId={data.participantProfileId}
        participantName={participantName}
      />
      <CreateProgramDialog
        open={createForClientOpen}
        onOpenChange={setCreateForClientOpen}
        preselectedClient={{ id: data.participant.id, name: participantName }}
      />
      {confirmDialog}
    </div>
  );
}
