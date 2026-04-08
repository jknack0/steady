"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { WidgetShell } from "@/components/dashboard-widgets";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { Activity, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParticipantCheckin, useTrackerTrends } from "@/hooks/use-daily-trackers";
import { EditCheckinModal } from "@/components/edit-checkin-modal";

const TrackerCharts = dynamic(
  () =>
    import("@/components/tracker-charts").then((mod) => mod.TrackerCharts),
  { ssr: false }
);

interface ClientTrackersProps extends WidgetProps {
  widgetId: string;
  dashboardData?: {
    participantId?: string;
    enrollment?: { id?: string; program?: { id?: string } };
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function ClientTrackersWidget({
  isEditing,
  column,
  dashboardData,
  dragAttributes,
  dragListeners,
}: ClientTrackersProps) {
  const participantId = dashboardData?.participantId;
  const { data: checkin, isLoading, error } = useParticipantCheckin(participantId);
  const [editOpen, setEditOpen] = useState(false);

  // Fetch trends if checkin exists and has entries
  const trackerId = checkin?.id;
  const hasEntries = (checkin?._count?.entries ?? 0) > 0;
  const { data: trends } = useTrackerTrends(
    hasEntries && trackerId ? trackerId : "",
    hasEntries && participantId ? participantId : ""
  );

  // No check-in state
  if (!isLoading && (error || !checkin)) {
    return (
      <WidgetShell
        title="Daily Check-in"
        icon={Activity}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <p className="text-sm text-muted-foreground text-center py-4">No check-in set up</p>
      </WidgetShell>
    );
  }

  // Loading state
  if (isLoading || !checkin) {
    return (
      <WidgetShell
        title="Daily Check-in"
        icon={Activity}
        isEditing={isEditing}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
      </WidgetShell>
    );
  }

  // No entries state
  if (!hasEntries) {
    return (
      <WidgetShell
        title="Daily Check-in"
        icon={Activity}
        isEditing={isEditing}
        headerAction={
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-4 w-4" />
          </Button>
        }
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Waiting for first entry</p>
          <p className="text-xs text-muted-foreground mt-1">{checkin.fields.length} fields configured</p>
        </div>
        <EditCheckinModal
          open={editOpen}
          onOpenChange={setEditOpen}
          trackerId={checkin.id}
          participantId={participantId!}
          fields={checkin.fields}
        />
      </WidgetShell>
    );
  }

  // Sidebar rendering: stats only
  if (column === "sidebar") {
    return (
      <WidgetShell
        title="Daily Check-in"
        icon={Activity}
        isEditing={isEditing}
        headerAction={
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-4 w-4" />
          </Button>
        }
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        {trends ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Streak</span>
              <span className="font-medium">{trends.streak} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{Math.round(trends.completionRate * 100)}%</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">Loading trends...</p>
        )}
        <EditCheckinModal
          open={editOpen}
          onOpenChange={setEditOpen}
          trackerId={checkin.id}
          participantId={participantId!}
          fields={checkin.fields}
        />
      </WidgetShell>
    );
  }

  // Main column rendering: full charts
  return (
    <WidgetShell
      title="Daily Check-in"
      icon={Activity}
      isEditing={isEditing}
      headerAction={
        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          <Settings2 className="h-4 w-4" />
        </Button>
      }
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      {trends ? (
        <TrackerCharts
          fields={checkin.fields}
          fieldTrends={trends.fieldTrends}
          completionRate={trends.completionRate}
          completedDays={trends.completedDays}
          totalDays={trends.totalDays}
          streak={trends.streak}
          compact
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Loading trends...</p>
      )}
      <EditCheckinModal
        open={editOpen}
        onOpenChange={setEditOpen}
        trackerId={checkin.id}
        participantId={participantId!}
        fields={checkin.fields}
      />
    </WidgetShell>
  );
}
