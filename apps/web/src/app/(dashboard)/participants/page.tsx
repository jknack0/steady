"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useClinicianParticipants,
  useBulkAction,
  type ParticipantRow,
} from "@/hooks/use-clinician-participants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  Users,
  ChevronRight,
  Unlock,
  Send,
  Bell,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLastActive } from "@/lib/format";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";

const HOMEWORK_BADGE: Record<string, string> = {
  COMPLETE: "bg-green-100 text-green-800 border-green-200",
  PARTIAL: "bg-yellow-100 text-yellow-800 border-yellow-200",
  NOT_STARTED: "bg-gray-100 text-gray-600 border-gray-200",
};

const HOMEWORK_LABEL: Record<string, string> = {
  COMPLETE: "Complete",
  PARTIAL: "Partial",
  NOT_STARTED: "Not Started",
};

type BulkActionType = "push-task" | "unlock-next-module" | "send-nudge";

const BULK_ACTIONS: Record<
  BulkActionType,
  { label: string; icon: React.ReactNode; description: string }
> = {
  "unlock-next-module": {
    label: "Unlock Next Module",
    icon: <Unlock className="h-4 w-4" />,
    description:
      "Unlock the next locked module for each selected participant's active enrollment.",
  },
  "send-nudge": {
    label: "Send Nudge",
    icon: <Bell className="h-4 w-4" />,
    description:
      "Send a gentle check-in nudge to each selected participant.",
  },
  "push-task": {
    label: "Push Task",
    icon: <Send className="h-4 w-4" />,
    description: "Push a task to each selected participant.",
  },
};

function StatusDot({ status }: { status: "green" | "amber" | "red" }) {
  const colors = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  const titles = {
    green: "On track",
    amber: "Behind",
    red: "Needs attention",
  };
  return (
    <span
      className={cn("inline-block w-2.5 h-2.5 rounded-full", colors[status])}
      title={titles[status]}
    />
  );
}

export default function ParticipantsPage() {
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<BulkActionType | null>(null);
  const [taskTitle, setTaskTitle] = useState("");

  const { data, isLoading } = useClinicianParticipants({
    search: search || undefined,
    programId: programFilter !== "all" ? programFilter : undefined,
  });

  const bulkAction = useBulkAction();

  const participants = data?.participants || [];
  const programs = data?.programs || [];

  const allSelected =
    participants.length > 0 && selectedIds.size === participants.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(participants.map((p) => p.participantId)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkAction(action: BulkActionType) {
    if (action === "push-task") {
      setTaskTitle("");
    }
    setConfirmAction(action);
  }

  function executeBulkAction() {
    if (!confirmAction) return;

    const actionData: Record<string, any> | undefined =
      confirmAction === "push-task" && taskTitle.trim()
        ? { title: taskTitle.trim() }
        : undefined;

    bulkAction.mutate(
      {
        action: confirmAction,
        participantIds: Array.from(selectedIds),
        data: actionData,
      },
      {
        onSuccess: () => {
          setConfirmAction(null);
          setSelectedIds(new Set());
          setTaskTitle("");
        },
      }
    );
  }

  return (
    <div>
      {/* Search + Filter bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {programs.length > 1 && (
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState />
      ) : participants.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No results" : "No participants yet"}
          description={
            search
              ? "No participants match your search."
              : "No participants enrolled yet. Publish a program and invite participants to get started."
          }
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all participants"
                  />
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Program
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Homework
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  RTM
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Last Active
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                  Status
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {participants.map((row: ParticipantRow) => (
                <tr
                  key={row.enrollmentId}
                  className={cn(
                    "hover:bg-accent/50 transition-colors",
                    selectedIds.has(row.participantId) && "bg-accent/30"
                  )}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedIds.has(row.participantId)}
                      onCheckedChange={() => toggleOne(row.participantId)}
                      aria-label={`Select ${row.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/participants/${row.participantId}`}
                      className="block"
                    >
                      <p className="font-medium text-sm">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.email}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{row.programTitle}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        HOMEWORK_BADGE[row.homeworkStatus]
                      )}
                    >
                      {HOMEWORK_LABEL[row.homeworkStatus]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {row.rtm ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block w-2 h-2 rounded-full",
                            row.rtm.status === "billable"
                              ? "bg-green-500"
                              : row.rtm.status === "approaching"
                                ? "bg-yellow-500"
                                : "bg-blue-400"
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {row.rtm.engagementDays}d / {row.rtm.clinicianMinutes}m
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatLastActive(row.lastActive)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusDot status={row.statusIndicator} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/participants/${row.participantId}`}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 bg-background border rounded-lg shadow-lg px-4 py-3">
            <span className="text-sm font-medium mr-2">
              {selectedIds.size} selected
            </span>
            <div className="h-5 w-px bg-border" />
            {(Object.keys(BULK_ACTIONS) as BulkActionType[]).map((action) => (
              <Button
                key={action}
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction(action)}
                className="gap-1.5"
              >
                {BULK_ACTIONS[action].icon}
                {BULK_ACTIONS[action].label}
              </Button>
            ))}
            <div className="h-5 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
            setTaskTitle("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction && BULK_ACTIONS[confirmAction].label}
            </DialogTitle>
            <DialogDescription>
              {confirmAction && BULK_ACTIONS[confirmAction].description}
              {" "}This will apply to {selectedIds.size} participant
              {selectedIds.size !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          {confirmAction === "push-task" && (
            <div className="py-2">
              <Input
                placeholder="Task title..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmAction(null);
                setTaskTitle("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={executeBulkAction}
              disabled={
                bulkAction.isPending ||
                (confirmAction === "push-task" && !taskTitle.trim())
              }
            >
              {bulkAction.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
