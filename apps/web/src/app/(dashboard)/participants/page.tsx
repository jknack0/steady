"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useClinicianParticipants,
  useBulkAction,
  type ParticipantRow,
} from "@/hooks/use-clinician-participants";
import { useInvitations } from "@/hooks/use-invitations";
import { usePageTitle } from "@/hooks/use-page-title";
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
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Search,
  Users,
  ChevronRight,
  Unlock,
  Send,
  Bell,
  X,
  UserPlus,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLastActive, formatShortDate } from "@/lib/format";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { InviteStatusBadge } from "@/components/invite-status-badge";
import { InvitePatientModal } from "@/components/invite-patient-modal";
import { InviteToPortalModal } from "@/components/portal/InviteToPortalModal";

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
      "Unlock the next locked module for each selected client's active enrollment.",
  },
  "send-nudge": {
    label: "Send Nudge",
    icon: <Bell className="h-4 w-4" />,
    description:
      "Send a gentle check-in nudge to each selected client.",
  },
  "push-task": {
    label: "Push Task",
    icon: <Send className="h-4 w-4" />,
    description: "Push a task to each selected client.",
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

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy invite code"
    >
      <code className="font-mono font-medium text-foreground">{code}</code>
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

// Unified row type for the merged list
type ListRow =
  | { kind: "participant"; data: ParticipantRow }
  | { kind: "invite"; data: { id: string; patientName: string; patientEmail: string; code: string; status: "PENDING" | "EXPIRED"; createdAt: string } };

export default function ParticipantsPage() {
  usePageTitle("Clients");
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<BulkActionType | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [portalInviteOpen, setPortalInviteOpen] = useState(false);

  const { data, isLoading } = useClinicianParticipants({
    search: search || undefined,
    programId: programFilter !== "all" ? programFilter : undefined,
  });

  const { data: invitations, isLoading: invitationsLoading } = useInvitations();

  const bulkAction = useBulkAction();

  const participants = data?.participants || [];
  const programs = data?.programs || [];

  // Filter invitations to only pending/expired, and apply search
  const filteredInvitations = (invitations ?? []).filter((inv) => {
    if (inv.status !== "PENDING" && inv.status !== "EXPIRED") return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !inv.patientName.toLowerCase().includes(s) &&
        !inv.patientEmail.toLowerCase().includes(s)
      ) {
        return false;
      }
    }
    return true;
  });

  // Build merged list: pending invites first, then participants, then expired invites
  const rows: ListRow[] = [];

  // Apply status filter
  const showParticipants = statusFilter === "all" || statusFilter === "active";
  const showPending = statusFilter === "all" || statusFilter === "pending";
  const showExpired = statusFilter === "all" || statusFilter === "expired";

  if (showPending) {
    filteredInvitations
      .filter((inv) => inv.status === "PENDING")
      .forEach((inv) =>
        rows.push({
          kind: "invite",
          data: {
            id: inv.id,
            patientName: inv.patientName,
            patientEmail: inv.patientEmail,
            code: inv.code,
            status: "PENDING",
            createdAt: inv.createdAt,
          },
        })
      );
  }

  if (showParticipants) {
    participants.forEach((p) => rows.push({ kind: "participant", data: p }));
  }

  if (showExpired) {
    filteredInvitations
      .filter((inv) => inv.status === "EXPIRED")
      .forEach((inv) =>
        rows.push({
          kind: "invite",
          data: {
            id: inv.id,
            patientName: inv.patientName,
            patientEmail: inv.patientEmail,
            code: inv.code,
            status: "EXPIRED",
            createdAt: inv.createdAt,
          },
        })
      );
  }

  const totalCount = participants.length + filteredInvitations.length;
  const loading = isLoading || invitationsLoading;

  // Selection helpers (participants only, not invites)
  const selectableParticipants = rows.filter((r) => r.kind === "participant");
  const allSelected =
    selectableParticipants.length > 0 &&
    selectedIds.size === selectableParticipants.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(
        new Set(
          selectableParticipants.map((r) => (r as { kind: "participant"; data: ParticipantRow }).data.participantId)
        )
      );
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

    const actionData: Record<string, unknown> | undefined =
      confirmAction === "push-task" && taskTitle.trim()
        ? { title: taskTitle.trim() }
        : undefined;

    bulkAction.mutate(
      {
        action: confirmAction,
        participantIds: Array.from(selectedIds),
        data: actionData as Record<string, any>,
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

  const subtitleParts: string[] = [];
  if (participants.length > 0) subtitleParts.push(`${participants.length} active`);
  const pendingCount = filteredInvitations.filter((i) => i.status === "PENDING").length;
  if (pendingCount > 0) subtitleParts.push(`${pendingCount} pending`);

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={subtitleParts.length > 0 ? subtitleParts.join(", ") : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setInviteModalOpen(true)}
              className="gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              Invite Patient
            </Button>
            <Button onClick={() => setPortalInviteOpen(true)} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Invite to portal
            </Button>
          </div>
        }
      />

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : rows.length === 0 && !search && statusFilter === "all" ? (
        <EmptyState
          icon={Users}
          title="No patients yet"
          description="Invite your first patient to get started."
          action={
            <Button onClick={() => setInviteModalOpen(true)} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Invite Patient
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No results"
          description="No clients match your search or filter."
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
                    aria-label="Select all clients"
                  />
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Status
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
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => {
                if (row.kind === "invite") {
                  const inv = row.data;
                  return (
                    <tr
                      key={`invite-${inv.id}`}
                      className="hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {/* Invites are not selectable */}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{inv.patientName}</p>
                        <p className="text-xs text-muted-foreground">{inv.patientEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <InviteStatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3">
                        {inv.status === "PENDING" ? (
                          <CopyCodeButton code={inv.code} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">—</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">—</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        Invited {formatShortDate(inv.createdAt)}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  );
                }

                const p = row.data;
                return (
                  <tr
                    key={p.participantId}
                    className={cn(
                      "hover:bg-accent/50 transition-colors",
                      selectedIds.has(p.participantId) && "bg-accent/30"
                    )}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(p.participantId)}
                        onCheckedChange={() => toggleOne(p.participantId)}
                        aria-label={`Select ${p.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/participants/${p.participantId}`}
                        className="block"
                      >
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.email}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <InviteStatusBadge status="ACTIVE" />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {p.programTitle || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          HOMEWORK_BADGE[p.homeworkStatus]
                        )}
                      >
                        {HOMEWORK_LABEL[p.homeworkStatus]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {p.rtm ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-block w-2 h-2 rounded-full",
                              p.rtm.status === "billable"
                                ? "bg-green-500"
                                : p.rtm.status === "approaching"
                                  ? "bg-yellow-500"
                                  : "bg-blue-400"
                            )}
                          />
                          <span className="text-xs text-muted-foreground">
                            {p.rtm.engagementDays}d / {p.rtm.clinicianMinutes}m
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatLastActive(p.lastActive)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/participants/${p.participantId}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
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
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction && BULK_ACTIONS[confirmAction].label}
            </DialogTitle>
            <DialogDescription>
              {confirmAction && BULK_ACTIONS[confirmAction].description}
              {" "}This will apply to {selectedIds.size} client
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

      {/* Invite Patient Modal */}
      <InvitePatientModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onSuccess={() => {
          // Queries are invalidated by the hook
        }}
      />

      {/* Invite to portal modal — FR-1 / Flow 16 */}
      <InviteToPortalModal
        open={portalInviteOpen}
        onOpenChange={setPortalInviteOpen}
      />
    </div>
  );
}
