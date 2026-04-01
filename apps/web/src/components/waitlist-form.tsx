"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Loader2, CheckCircle2 } from "lucide-react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setError("");

    try {
      await api.post("/api/waitlist", { email: email.trim() });
      setStatus("success");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 text-[var(--steady-teal)]">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">You're on the list! We'll be in touch.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
        placeholder="you@example.com"
        required
        className="flex-1 rounded-lg border border-[var(--steady-warm-200)] bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--steady-teal)] focus:border-transparent"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center justify-center rounded-lg bg-[var(--steady-teal)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--steady-teal-dark)] transition-colors disabled:opacity-60"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Join Waitlist"
        )}
      </button>
      {status === "error" && (
        <p className="text-xs text-destructive sm:absolute sm:mt-12">{error}</p>
      )}
    </form>
  );
}
