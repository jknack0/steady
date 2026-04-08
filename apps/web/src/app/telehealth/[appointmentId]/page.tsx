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

  const role: "therapist" | "patient" =
    user.role === "CLINICIAN" || user.role === "ADMIN" ? "therapist" : "patient";

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
