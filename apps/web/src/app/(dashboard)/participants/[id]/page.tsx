"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useParticipantStats } from "@/hooks/use-participant-stats";
import { cn } from "@/lib/utils";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Tab = "patterns" | "overview";

export default function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("patterns");

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/participants"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Participants
        </Link>
        <h1 className="text-2xl font-bold">Participant Insights</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {(["patterns", "overview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "patterns" ? "Patterns" : "Overview"}
          </button>
        ))}
      </div>

      {tab === "patterns" ? (
        <PatternsTab participantId={id} />
      ) : (
        <div className="text-muted-foreground">Overview coming soon.</div>
      )}
    </div>
  );
}

// ── Patterns Tab ─────────────────────────────────────────

function PatternsTab({ participantId }: { participantId: string }) {
  const { data: stats, isLoading, isError } = useParticipantStats(participantId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-muted-foreground">Failed to load participant stats.</p>
      </div>
    );
  }

  const hasConcerns =
    stats.taskCompletion.rate < 0.4 ||
    stats.journaling.rate < 0.3 ||
    (stats.regulationTrend.average !== null && stats.regulationTrend.average < 4);

  return (
    <div className="space-y-6">
      {/* Concerning trends alert */}
      {hasConcerns && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <h3 className="text-sm font-semibold text-rose-800 mb-1 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" /> Concerning Trends
          </h3>
          <ul className="text-sm text-rose-700 space-y-1">
            {stats.taskCompletion.rate < 0.4 && (
              <li>Task completion rate is low ({Math.round(stats.taskCompletion.rate * 100)}%)</li>
            )}
            {stats.journaling.rate < 0.3 && (
              <li>Journaling consistency is below 30% ({Math.round(stats.journaling.rate * 100)}%)</li>
            )}
            {stats.regulationTrend.average !== null && stats.regulationTrend.average < 4 && (
              <li>Average regulation score is {stats.regulationTrend.average}/10</li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completion Bar Chart (Weekly) */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-1">Task Completion</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {stats.taskCompletion.completed}/{stats.taskCompletion.total} tasks completed ({Math.round(stats.taskCompletion.rate * 100)}%)
          </p>
          {stats.taskCompletion.weeklyBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.taskCompletion.weeklyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" />
                <XAxis
                  dataKey="weekStart"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  fontSize={12}
                  stroke="#8A8A8A"
                />
                <YAxis fontSize={12} stroke="#8A8A8A" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value, name) => [
                    value,
                    name === "completed" ? "Completed" : "Total",
                  ]}
                />
                <Bar dataKey="total" fill="#E3EDED" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#5B8A8A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No task data yet" />
          )}
        </div>

        {/* Regulation Trend Line Chart */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-1">Regulation Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {stats.regulationTrend.average !== null
              ? `Average: ${stats.regulationTrend.average}/10`
              : "No scores recorded"}
          </p>
          {stats.regulationTrend.points.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.regulationTrend.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  fontSize={12}
                  stroke="#8A8A8A"
                />
                <YAxis domain={[1, 10]} fontSize={12} stroke="#8A8A8A" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value) => [value, "Score"]}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#5B8A8A"
                  strokeWidth={2}
                  dot={{ fill: "#5B8A8A", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No regulation data yet" />
          )}
        </div>

        {/* Journaling Consistency Calendar Heatmap */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-1">Journaling Consistency</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {stats.journaling.journaledDays}/{stats.journaling.totalDays} days ({Math.round(stats.journaling.rate * 100)}%)
            {stats.journaling.streak > 0 && ` · ${stats.journaling.streak}-day streak`}
          </p>
          <CalendarHeatmap calendar={stats.journaling.calendar} />
        </div>

        {/* Homework Completion Per-Module */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-1">Homework Completion</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {stats.homeworkCompletion.overall.completedParts}/{stats.homeworkCompletion.overall.totalParts} items ({Math.round(stats.homeworkCompletion.overall.rate * 100)}%)
          </p>
          {stats.homeworkCompletion.modules.length > 0 ? (
            <div className="space-y-3">
              {stats.homeworkCompletion.modules.map((mod) => (
                <div key={mod.moduleId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium truncate mr-2">{mod.moduleTitle}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {mod.completedParts}/{mod.totalParts}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.round(mod.rate * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart message="No homework assignments yet" />
          )}
        </div>
      </div>

      {/* Summary cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Time Estimation"
          value={
            stats.timeEstimation.sampleSize > 0
              ? `${Math.round(stats.timeEstimation.averageAccuracy * 100)}%`
              : "N/A"
          }
          detail={`${stats.timeEstimation.sampleSize} tasks measured`}
          trend={stats.timeEstimation.averageAccuracy}
          threshold={0.7}
        />
        <SummaryCard
          label="System Check-in"
          value={`${Math.round(stats.systemCheckin.rate * 100)}%`}
          detail={`${stats.systemCheckin.totalCompleted}/${stats.systemCheckin.totalExpected} days`}
          trend={stats.systemCheckin.rate}
          threshold={0.5}
        />
        <SummaryCard
          label="Task Rate"
          value={`${Math.round(stats.taskCompletion.rate * 100)}%`}
          detail={`${stats.taskCompletion.completed} completed`}
          trend={stats.taskCompletion.rate}
          threshold={0.5}
        />
        <SummaryCard
          label="Journal Rate"
          value={`${Math.round(stats.journaling.rate * 100)}%`}
          detail={`${stats.journaling.streak}-day streak`}
          trend={stats.journaling.rate}
          threshold={0.4}
        />
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  trend,
  threshold,
}: {
  label: string;
  value: string;
  detail: string;
  trend: number;
  threshold: number;
}) {
  const TrendIcon = trend >= threshold ? TrendingUp : trend > 0 ? Minus : TrendingDown;
  const trendColor =
    trend >= threshold
      ? "text-green-600"
      : trend > 0
        ? "text-yellow-600"
        : "text-rose-600";

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <TrendIcon className={cn("h-3 w-3", trendColor)} />
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function CalendarHeatmap({
  calendar,
}: {
  calendar: Array<{ date: string; hasEntry: boolean; regulationScore: number | null }>;
}) {
  if (calendar.length === 0) {
    return <EmptyChart message="No journal entries yet" />;
  }

  // Build a 4-week grid
  const entryMap = new Map(calendar.map((c) => [c.date, c]));
  const weeks: Array<Array<{ date: string; entry: (typeof calendar)[0] | null }>> = [];

  // Start 28 days ago
  const start = new Date();
  start.setDate(start.getDate() - 27);

  let currentWeek: Array<{ date: string; entry: (typeof calendar)[0] | null }> = [];

  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    currentWeek.push({ date: dateStr, entry: entryMap.get(dateStr) || null });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      {/* Day labels */}
      <div className="flex gap-1 mb-1 ml-0">
        {dayLabels.map((d, i) => (
          <div key={i} className="w-8 text-center text-[10px] text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1">
            {week.map((day) => {
              const hasEntry = !!day.entry;
              const score = day.entry?.regulationScore;
              const bg = !hasEntry
                ? "bg-secondary"
                : score && score >= 7
                  ? "bg-green-400"
                  : score && score >= 4
                    ? "bg-yellow-400"
                    : score
                      ? "bg-rose-400"
                      : "bg-primary";

              return (
                <div
                  key={day.date}
                  className={cn("w-8 h-8 rounded-sm", bg)}
                  title={`${day.date}${hasEntry ? ` · Score: ${score ?? "—"}` : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
