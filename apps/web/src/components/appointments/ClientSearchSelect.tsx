"use client";

import { useEffect, useMemo, useState } from "react";
import { useParticipantSearch, useCreateParticipant } from "@/hooks/use-participant-search";
import { usePractices } from "@/hooks/use-practice-dashboard";
import { appointmentStrings as S } from "@/lib/strings/appointments";
import type { ParticipantSearchResult } from "@/lib/appointment-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  value: ParticipantSearchResult | null;
  onChange: (p: ParticipantSearchResult | null) => void;
  readOnly?: boolean;
}

export function ClientSearchSelect({ value, onChange, readOnly }: Props) {
  const [raw, setRaw] = useState("");
  const [debounced, setDebounced] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(raw), 300);
    return () => clearTimeout(t);
  }, [raw]);

  const search = useParticipantSearch(debounced, !readOnly && !value);
  const createParticipant = useCreateParticipant();
  const { data: practices } = usePractices();

  // Filter practice clinicians by search query
  const matchingClinicians = useMemo(() => {
    if (!practices || debounced.length < 2) return [];
    const q = debounced.toLowerCase();
    return practices.flatMap((p) =>
      p.members
        .filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
        .map((m) => {
          const [firstName, ...rest] = m.name.split(" ");
          return {
            id: m.clinicianId,
            firstName: firstName || m.name,
            lastName: rest.join(" ") || "",
            email: m.email,
            _isClinician: true,
          };
        }),
    );
  }, [practices, debounced]);

  const tooShort = useMemo(() => raw.length > 0 && raw.length < 2, [raw]);
  const rateLimited = (search.error as Error | null)?.message?.toLowerCase().includes("rate");

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-gray-50">
        <span className="flex-1 text-sm">
          {value.firstName} {value.lastName} — {value.email}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Clear client"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  if (showAddForm) {
    return (
      <div className="space-y-2 rounded-md border p-3 bg-slate-50">
        <div className="text-sm font-medium">{S.addClientPanelTitle}</div>
        <div className="space-y-2">
          <div>
            <Label htmlFor="new-first">{S.addClientFirstName}</Label>
            <Input id="new-first" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-last">{S.addClientLastName}</Label>
            <Input id="new-last" value={newLast} onChange={(e) => setNewLast(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-email">{S.addClientEmail}</Label>
            <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAddForm(false);
              setEmailError(null);
            }}
          >
            {S.addClientCancel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={createParticipant.isPending || !newFirst || !newLast || !newEmail}
            onClick={async () => {
              setEmailError(null);
              try {
                const created = await createParticipant.mutateAsync({
                  firstName: newFirst,
                  lastName: newLast,
                  email: newEmail,
                });
                onChange(created);
                setShowAddForm(false);
              } catch (e) {
                const msg = (e as Error).message || "";
                if (msg.toLowerCase().includes("already")) {
                  setEmailError(S.addClientEmailExists);
                } else {
                  setEmailError(msg);
                }
              }
            }}
          >
            {S.addClientSubmit}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Input
        type="text"
        placeholder={S.modalClientPlaceholder}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        aria-label="Client search"
      />
      {tooShort && <p className="text-xs text-muted-foreground mt-1">{S.modalClientHint}</p>}
      {rateLimited && <p className="text-xs text-red-600 mt-1">{S.errorRateLimitSearch}</p>}
      {debounced.length >= 2 && (
        <div className="mt-1 max-h-60 overflow-y-auto rounded-md border bg-white shadow-sm">
          {search.isLoading && <div className="p-2 text-sm text-muted-foreground">Loading…</div>}
          {matchingClinicians.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">Clinicians</div>
              <ul>
                {matchingClinicians.map((c) => (
                  <li key={`clinician-${c.id}`}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => {
                        onChange(c);
                        setRaw("");
                      }}
                    >
                      {c.firstName} {c.lastName} — {c.email}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!search.isLoading && search.data && search.data.length > 0 && (
            <>
              {matchingClinicians.length > 0 && (
                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">Clients</div>
              )}
              <ul>
                {search.data.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => {
                        onChange(p);
                        setRaw("");
                      }}
                    >
                      {p.firstName} {p.lastName} — {p.email}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!search.isLoading && search.data && search.data.length === 0 && matchingClinicians.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground">{S.modalClientNoMatches}</div>
          )}
          <button
            type="button"
            className="w-full border-t px-3 py-2 text-left text-sm font-medium hover:bg-accent"
            onClick={() => {
              setShowAddForm(true);
              setNewFirst("");
              setNewLast("");
              setNewEmail("");
            }}
          >
            {S.modalClientAddNew(debounced)}
          </button>
        </div>
      )}
    </div>
  );
}
