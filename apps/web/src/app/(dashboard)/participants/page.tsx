"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Loader2, Users, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ParticipantEnrollment {
  id: string;
  status: string;
  programTitle: string;
  participant: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  INVITED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  DROPPED: "bg-red-100 text-red-800",
};

export default function ParticipantsPage() {
  const { data: programs } = useQuery<any[]>({
    queryKey: ["programs"],
    queryFn: () => api.get("/api/programs"),
  });

  // Gather all enrollments across programs
  const programIds = programs?.map((p) => p.id) || [];

  const { data: allEnrollments, isLoading } = useQuery<ParticipantEnrollment[]>({
    queryKey: ["all-enrollments", programIds],
    queryFn: async () => {
      if (!programs || programs.length === 0) return [];
      const results = await Promise.all(
        programs.map(async (p) => {
          try {
            const enrollments = await api.get<any[]>(
              `/api/programs/${p.id}/enrollments`
            );
            return (enrollments || []).map((e: any) => ({
              ...e,
              programTitle: p.title,
            }));
          } catch {
            return [];
          }
        })
      );
      return results.flat();
    },
    enabled: !!programs && programs.length > 0,
  });

  // Deduplicate by participant id, keep all enrollment info
  const participantMap = new Map<
    string,
    { participant: ParticipantEnrollment["participant"]; enrollments: ParticipantEnrollment[] }
  >();

  for (const enrollment of allEnrollments || []) {
    const pid = enrollment.participant.id;
    const existing = participantMap.get(pid);
    if (existing) {
      existing.enrollments.push(enrollment);
    } else {
      participantMap.set(pid, {
        participant: enrollment.participant,
        enrollments: [enrollment],
      });
    }
  }

  const participants = Array.from(participantMap.values());

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Participants</h1>
      <p className="text-muted-foreground mb-6">
        View enrolled participants and their progress patterns.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : participants.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No participants enrolled yet. Publish a program and invite participants to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {participants.map(({ participant, enrollments }) => (
            <Link
              key={participant.id}
              href={`/participants/${participant.id}`}
              className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {participant.firstName} {participant.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{participant.email}</p>
                <div className="flex gap-2 mt-2">
                  {enrollments.map((e) => (
                    <Badge
                      key={e.id}
                      variant="outline"
                      className={STATUS_COLORS[e.status] || ""}
                    >
                      {e.programTitle} · {e.status.toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
