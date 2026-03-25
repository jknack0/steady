import type { ComponentType } from "react";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { ClientDemographicsWidget } from "./client-demographics";
import { ClientSessionsWidget } from "./client-sessions";
import { ClientHomeworkWidget } from "./client-homework";
import { ClientTrackersWidget } from "./client-trackers";
import { ClientProgressWidget } from "./client-progress";
import { ClientAlertsWidget } from "./client-alerts";
import { ClientNotesWidget } from "./client-notes";
import { ClientQuickActionsWidget } from "./client-quick-actions";

function PlaceholderWidget({ isEditing }: WidgetProps) {
  return (
    <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
      Widget coming soon
    </div>
  );
}

// Client widget props are heterogeneous per widget type
export const CLIENT_WIDGET_COMPONENTS: Record<string, ComponentType<any>> = {
  client_demographics: ClientDemographicsWidget,
  client_sessions: ClientSessionsWidget,
  client_homework: ClientHomeworkWidget,
  client_trackers: ClientTrackersWidget,
  client_assessments: PlaceholderWidget,
  client_journal: PlaceholderWidget,
  client_progress: ClientProgressWidget,
  client_alerts: ClientAlertsWidget,
  client_notes: ClientNotesWidget,
  client_quick_actions: ClientQuickActionsWidget,
};
