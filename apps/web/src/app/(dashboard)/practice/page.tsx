"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Check, X, Building2 } from "lucide-react";
import {
  usePractices,
  usePracticeStats,
  useUpdatePracticeName,
} from "@/hooks/use-practice-dashboard";
import { PracticeStatsCards } from "@/components/practice/PracticeStatsCards";
import { MemberManagement } from "@/components/practice/MemberManagement";
import { PracticeParticipantTable } from "@/components/practice/PracticeParticipantTable";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function PracticePage() {
  const { data: practices, isLoading: practicesLoading } = usePractices();

  // Find practice where user is OWNER
  const ownerPractice = practices?.find((p) => p.myRole === "OWNER");
  const practiceId = ownerPractice?.id;

  const { data: stats, isLoading: statsLoading } = usePracticeStats(practiceId);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const updateName = useUpdatePracticeName(practiceId || "");

  function startEditName() {
    setEditName(ownerPractice?.name || "");
    setIsEditingName(true);
  }

  function saveName() {
    if (!editName.trim()) return;
    updateName.mutate(
      { name: editName.trim() },
      { onSuccess: () => setIsEditingName(false) },
    );
  }

  if (practicesLoading) {
    return <LoadingState />;
  }

  if (!ownerPractice) {
    return (
      <EmptyState
        icon={Building2}
        title="No Practice"
        description="You are not an owner of any practice. Practice management is available to practice owners."
      />
    );
  }

  const displayTitle = isEditingName
    ? `Editing: ${ownerPractice.name}`
    : ownerPractice.name;

  return (
    <div className="space-y-8">
      <PageHeader
        title={displayTitle}
        subtitle="Practice Dashboard"
        actions={
          isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
                className="max-w-xs"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={saveName} disabled={updateName.isPending}>
                {updateName.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={startEditName} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit Name
            </Button>
          )
        }
      />

      {/* Stats Cards */}
      {statsLoading ? (
        <LoadingState />
      ) : stats ? (
        <PracticeStatsCards totals={stats.totals} />
      ) : null}

      {/* Member Management */}
      <MemberManagement
        practiceId={practiceId!}
        practiceName={ownerPractice.name}
        members={ownerPractice.members}
        isOwner={ownerPractice.myRole === "OWNER"}
      />

      {/* Practice-wide Participant Table */}
      <PracticeParticipantTable practiceId={practiceId!} />
    </div>
  );
}
