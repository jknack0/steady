"use client";

import { useState } from "react";
import {
  useEnrollments,
  useCreateEnrollment,
  useUpdateEnrollment,
  useDeleteEnrollment,
} from "@/hooks/use-enrollments";
import {
  useHomeworkCompliance,
  useStopRecurrence,
  type ComplianceItem,
} from "@/hooks/use-homework-compliance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, UserPlus, Users, Repeat, ChevronDown, ChevronRight, Flame, StopCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  INVITED: "bg-blue-100 text-blue-800 border-blue-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  PAUSED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
  DROPPED: "bg-red-100 text-red-800 border-red-200",
};

const RECURRENCE_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  CUSTOM: "Custom",
};

function HomeworkCompliancePanel({
  programId,
  enrollmentId,
}: {
  programId: string;
  enrollmentId: string;
}) {
  const { data: compliance, isLoading } = useHomeworkCompliance(programId, enrollmentId);
  const stopRecurrence = useStopRecurrence(programId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!compliance || compliance.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2 px-3">
        No recurring homework assigned
      </p>
    );
  }

  return (
    <div className="space-y-2 px-3 pb-3">
      {compliance.map((item) => (
        <div key={item.partId} className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Repeat className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium">{item.partTitle}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {RECURRENCE_LABELS[item.recurrence] || item.recurrence}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (confirm("Stop this recurring homework? Future instances will be removed.")) {
                  stopRecurrence.mutate({
                    enrollmentId,
                    partId: item.partId,
                  });
                }
              }}
              disabled={stopRecurrence.isPending}
            >
              <StopCircle className="mr-1 h-3 w-3" />
              Stop
            </Button>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {Math.round(item.completionRate * 100)}% compliance
              ({item.totalCompleted}/{item.totalInstances} days)
            </span>
            {item.currentStreak > 0 && (
              <span className="flex items-center gap-1 text-orange-600">
                <Flame className="h-3 w-3" />
                {item.currentStreak}-day streak
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EnrollmentSection({
  programId,
  programStatus,
}: {
  programId: string;
  programStatus: string;
}) {
  const { data: enrollments, isLoading } = useEnrollments(programId);
  const createEnrollment = useCreateEnrollment(programId);
  const updateEnrollment = useUpdateEnrollment(programId);
  const deleteEnrollment = useDeleteEnrollment(programId);

  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [expandedCompliance, setExpandedCompliance] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createEnrollment.mutateAsync({
        participantEmail: email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      setEmail("");
      setFirstName("");
      setLastName("");
      setAdding(false);
    } catch (err: any) {
      setError(err.message || "Failed to invite participant");
    }
  };

  const handleRemove = (id: string) => {
    if (confirm("Remove this enrollment?")) {
      deleteEnrollment.mutate(id);
    }
  };

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Enrollments
          {enrollments && (
            <span className="text-sm font-normal text-muted-foreground">
              ({enrollments.length})
            </span>
          )}
        </h2>
        {!adding && programStatus === "PUBLISHED" && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Participant
          </Button>
        )}
      </div>

      {programStatus !== "PUBLISHED" && !enrollments?.length && (
        <div className="rounded-lg border border-dashed py-8 text-center">
          <p className="text-muted-foreground">
            Publish this program to start enrolling participants
          </p>
        </div>
      )}

      {adding && (
        <form onSubmit={handleInvite} className="mb-4 rounded-lg border p-4 space-y-3">
          <div className="space-y-2">
            <Label>Participant Email</Label>
            <Input
              type="email"
              placeholder="participant@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name (optional)</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name (optional)</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createEnrollment.isPending}>
              {createEnrollment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invite
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : enrollments && enrollments.length > 0 ? (
        <div className="rounded-lg border divide-y">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id}>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2 flex-1">
                  {enrollment.status === "ACTIVE" && (
                    <button
                      onClick={() =>
                        setExpandedCompliance(
                          expandedCompliance === enrollment.id ? null : enrollment.id
                        )
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {expandedCompliance === enrollment.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {enrollment.participant.firstName} {enrollment.participant.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{enrollment.participant.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={enrollment.status}
                    onValueChange={(status) =>
                      updateEnrollment.mutate({ id: enrollment.id, status })
                    }
                  >
                    <SelectTrigger className="w-32 h-8">
                      <Badge variant="outline" className={STATUS_COLORS[enrollment.status] || ""}>
                        {enrollment.status.toLowerCase()}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="DROPPED">Dropped</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => handleRemove(enrollment.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {expandedCompliance === enrollment.id && (
                <HomeworkCompliancePanel
                  programId={programId}
                  enrollmentId={enrollment.id}
                />
              )}
            </div>
          ))}
        </div>
      ) : programStatus === "PUBLISHED" ? (
        <div className="rounded-lg border border-dashed py-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No participants enrolled yet</p>
        </div>
      ) : null}
    </div>
  );
}
