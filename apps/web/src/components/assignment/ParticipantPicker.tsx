"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Check } from "lucide-react";

interface ClientRow {
  id: string;
  clientId: string;
  participantProfileId: string | null;
  name: string;
  email: string;
  status: string;
}

interface ParticipantPickerProps {
  onSelect: (participantId: string, name: string) => void;
  selectedId?: string;
}

export function ParticipantPicker({ onSelect, selectedId }: ParticipantPickerProps) {
  const [search, setSearch] = useState("");

  const { data: clients, isLoading } = useQuery<ClientRow[]>({
    queryKey: ["clinician-clients"],
    queryFn: () => api.get("/api/clinician/clients"),
  });

  const filtered = useMemo(() => {
    if (!clients) return [];
    const withProfile = clients.filter((c) => c.participantProfileId);
    if (!search) return withProfile;
    const q = search.toLowerCase();
    return withProfile.filter((c) =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
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
          const isSelected = selectedId === c.participantProfileId;
          return (
            <button
              key={c.id}
              type="button"
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                isSelected ? "bg-primary/10 border border-primary" : "hover:bg-accent/50 border border-transparent"
              }`}
              onClick={() => onSelect(c.participantProfileId!, c.name)}
            >
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.email}</p>
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
