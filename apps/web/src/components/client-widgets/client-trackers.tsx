"use client";

import { WidgetShell } from "@/components/dashboard-widgets";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface TrackerField {
  id: string;
  label: string;
  type: string;
  sortOrder: number;
}

interface Tracker {
  id: string;
  name: string;
  fields: TrackerField[];
  _count?: { entries: number };
}

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

  const { data: trackers } = useQuery<Tracker[]>({
    queryKey: ["client-trackers", participantId],
    queryFn: () => api.get(`/api/daily-trackers?participantId=${participantId}`),
    enabled: !!participantId,
  });

  const items = trackers ?? [];

  if (items.length === 0) {
    return (
      <WidgetShell title="Daily Trackers" icon={Activity} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <p className="text-sm text-muted-foreground py-4 text-center">No trackers configured</p>
      </WidgetShell>
    );
  }

  if (column === "sidebar") {
    return (
      <WidgetShell title="Daily Trackers" icon={Activity} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{t.name}</span>
              <span className="text-xs text-muted-foreground">{t._count?.entries ?? 0} entries</span>
            </div>
          ))}
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Daily Trackers" icon={Activity} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
      <div className="space-y-3">
        {items.map((t) => (
          <div key={t.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{t.name}</p>
              <span className="text-xs text-muted-foreground">{t._count?.entries ?? 0} entries</span>
            </div>
            {t.fields.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {t.fields.map((f) => (
                  <span key={f.id} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {f.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
