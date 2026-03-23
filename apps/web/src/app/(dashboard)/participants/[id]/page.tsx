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
import { useCreateRtmEnrollment, useRtmEnrollments } from "@/hooks/use-rtm";
import { RtmClientDetailContent } from "@/app/(dashboard)/rtm/[enrollmentId]/page";
import { CPT_CODES } from "@steady/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
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
import { LoadingState } from "@/components/loading-state";
import {
  Loader2,
  ArrowLeft,
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
} from "lucide-react";

type Tab = "overview" | "rtm";

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
        <p className="text-muted-foreground">Failed to load participant data.</p>
      </div>
    );
  }

  const participant = data.participant;
  const name = `${participant.firstName} ${participant.lastName}`.trim();

  return (
    <div>
      <Link
        href="/participants"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Participants
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm text-muted-foreground">{participant.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {(["overview", "rtm"] as const).map((t) => (
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
            {t === "rtm" ? "RTM" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <OverviewTab data={data} participantId={id} />
      ) : (
        <RtmTabWrapper participantId={id} />
      )}
    </div>
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
  const enrollment = data.enrollments[0];
  if (!enrollment) {
    return <p className="text-muted-foreground">No active enrollment found.</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column (2/3) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Enrollment Info */}
        <EnrollmentCard enrollment={enrollment} />

        {/* Module Progress Timeline */}
        <ModuleTimeline
          moduleProgress={enrollment.moduleProgress}
          currentModuleId={enrollment.currentModuleId}
        />

        {/* Homework Detail */}
        <HomeworkDetail
          homeworkProgress={enrollment.homeworkProgress}
          currentModuleId={enrollment.currentModuleId}
        />

        {/* Session History */}
        <SessionHistory sessions={enrollment.sessions} />
      </div>

      {/* Right Column (1/3) */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <QuickActions
          participantId={participantId}
          enrollment={enrollment}
        />

        {/* Enrollment Management */}
        <EnrollmentManagement
          participantId={participantId}
          enrollment={enrollment}
        />

        {/* SMART Goals */}
        <SmartGoals goals={data.smartGoals} />

        {/* Shared Journal Entries */}
        <SharedJournal entries={data.journalEntries} />
      </div>
    </div>
  );
}

// ── Left Column Components ───────────────────────────────

function EnrollmentCard({
  enrollment,
}: {
  enrollment: ParticipantDetail["enrollments"][0];
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
        <Badge variant="outline" className={cn(STATUS_COLORS[enrollment.status])}>
          {enrollment.status.toLowerCase()}
        </Badge>
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
}: {
  homeworkProgress: ParticipantDetail["enrollments"][0]["homeworkProgress"];
  currentModuleId: string | null;
}) {
  const currentModuleHomework = currentModuleId
    ? homeworkProgress.filter((h) => h.moduleId === currentModuleId)
    : homeworkProgress;

  if (currentModuleHomework.length === 0) {
    return (
      <div className="rounded-lg border p-5">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Homework
        </h3>
        <p className="text-sm text-muted-foreground">
          No homework assignments for the current module.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="h-4 w-4" /> Homework (Current Module)
      </h3>
      <div className="space-y-2">
        {currentModuleHomework.map((hw) => (
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
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Enable RTM Billing</DialogTitle>
            <DialogDescription>
              Enroll this client in Remote Therapeutic Monitoring. You can bill
              insurance ~$100-150/month for monitoring their app engagement between
              sessions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
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

          <DialogFooter>
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

  const handleAction = (action: "pause" | "resume" | "drop" | "reset-progress") => {
    const confirmMessages: Record<string, string> = {
      pause: "Pause this enrollment?",
      resume: "Resume this enrollment?",
      drop: "Drop this participant from the program? This cannot be undone easily.",
      "reset-progress":
        "Reset all module progress? This will clear all part completions and restart from Module 1.",
    };
    if (confirm(confirmMessages[action])) {
      manage.mutate({ enrollmentId: enrollment.id, action });
    }
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
