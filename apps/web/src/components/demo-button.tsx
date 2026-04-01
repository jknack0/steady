"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

const DEMO_EMAIL = "admin@admin.com";
const DEMO_PASSWORD = "Admin1";

interface DemoButtonProps {
  className?: string;
  children: React.ReactNode;
}

export function DemoButton({ className, children }: DemoButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDemo = async () => {
    setLoading(true);
    try {
      await api.post("/api/auth/login", {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      router.push("/dashboard");
    } catch {
      // If demo login fails, redirect to login page
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDemo} disabled={loading} className={className}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : null}
      {children}
    </button>
  );
}
