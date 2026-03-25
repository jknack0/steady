"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  BookOpen,
  Calendar,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  Video,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

interface DashboardData {
  stats: {
    totalClients: number;
    publishedPrograms: number;
    todaySessionCount: number;
    weekHomeworkRate: number;
    overdueCount: number;
  };
  todaySessions: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    clientName: string;
    programTitle: string;
    videoCallUrl: string | null;
  }>;
  recentHomework: Array<{
    id: string;
    title: string;
    clientName: string;
    completedAt: string;
    hasResponses: boolean;
  }>;
  overdueHomework: Array<{
    id: string;
    title: string;
    clientName: string;
    dueDate: string;
  }>;
  alerts: Array<{
    clientName: string;
    field: string;
    value: number;
    max: number;
    date: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["clinician-dashboard"],
    queryFn: () => api.get("/api/clinician/dashboard"),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) return <LoadingState />;
  if (!data) return null;

  const greeting = getGreeting();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.firstName}`}
        subtitle={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${data.stats.todaySessionCount} sessions today`}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Active Clients"
          value={data.stats.totalClients}
          href="/participants"
        />
        <StatCard
          icon={Calendar}
          label="Sessions Today"
          value={data.stats.todaySessionCount}
          href="/sessions"
        />
        <StatCard
          icon={TrendingUp}
          label="Homework Rate"
          value={`${data.stats.weekHomeworkRate}%`}
          detail="this week"
          color={data.stats.weekHomeworkRate >= 70 ? "text-green-600" : data.stats.weekHomeworkRate >= 40 ? "text-amber-600" : "text-red-500"}
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={data.stats.overdueCount}
          color={data.stats.overdueCount > 0 ? "text-red-500" : "text-green-600"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Sessions + Alerts */}
        <div className="lg:col-span-2 space-y-6">

          {/* Today's Sessions */}
          <div className="rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Today&apos;s Sessions
              </h2>
              <Link href="/sessions" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {data.todaySessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No sessions scheduled today.</p>
            ) : (
              <div className="space-y-2">
                {data.todaySessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 rounded-md border p-3">
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      session.status === "COMPLETED" ? "bg-green-500" : session.status === "SCHEDULED" ? "bg-blue-500" : "bg-gray-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{session.clientName}</p>
                      <p className="text-xs text-muted-foreground">{session.programTitle}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(session.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                    {session.status === "SCHEDULED" && (
                      <Link href={`/sessions/${session.id}/prepare`}>
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          Prepare
                        </Button>
                      </Link>
                    )}
                    {session.videoCallUrl && session.status === "SCHEDULED" && (
                      <a href={session.videoCallUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-7 px-2">
                          <Video className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Check-in Alerts */}
          {data.alerts.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-5">
              <h2 className="font-semibold flex items-center gap-2 text-red-700 mb-3">
                <AlertTriangle className="h-4 w-4" /> Check-in Alerts
              </h2>
              <div className="space-y-2">
                {data.alerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md bg-white border border-red-100 p-3">
                    <Flame className="h-4 w-4 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{alert.clientName}</span>
                        {" reported "}
                        <span className="font-medium text-red-600">{alert.field}: {alert.value}/{alert.max}</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(alert.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Homework */}
          {data.overdueHomework.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-5">
              <h2 className="font-semibold flex items-center gap-2 text-amber-700 mb-3">
                <Clock className="h-4 w-4" /> Overdue Homework ({data.overdueHomework.length})
              </h2>
              <div className="space-y-2">
                {data.overdueHomework.slice(0, 8).map((hw) => (
                  <div key={hw.id} className="flex items-center gap-3 rounded-md bg-white border border-amber-100 p-3">
                    <ClipboardList className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{hw.clientName}</p>
                      <p className="text-xs text-muted-foreground">{hw.title}</p>
                    </div>
                    <span className="text-xs text-red-500 shrink-0">
                      Due {new Date(hw.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — Recent submissions */}
        <div className="space-y-6">
          <div className="rounded-lg border p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-4 w-4" /> Recent Submissions
            </h2>
            {data.recentHomework.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent submissions.</p>
            ) : (
              <div className="space-y-3">
                {data.recentHomework.map((hw) => (
                  <div key={hw.id} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{hw.clientName}</p>
                      <p className="text-xs text-muted-foreground">{hw.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {hw.completedAt && timeAgo(new Date(hw.completedAt))}
                        {hw.hasResponses && " · Has responses"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="rounded-lg border p-5">
            <h2 className="font-semibold mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/programs" className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Create Program</span>
              </Link>
              <Link href="/participants" className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Add Client</span>
              </Link>
              <Link href="/sessions" className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Schedule Session</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  href,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  detail?: string;
  href?: string;
  color?: string;
}) {
  const content = (
    <div className={cn("rounded-lg border p-4 transition-colors", href && "hover:border-primary/30 hover:shadow-sm")}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", color)}>
        {value}
      </p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
