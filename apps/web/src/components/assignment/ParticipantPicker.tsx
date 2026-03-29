"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Check } from "lucide-react";

interface Client {
  id: string;
  clientId: string;
  status: string;
  client: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    participantProfile?: { id: string };
  };
}

interface ParticipantPickerProps {
  onSelect: (participantId: string, name: string) => void;
  selectedId?: string;
}

export function ParticipantPicker({ onSelect, selectedId }: ParticipantPickerProps) {
  const [search, setSearch] = useState("");

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["clinician-clients"],
    queryFn: () => api.get("/api/clinician/clients"),
  });

  const filtered = useMemo(() => {
    if (!clients) return [];
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) => {
      const name = `${c.client.firstName || ""} ${c.client.lastName || ""}`.toLowerCase();
      return name.includes(q) || c.client.email.toLowerCase().includes(q);
    });
  }, [clients, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1 max-h-[40vh] overflow-y-auto">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {search ? `No matches for "${search}"` : "No clients found. Add a client first."}
          </p>
        )}

        {filtered.map((c) => {
          const participantId = c.client.participantProfile?.id;
          if (!participantId) return null;
          const name = [c.client.firstName, c.client.lastName].filter(Boolean).join(" ") || c.client.email;
          const isSelected = selectedId === participantId;

          return (
            <button
              key={c.id}
              type="button"
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                isSelected ? "bg-primary/10 border border-primary" : "hover:bg-accent/50 border border-transparent"
              }`}
              onClick={() => onSelect(participantId, name)}
            >
              <div>
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{c.client.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                  {c.status}
                </Badge>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
