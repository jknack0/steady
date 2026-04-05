"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

interface ProvisionResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    hasCompletedSetup: boolean;
  };
  accessToken: string;
  refreshToken: string;
  isNewAccount: boolean;
}

export function DemoProvisionForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;

    setLoading(true);
    setError("");

    try {
      await api.post<ProvisionResult>("/api/demo/provision", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      // Cookies are set by the server — refresh auth state to pick them up
      await refreshUser();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          required
          className="flex-1 rounded-lg border border-[var(--steady-warm-200)] bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--steady-teal)] focus:border-transparent"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          required
          className="flex-1 rounded-lg border border-[var(--steady-warm-200)] bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--steady-teal)] focus:border-transparent"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="Work email"
          required
          className="flex-1 rounded-lg border border-[var(--steady-warm-200)] bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--steady-teal)] focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--steady-teal)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--steady-teal-dark)] transition-colors shadow-sm disabled:opacity-60 whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Setting up...
            </>
          ) : (
            "Try the Demo"
          )}
        </button>
      </div>
      {error && (
        <p className="text-sm text-destructive mt-3 text-center">{error}</p>
      )}
      <p className="text-xs text-muted-foreground mt-4 text-center">
        No sales call. No credit card. You'll be inside the platform in seconds.
      </p>
    </form>
  );
}
