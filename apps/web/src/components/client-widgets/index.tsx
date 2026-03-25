import type { ComponentType } from "react";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { ClientDemographicsWidget } from "./client-demographics";

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
  client_sessions: PlaceholderWidget,
  client_homework: PlaceholderWidget,
  client_trackers: PlaceholderWidget,
  client_assessments: PlaceholderWidget,
  client_journal: PlaceholderWidget,
  client_progress: PlaceholderWidget,
  client_alerts: PlaceholderWidget,
  client_notes: PlaceholderWidget,
  client_quick_actions: PlaceholderWidget,
};
