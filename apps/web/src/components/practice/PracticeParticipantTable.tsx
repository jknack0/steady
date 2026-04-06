"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, Users } from "lucide-react";
import { usePracticeParticipants } from "@/hooks/use-practice-dashboard";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { formatShortDate } from "@/lib/format";

interface PracticeParticipantTableProps {
  practiceId: string;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  INVITED: "bg-blue-100 text-blue-800 border-blue-200",
  PAUSED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  COMPLETED: "bg-gray-100 text-gray-600 border-gray-200",
  DROPPED: "bg-red-100 text-red-800 border-red-200",
};

export function PracticeParticipantTable({
  practiceId,
}: PracticeParticipantTableProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = usePracticeParticipants(practiceId, {
    search: search || undefined,
  });

  const participants = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">All Participants</h2>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : participants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No participants"
          description={
            search
              ? "No participants match your search."
              : "No participants in this practice yet."
          }
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Clinician
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Program
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Enrolled
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {participants.map((p) => (
                <tr
                  key={`${p.participantId}-${p.programTitle}`}
                  className="hover:bg-accent/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/participants/${p.participantId}`}
                      className="block"
                    >
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{p.clinicianName}</td>
                  <td className="px-4 py-3 text-sm">{p.programTitle}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={STATUS_BADGE[p.enrollmentStatus] || ""}
                    >
                      {p.enrollmentStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatShortDate(p.enrolledAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/participants/${p.participantId}`}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.cursor && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" size="sm">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
