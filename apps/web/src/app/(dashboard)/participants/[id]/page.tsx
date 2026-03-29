"use client";

import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  useClinicianParticipant,
  usePushTask,
  useUnlockModule,
  useManageEnrollment,
  type ParticipantDetail,
} from "@/hooks/use-clinician-participants";
import { useCreateSession } from "@/hooks/use-sessions";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCreateRtmEnrollment, useRtmEnrollments } from "@/hooks/use-rtm";
import { RtmClientDetailContent } from "@/app/(dashboard)/rtm/[enrollmentId]/page";
import { CPT_CODES } from "@steady/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { TrackerDataView } from "@/components/tracker-data-view";
import { EditCheckinModal } from "@/components/edit-checkin-modal";
import { useParticipantCheckin } from "@/hooks/use-daily-trackers";
import { HomeworkResponseViewer } from "@/components/homework-response-viewer";
import { CreatePartModal } from "@/components/part-editor-modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingState } from "@/components/loading-state";
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
  XCircle,
  RotateCcw,
  BookOpen,
  ClipboardList,
  Target,
  Activity,
  Search,
  X,
  Plus,
  Sparkles,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AssignmentModal } from "@/components/assignment";
import { WidgetGrid } from "@/components/widget-grid";
import { CLIENT_WIDGET_COMPONENTS } from "@/components/client-widgets";
import { normalizeDashboardLayout, getClientOverviewWidgets } from "@steady/shared";
import { useClinicianConfig, useSaveClientOverviewLayout } from "@/hooks/use-config";

type Tab = "overview" | "homework" | "trackers" | "rtm";

export default function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading, isError } = useClinicianParticipant(id);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-muted-foreground">Failed to load client data.</p>
      </div>
    );
  }

  const participant = data.participant;
  const name = `${participant.firstName} ${participant.lastName}`.trim();

  const tabLabels: Record<Tab, string> = { overview: "Overview", homework: "Homework", trackers: "Check-in", rtm: "RTM" };

  return (
    <div>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm mb-4">
        <Link href="/participants" className="text-muted-foreground hover:text-foreground transition-colors">
          Clients
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-muted-foreground">{name}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="font-medium text-foreground">{tabLabels[tab]}</span>
      </nav>

      <PageHeader title={name} subtitle={participant.email} />

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {(["overview", "homework", "trackers", "rtm"] as const).map((t) => {
          const labels: Record<Tab, string> = { overview: "Overview", homework: "Homework", trackers: "Check-in", rtm: "RTM" };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <OverviewTab data={data} participantId={id} />
      ) : tab === "homework" ? (
        <HomeworkTab participantId={id} participantProfileId={data.participantProfileId} />
      ) : tab === "trackers" ? (
        <TrackersTab participantProfileId={data.participantProfileId} participantUserId={data.participant.id} />
      ) : (
        <RtmTabWrapper participantId={id} />
      )}
    </div>
  );
}

// ── Enroll Dialog ────────────────────────────────────────

function EnrollDialog({
  open,
  onOpenChange,
  participantEmail,
  participantId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantEmail: string;
  participantId: string;
}) {
  const queryClient = useQueryClient();

  const { data: programs, isLoading } = useQuery<Array<{ id: string; title: string; moduleCount: number }>>({
    queryKey: ["program-templates"],
    queryFn: () => api.get("/api/programs/templates"),
    enabled: open,
  });

  const enrollMutation = useMutation({
    mutationFn: (programId: string) =>
      api.post(`/api/programs/${programId}/enrollments`, { participantEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinician-participant", participantId] });
      onOpenChange(false);
    },
  });

  const publishedPrograms = programs || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Enroll in Program</DialogTitle>
          <DialogDescription>
            Choose a published program to enroll this client in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {isLoading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : publishedPrograms.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No published programs available.</p>
              <p className="text-xs text-muted-foreground mt-1">Create and publish a program first.</p>
            </div>
          ) : (
            publishedPrograms.map((program) => (
              <button
                key={program.id}
                onClick={() => enrollMutation.mutate(program.id)}
                disabled={enrollMutation.isPending}
                className="w-full text-left rounded-lg border p-3 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <span className="text-sm font-semibold">{program.title}</span>
              </button>
            ))
          )}
          {enrollMutation.isError && (
            <p className="text-sm text-destructive">
              {(enrollMutation.error as any)?.message || "Failed to enroll. They may already be enrolled in this program."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Overview Tab ─────────────────────────────────────────

function OverviewTab({
  data,
  participantId,
}: {
  data: ParticipantDetail;
  participantId: string;
}) {
  const [hwViewerOpen, setHwViewerOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
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

  const enrollment = data.enrollments[0];
  if (!enrollment) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed py-12 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium">Not enrolled in a program</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Enroll this client in a program to track their progress, assign modules, and schedule sessions.
          </p>
          <Button size="sm" onClick={() => setAssignModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Enroll in Program
          </Button>
        </div>
        <AssignmentModal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          participantId={data.participantProfileId}
          participantName={`${data.participant.firstName} ${data.participant.lastName}`.trim()}
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
        {enrollment && enrollment.status !== "DROPPED" && enrollment.status !== "COMPLETED" && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
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
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setAssignModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Program
        </Button>
        <Button
          variant={isCustomizing ? "default" : "outline"}
          size="sm"
          onClick={() => setIsCustomizing(!isCustomizing)}
        >
          <Settings2 className="mr-2 h-4 w-4" />
          {isCustomizing ? "Done" : "Customize"}
        </Button>
      </div>

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

      {/* Enroll Dialog — now uses AssignmentModal */}

      {/* Assignment Modal */}
      <AssignmentModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        participantId={data.participantProfileId}
        participantName={participantName}
      />
      {confirmDialog}
    </div>
  );
}

// ── Left Column Components ───────────────────────────────

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
        <h3 className="font-semibold">{enrollment.program.title}</h3>
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

function SessionHistory({
  sessions,
}: {
  sessions: ParticipantDetail["enrollments"][0]["sessions"];
}) {
  const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-600",
    NO_SHOW: "bg-red-100 text-red-800",
  };

  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4" /> Session History
      </h3>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-2 rounded border"
            >
              <div>
                <p className="text-sm font-medium">
                  {new Date(s.scheduledAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {s.clinicianNotes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {s.clinicianNotes}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn("text-xs", STATUS_COLORS[s.status])}
              >
                {s.status.toLowerCase().replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Right Column Components ──────────────────────────────

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

  // Check if this participant already has an active RTM enrollment
  const hasActiveRtm = rtmEnrollments?.some(
    (e: any) => e.clientId === participantId && (e.status === "ACTIVE" || e.status === "PENDING_CONSENT")
  );

  // Find next locked module
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

// ── RTM Enrollment Dialog ──────────────────────────────

const COMMON_ICD10_CODES = [
  // Depression
  { code: "F32.0", label: "Major depressive disorder, single episode, mild" },
  { code: "F32.1", label: "Major depressive disorder, single episode, moderate" },
  { code: "F32.2", label: "Major depressive disorder, single episode, severe" },
  { code: "F32.9", label: "Major depressive disorder, single episode, unspecified" },
  { code: "F33.0", label: "Major depressive disorder, recurrent, mild" },
  { code: "F33.1", label: "Major depressive disorder, recurrent, moderate" },
  { code: "F33.2", label: "Major depressive disorder, recurrent, severe" },
  { code: "F33.9", label: "Major depressive disorder, recurrent, unspecified" },
  // Anxiety
  { code: "F41.0", label: "Panic disorder without agoraphobia" },
  { code: "F41.1", label: "Generalized anxiety disorder" },
  { code: "F41.9", label: "Anxiety disorder, unspecified" },
  { code: "F40.10", label: "Social anxiety disorder, unspecified" },
  { code: "F40.11", label: "Social anxiety disorder, generalized" },
  // PTSD / Trauma
  { code: "F43.10", label: "Post-traumatic stress disorder, unspecified" },
  { code: "F43.11", label: "Post-traumatic stress disorder, acute" },
  { code: "F43.12", label: "Post-traumatic stress disorder, chronic" },
  { code: "F43.20", label: "Adjustment disorder, unspecified" },
  { code: "F43.21", label: "Adjustment disorder with depressed mood" },
  { code: "F43.22", label: "Adjustment disorder with anxiety" },
  { code: "F43.23", label: "Adjustment disorder with mixed anxiety and depressed mood" },
  { code: "F43.25", label: "Adjustment disorder with mixed disturbance of emotions and conduct" },
  // ADHD
  { code: "F90.0", label: "ADHD, predominantly inattentive type" },
  { code: "F90.1", label: "ADHD, predominantly hyperactive-impulsive type" },
  { code: "F90.2", label: "ADHD, combined type" },
  { code: "F90.9", label: "ADHD, unspecified type" },
  // OCD
  { code: "F42.2", label: "Obsessive-compulsive disorder, mixed obsessional thoughts and acts" },
  { code: "F42.3", label: "Hoarding disorder" },
  { code: "F42.8", label: "Other obsessive-compulsive disorder" },
  { code: "F42.9", label: "Obsessive-compulsive disorder, unspecified" },
  // Eating disorders
  { code: "F50.00", label: "Anorexia nervosa, unspecified" },
  { code: "F50.01", label: "Anorexia nervosa, restricting type" },
  { code: "F50.02", label: "Anorexia nervosa, binge eating/purging type" },
  { code: "F50.2", label: "Bulimia nervosa" },
  { code: "F50.81", label: "Binge eating disorder" },
  { code: "F50.89", label: "Other specified eating disorder" },
  // Substance use
  { code: "F10.10", label: "Alcohol use disorder, mild" },
  { code: "F10.20", label: "Alcohol use disorder, moderate" },
  { code: "F11.10", label: "Opioid use disorder, mild" },
  { code: "F11.20", label: "Opioid use disorder, moderate" },
  { code: "F12.10", label: "Cannabis use disorder, mild" },
  { code: "F12.20", label: "Cannabis use disorder, moderate" },
  // Insomnia
  { code: "F51.01", label: "Primary insomnia" },
  { code: "F51.02", label: "Adjustment insomnia" },
  { code: "F51.09", label: "Other insomnia not due to a substance or known physiological condition" },
  // Anger / Impulse
  { code: "F63.81", label: "Intermittent explosive disorder" },
];

const CUSTOM_ICD10_PATTERN = /^F\d{2}\.\d{1,2}$/;

const CPT_INFO: Record<string, { description: string; rate: number }> = CPT_CODES;

// ── RTM Tab Wrapper ──────────────────────────────────────────────────

function RtmTabWrapper({ participantId }: { participantId: string }) {
  const { data: rtmEnrollments, isLoading } = useRtmEnrollments();

  const rtmEnrollment = rtmEnrollments?.find(
    (e: any) => e.clientId === participantId && (e.status === "ACTIVE" || e.status === "PENDING_CONSENT")
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (!rtmEnrollment) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-2">RTM is not enabled for this client.</p>
        <p className="text-sm text-muted-foreground">Enable RTM from Quick Actions to start tracking billable engagement.</p>
      </div>
    );
  }

  return <RtmClientDetailContent enrollmentId={rtmEnrollment.id} hideHeader />;
}
function RtmEnrollmentDialog({
  open,
  onOpenChange,
  clientId,
  enrollmentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  enrollmentId: string;
}) {
  const createRtmEnrollment = useCreateRtmEnrollment();
  const [payerName, setPayerName] = useState("");
  const [subscriberId, setSubscriberId] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [monitoringType, setMonitoringType] = useState("CBT");
  const [codeSearch, setCodeSearch] = useState("");

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const removeCode = (code: string) => {
    setSelectedCodes((prev) => prev.filter((c) => c !== code));
  };

  const searchLower = codeSearch.toLowerCase().trim();

  const filteredCodes = useMemo(() => {
    if (!searchLower) return COMMON_ICD10_CODES;
    return COMMON_ICD10_CODES.filter(
      ({ code, label }) =>
        code.toLowerCase().includes(searchLower) ||
        label.toLowerCase().includes(searchLower)
    );
  }, [searchLower]);

  const selectedCodeEntries = useMemo(() => {
    return selectedCodes.map((code) => {
      const found = COMMON_ICD10_CODES.find((c) => c.code === code);
      return found ?? { code, label: "Custom code" };
    });
  }, [selectedCodes]);

  const customCodeCandidate = useMemo(() => {
    const trimmed = codeSearch.trim().toUpperCase();
    if (!CUSTOM_ICD10_PATTERN.test(trimmed)) return null;
    // Don't show if it already exists in the list or is already selected
    const existsInList = COMMON_ICD10_CODES.some((c) => c.code === trimmed);
    const alreadySelected = selectedCodes.includes(trimmed);
    if (existsInList || alreadySelected) return null;
    return trimmed;
  }, [codeSearch, selectedCodes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName.trim() || !subscriberId.trim() || selectedCodes.length === 0) return;

    try {
      await createRtmEnrollment.mutateAsync({
        clientId,
        enrollmentId,
        monitoringType: monitoringType as any,
        diagnosisCodes: selectedCodes,
        payerName: payerName.trim(),
        subscriberId: subscriberId.trim(),
        groupNumber: groupNumber.trim() || undefined,
        startDate: new Date().toISOString().split("T")[0],
      });
      onOpenChange(false);
      setPayerName("");
      setSubscriberId("");
      setGroupNumber("");
      setSelectedCodes([]);
      setCodeSearch("");
    } catch {
      // handled by React Query
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>Enable RTM Billing</DialogTitle>
            <DialogDescription>
              Enroll this client in Remote Therapeutic Monitoring. You can bill
              insurance ~$100-150/month for monitoring their app engagement between
              sessions.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="grid gap-4">
            {/* Insurance Info */}
            <div className="grid gap-2">
              <Label>Payer / Insurance *</Label>
              <Input
                placeholder="e.g., Blue Cross Blue Shield"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Subscriber ID *</Label>
                <Input
                  placeholder="e.g., XYZ123456"
                  value={subscriberId}
                  onChange={(e) => setSubscriberId(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Group Number</Label>
                <Input
                  placeholder="Optional"
                  value={groupNumber}
                  onChange={(e) => setGroupNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Monitoring Type */}
            <div className="grid gap-2">
              <Label>Monitoring Type</Label>
              <Select value={monitoringType} onValueChange={setMonitoringType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBT">Cognitive Behavioral Therapy (98978)</SelectItem>
                  <SelectItem value="MSK">Musculoskeletal (98977)</SelectItem>
                  <SelectItem value="RESPIRATORY">Respiratory (98976)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Diagnosis Codes */}
            <div className="grid gap-2">
              <Label>Diagnosis Codes (ICD-10) *</Label>
              <p className="text-xs text-muted-foreground">
                Select at least one diagnosis code for billing.
              </p>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or description..."
                  value={codeSearch}
                  onChange={(e) => setCodeSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Selected codes as removable badges */}
              {selectedCodes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCodeEntries.map(({ code, label }) => (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="text-xs gap-1 pr-1"
                    >
                      <span className="font-mono">{code}</span>
                      <button
                        type="button"
                        onClick={() => removeCode(code)}
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="max-h-56 overflow-y-auto border rounded-md p-2 space-y-0.5">
                {/* Recently Used / Selected section */}
                {selectedCodes.length > 0 && !searchLower && (
                  <>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-0.5">
                      Selected
                    </p>
                    {selectedCodeEntries.map(({ code, label }) => (
                      <button
                        type="button"
                        key={`selected-${code}`}
                        onClick={() => toggleCode(code)}
                        className="w-full text-left text-sm px-2 py-1.5 rounded transition-colors bg-primary/10 text-primary font-medium"
                      >
                        <span className="font-mono text-xs mr-2">{code}</span>
                        {label}
                      </button>
                    ))}
                    <div className="border-b my-1.5" />
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-0.5">
                      All Codes
                    </p>
                  </>
                )}

                {/* Filtered code list */}
                {filteredCodes.length > 0 ? (
                  filteredCodes.map(({ code, label }) => (
                    <button
                      type="button"
                      key={code}
                      onClick={() => toggleCode(code)}
                      className={cn(
                        "w-full text-left text-sm px-2 py-1.5 rounded transition-colors",
                        selectedCodes.includes(code)
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="font-mono text-xs mr-2">{code}</span>
                      {label}
                    </button>
                  ))
                ) : !customCodeCandidate ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No matching codes
                  </p>
                ) : null}

                {/* Custom code option */}
                {customCodeCandidate && (
                  <button
                    type="button"
                    onClick={() => {
                      toggleCode(customCodeCandidate);
                      setCodeSearch("");
                    }}
                    className="w-full text-left text-sm px-2 py-1.5 rounded transition-colors hover:bg-muted flex items-center gap-2 border-t mt-1 pt-2"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      Add custom code:{" "}
                      <span className="font-mono font-medium">{customCodeCandidate}</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
            </div>
          </DialogBody>

          <DialogFooter className="shrink-0 px-6 py-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createRtmEnrollment.isPending ||
                !payerName.trim() ||
                !subscriberId.trim() ||
                selectedCodes.length === 0
              }
            >
              {createRtmEnrollment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enable RTM
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EnrollmentManagement({
  participantId,
  enrollment,
}: {
  participantId: string;
  enrollment: ParticipantDetail["enrollments"][0];
}) {
  const manage = useManageEnrollment(participantId);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const confirmTitles: Record<string, string> = {
    pause: "Pause enrollment",
    resume: "Resume enrollment",
    drop: "Drop client",
    "reset-progress": "Reset progress",
  };
  const confirmMessages: Record<string, string> = {
    pause: "Pause this enrollment?",
    resume: "Resume this enrollment?",
    drop: "Drop this client from the program? This cannot be undone easily.",
    "reset-progress":
      "Reset all module progress? This will clear all part completions and restart from Module 1.",
  };

  const handleAction = (action: "pause" | "resume" | "drop" | "reset-progress") => {
    confirm({
      title: confirmTitles[action],
      description: confirmMessages[action],
      confirmLabel: action === "drop" ? "Drop" : "Confirm",
      variant: action === "drop" || action === "reset-progress" ? "danger" : "default",
      onConfirm: () => manage.mutate({ enrollmentId: enrollment.id, action }),
    });
  };

  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-semibold mb-3">Enrollment</h3>
      <div className="space-y-2">
        {enrollment.status === "ACTIVE" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => handleAction("pause")}
            disabled={manage.isPending}
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause Enrollment
          </Button>
        )}
        {enrollment.status === "PAUSED" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => handleAction("resume")}
            disabled={manage.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            Resume Enrollment
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-amber-700 hover:text-amber-800"
          onClick={() => handleAction("reset-progress")}
          disabled={manage.isPending}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Module Progress
        </Button>
        {enrollment.status !== "DROPPED" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => handleAction("drop")}
            disabled={manage.isPending}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Drop from Program
          </Button>
        )}
      </div>
      {confirmDialog}
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

// ── Patterns Tab ─────────────────────────────────────────

// ── Shared Sub-components ────────────────────────────────

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

// ── Trackers Tab ────────────────────────────────────────────

interface TemplateData {
  key: string;
  name: string;
  description: string;
  fields: Array<{ label: string; fieldType: string }>;
}

// ── Homework Tab ────────────────────────────────────────────

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

function HomeworkTab({ participantId, participantProfileId }: { participantId: string; participantProfileId: string }) {
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

  const STATUS_COLORS: Record<string, string> = {
    COMPLETED: "text-green-600",
    PENDING: "text-amber-600",
    SKIPPED: "text-gray-500",
    MISSED: "text-red-500",
  };

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

      {/* Assign Homework — reuses the part creation modal locked to HOMEWORK type */}
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

// ── Check-in Tab ───────────────────────────────────────────

type TrackerDialogMode = "pick" | "review" | "custom";

const FIELD_TYPE_LABELS: Record<string, string> = {
  SCALE: "Scale", NUMBER: "Number", YES_NO: "Yes/No",
  MULTI_CHECK: "Multi-Check", FREE_TEXT: "Free Text", TIME: "Time",
};

const ALL_FIELD_TYPES = [
  { value: "SCALE", label: "Scale (1-10)" },
  { value: "NUMBER", label: "Number" },
  { value: "YES_NO", label: "Yes / No" },
  { value: "MULTI_CHECK", label: "Multi-Check" },
  { value: "FREE_TEXT", label: "Free Text" },
  { value: "TIME", label: "Time" },
];

function TrackerFieldEditor({
  generated,
  setGenerated,
  isCustom,
}: {
  generated: { name: string; description: string; fields: any[] };
  setGenerated: (g: { name: string; description: string; fields: any[] }) => void;
  isCustom: boolean;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("SCALE");

  const addField = () => {
    if (!newLabel.trim()) return;
    const field: any = {
      label: newLabel.trim(),
      fieldType: newType,
      options: null,
      sortOrder: generated.fields.length,
      isRequired: true,
    };
    if (newType === "SCALE") {
      field.options = { min: 1, max: 10, minLabel: "Low", maxLabel: "High" };
    }
    if (newType === "MULTI_CHECK") {
      field.options = { choices: ["Option 1", "Option 2"] };
    }
    setGenerated({ ...generated, fields: [...generated.fields, field] });
    setNewLabel("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tracker Name</Label>
        <Input
          value={generated.name}
          onChange={(e) => setGenerated({ ...generated, name: e.target.value })}
          placeholder="e.g., Daily Mood & Symptom Log"
          autoFocus={isCustom}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input
          value={generated.description}
          onChange={(e) => setGenerated({ ...generated, description: e.target.value })}
          placeholder="Brief description shown to participant"
        />
      </div>

      {/* Fields */}
      <div className="space-y-1.5">
        <Label>Fields ({generated.fields.length})</Label>
        <div className="space-y-2">
          {generated.fields.map((field, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border p-2.5">
              <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{i + 1}</span>
              <Input
                value={field.label}
                onChange={(e) => {
                  const fields = [...generated.fields];
                  fields[i] = { ...fields[i], label: e.target.value };
                  setGenerated({ ...generated, fields });
                }}
                className="flex-1 h-8 text-sm"
              />
              <select
                value={field.fieldType}
                onChange={(e) => {
                  const fields = [...generated.fields];
                  const ft = e.target.value;
                  let options = null;
                  if (ft === "SCALE") options = { min: 1, max: 10, minLabel: "Low", maxLabel: "High" };
                  if (ft === "MULTI_CHECK") options = field.options?.choices ? field.options : { choices: ["Option 1"] };
                  fields[i] = { ...fields[i], fieldType: ft, options };
                  setGenerated({ ...generated, fields });
                }}
                className="h-8 rounded-md border bg-background px-2 text-xs shrink-0"
              >
                {ALL_FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
              <button
                onClick={() => setGenerated({
                  ...generated,
                  fields: generated.fields.filter((_, j) => j !== i).map((f, j) => ({ ...f, sortOrder: j })),
                })}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add field row */}
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Field label..."
            className="flex-1 h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") addField(); }}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-xs shrink-0"
          >
            {ALL_FIELD_TYPES.map((ft) => (
              <option key={ft.value} value={ft.value}>{ft.label}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={addField} disabled={!newLabel.trim()} className="h-8 px-3">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TrackersTab({ participantProfileId, participantUserId }: { participantProfileId: string; participantUserId: string }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<TrackerDialogMode>("pick");
  const [aiInput, setAiInput] = useState("");
  const [editFieldsOpen, setEditFieldsOpen] = useState(false);
  const [generated, setGenerated] = useState<{ name: string; description: string; fields: any[] } | null>(null);

  const { data: checkin, isLoading } = useParticipantCheckin(participantUserId);

  const { data: templates } = useQuery<TemplateData[]>({
    queryKey: ["tracker-templates"],
    queryFn: () => api.get("/api/daily-trackers/templates"),
    enabled: dialogOpen,
  });

  const createCustom = useMutation({
    mutationFn: (data: { name: string; description: string; fields: any[] }) =>
      api.post("/api/daily-trackers", { ...data, participantId: participantProfileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participant-checkin", participantUserId] });
      closeDialog();
    },
  });

  const generateTracker = useMutation({
    mutationFn: (description: string) =>
      api.post<{ name: string; description: string; fields: any[] }>("/api/ai/generate-tracker", { description }),
    onSuccess: (data) => {
      setGenerated(data);
      setDialogMode("review");
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setTimeout(() => {
      setDialogMode("pick");
      setAiInput("");
      setGenerated(null);
      generateTracker.reset();
    }, 200);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Check-in</h3>
          <p className="text-sm text-muted-foreground">
            Daily check-in tracker for this client.
          </p>
        </div>
        {checkin && (
          <Button size="sm" variant="outline" onClick={() => setEditFieldsOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Edit Fields
          </Button>
        )}
      </div>

      {!checkin ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No check-in set up for this client</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Use Template
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setGenerated({ name: "", description: "", fields: [] });
                setDialogMode("custom");
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Start Blank
            </Button>
          </div>
        </div>
      ) : (
        <TrackerDataView
          trackerId={checkin.id}
          trackerName={checkin.name}
          userId={participantUserId}
          fields={checkin.fields}
          onBack={() => {}}
        />
      )}

      {/* Edit Fields Modal */}
      {checkin && (
        <EditCheckinModal
          open={editFieldsOpen}
          onOpenChange={setEditFieldsOpen}
          trackerId={checkin.id}
          participantId={participantProfileId}
          fields={checkin.fields}
        />
      )}

      {/* Add Check-in Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent size="md">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>
              {dialogMode === "review" ? "Review Check-in" : dialogMode === "custom" ? "Build Check-in" : "Set Up Check-in"}
            </DialogTitle>
            {dialogMode === "pick" && (
              <DialogDescription>
                Generate with AI, pick a template, or build from scratch.
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogBody>
            {dialogMode === "pick" && (
              <div className="space-y-4">
                {/* AI Generate */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <h4 className="text-sm font-semibold">Generate with AI</h4>
                  </div>
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="e.g., Track ADHD medication side effects — monitor sleep quality, appetite, mood, focus level, and any headaches or stomach issues"
                    className="w-full rounded-md border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
                  />
                  <Button
                    onClick={() => generateTracker.mutate(aiInput.trim())}
                    disabled={generateTracker.isPending || !aiInput.trim()}
                    className="w-full"
                    size="sm"
                  >
                    {generateTracker.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" />Generate Tracker</>
                    )}
                  </Button>
                  {generateTracker.isError && (
                    <p className="text-xs text-destructive">Failed to generate. Try again.</p>
                  )}
                </div>

                {/* Separator */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or pick a template</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Templates */}
                <div className="space-y-2">
                  {templates?.map((template) => (
                    <button
                      key={template.key}
                      onClick={() => {
                        setGenerated({
                          name: template.name,
                          description: template.description,
                          fields: template.fields.map((f, i) => ({
                            label: f.label,
                            fieldType: f.fieldType,
                            options: (f as any).options || null,
                            sortOrder: i,
                            isRequired: true,
                          })),
                        });
                        setDialogMode("review");
                      }}
                      className="w-full text-left rounded-lg border p-3 hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-teal shrink-0" />
                        <span className="text-sm font-semibold">{template.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">{template.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2 ml-6">
                        {template.fields.map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {f.label}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                  {!templates && (
                    <div className="py-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  )}

                  {/* Build custom */}
                  <button
                    onClick={() => {
                      setGenerated({ name: "", description: "", fields: [] });
                      setDialogMode("custom");
                    }}
                    className="w-full text-left rounded-lg border border-dashed p-3 hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold">Build Custom Tracker</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      Create a tracker from scratch with your own fields
                    </p>
                  </button>
                </div>
              </div>
            )}

            {(dialogMode === "review" || dialogMode === "custom") && generated && (
              <TrackerFieldEditor
                generated={generated}
                setGenerated={setGenerated}
                isCustom={dialogMode === "custom"}
              />
            )}
          </DialogBody>

          {/* Footer */}
          {(dialogMode === "review" || dialogMode === "custom") && generated && (
            <DialogFooter className="shrink-0 px-6 py-4 border-t justify-between">
              <Button variant="ghost" size="sm" onClick={() => setDialogMode("pick")}>
                Back
              </Button>
              <Button
                onClick={() => createCustom.mutate(generated)}
                disabled={createCustom.isPending || !generated.name.trim() || generated.fields.length === 0}
              >
                {createCustom.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                ) : (
                  "Create Check-in"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
