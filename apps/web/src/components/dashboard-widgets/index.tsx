import type { ComponentType } from "react";
import type { WidgetProps } from "./widget-shell";
import { StatWidget } from "./stat-widget";
import { TodaysSessionsWidget } from "./todays-sessions";
import { CheckinAlertsWidget } from "./checkin-alerts";
import { OverdueHomeworkWidget } from "./overdue-homework";
import { RecentSubmissionsWidget } from "./recent-submissions";
import { QuickActionsWidget } from "./quick-actions";

function PlaceholderWidget({ column }: WidgetProps) {
  return (
    <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
      Widget coming soon
    </div>
  );
}

// Widget props are heterogeneous per widget type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WIDGET_COMPONENTS: Record<string, ComponentType<any>> = {
  stat_active_clients: StatWidget,
  stat_sessions_today: StatWidget,
  stat_homework_rate: StatWidget,
  stat_overdue_count: StatWidget,
  todays_sessions: TodaysSessionsWidget,
  checkin_alerts: CheckinAlertsWidget,
  overdue_homework: OverdueHomeworkWidget,
  recent_submissions: RecentSubmissionsWidget,
  quick_actions: QuickActionsWidget,
  tracker_summary: PlaceholderWidget,
  homework_status: PlaceholderWidget,
  journal_activity: PlaceholderWidget,
  assessment_scores: PlaceholderWidget,
  medication_adherence: PlaceholderWidget,
  side_effects_report: PlaceholderWidget,
  program_progress: PlaceholderWidget,
  pre_visit: PlaceholderWidget,
  recent_messages: PlaceholderWidget,
  rtm_overview: PlaceholderWidget,
  todo_progress: PlaceholderWidget,
};

export { WidgetShell, type WidgetProps } from "./widget-shell";
