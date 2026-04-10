"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";
import { useAuth } from "@/hooks/use-auth";
import { QueryProvider } from "@/lib/query-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { Loader2 } from "lucide-react";

const TelehealthSession = dynamic(
  () =>
    import("@/components/telehealth/TelehealthSession").then(
      (mod) => mod.TelehealthSession
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[var(--steady-warm-50)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--steady-teal)]" />
      </div>
    ),
  }
);

interface Props {
  params: Promise<{ appointmentId: string }>;
}

export default function TelehealthPage({ params }: Props) {
  const { appointmentId } = use(params);

  return (
    <AuthProvider>
    <QueryProvider>
      <ProtectedRoute>
        <TelehealthPageContent appointmentId={appointmentId} />
      </ProtectedRoute>
    </QueryProvider>
    </AuthProvider>
  );
}

function TelehealthPageContent({ appointmentId }: { appointmentId: string }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--steady-warm-50)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--steady-teal)]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // NOTE: Initial role hint only — the actual role is determined by the backend
  // via isHost in the token response (based on appointment's clinicianId).
  // This prop is used only for the PRE_JOIN screen.
  const role: "therapist" | "patient" = "therapist";

  const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User";

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--steady-warm-500)]">
      <TelehealthSession
        appointmentId={appointmentId}
        participantName={displayName}
        role={role}
        onSessionEnd={() => router.push("/appointments")}
      />
    </div>
  );
}
