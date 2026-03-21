"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useClinicianParticipants,
  type ParticipantRow,
} from "@/hooks/use-clinician-participants";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const HOMEWORK_BADGE: Record<string, string> = {
  COMPLETE: "bg-green-100 text-green-800 border-green-200",
  PARTIAL: "bg-yellow-100 text-yellow-800 border-yellow-200",
  NOT_STARTED: "bg-gray-100 text-gray-600 border-gray-200",
};

const HOMEWORK_LABEL: Record<string, string> = {
  COMPLETE: "Complete",
  PARTIAL: "Partial",
  NOT_STARTED: "Not Started",
};

function StatusDot({ status }: { status: "green" | "amber" | "red" }) {
  const colors = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  const titles = {
    green: "On track",
    amber: "Behind",
    red: "Needs attention",
  };
  return (
    <span
      className={cn("inline-block w-2.5 h-2.5 rounded-full", colors[status])}
      title={titles[status]}
    />
  );
}

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ParticipantsPage() {
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");

  const { data, isLoading } = useClinicianParticipants({
    search: search || undefined,
    programId: programFilter !== "all" ? programFilter : undefined,
  });

  const participants = data?.participants || [];
  const programs = data?.programs || [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Participants</h1>
      <p className="text-muted-foreground mb-6">
        Track participant progress and engagement across your programs.
      </p>

      {/* Search + Filter bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {programs.length > 1 && (
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : participants.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {search
              ? "No participants match your search."
              : "No participants enrolled yet. Publish a program and invite participants to get started."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Program
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Current Module
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Homework
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Last Active
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                  Status
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {participants.map((row: ParticipantRow) => (
                <tr
                  key={row.enrollmentId}
                  className="hover:bg-accent/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/participants/${row.participantId}`}
                      className="block"
                    >
                      <p className="font-medium text-sm">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.email}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{row.programTitle}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {row.currentModule?.title || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        HOMEWORK_BADGE[row.homeworkStatus]
                      )}
                    >
                      {HOMEWORK_LABEL[row.homeworkStatus]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatLastActive(row.lastActive)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusDot status={row.statusIndicator} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/participants/${row.participantId}`}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
