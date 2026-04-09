"use client";

import { useManageEnrollment, type ParticipantDetail } from "@/hooks/use-clinician-participants";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Pause, Play, XCircle, RotateCcw } from "lucide-react";

interface EnrollmentManagementProps {
  participantId: string;
  enrollment: ParticipantDetail["enrollments"][0];
}

export function EnrollmentManagement({
  participantId,
  enrollment,
}: EnrollmentManagementProps) {
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
