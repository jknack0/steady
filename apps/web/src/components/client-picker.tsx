"use client";

import { useState, useMemo } from "react";
import { useClinicianClients, useAddClient } from "@/hooks/use-clinician-participants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";

interface ClientPickerProps {
  value: string | null;
  onChange: (clientId: string) => void;
}

export function ClientPicker({ value, onChange }: ClientPickerProps) {
  const { data: clients, isLoading } = useClinicianClients();
  const addClient = useAddClient();

  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        `${c.client.firstName} ${c.client.lastName}`.toLowerCase().includes(q) ||
        c.client.email.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const selectedClient = clients?.find((c) => c.clientId === value);

  const resetAddForm = () => {
    setShowAddForm(false);
    setNewFirstName("");
    setNewLastName("");
    setNewEmail("");
    setAddError(null);
  };

  const handleAddClient = async () => {
    setAddError(null);
    try {
      const result = await addClient.mutateAsync({
        email: newEmail.trim(),
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
      });
      onChange(result.clinicianClient.clientId);
      resetAddForm();
    } catch (err: any) {
      setAddError(err?.message || "Failed to add client");
    }
  };

  if (showAddForm) {
    return (
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new-first-name" className="text-xs">First Name</Label>
            <Input
              id="new-first-name"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              placeholder="First name"
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-last-name" className="text-xs">Last Name</Label>
            <Input
              id="new-last-name"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-email" className="text-xs">Email</Label>
          <Input
            id="new-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        {addError && (
          <p className="text-sm text-destructive">{addError}</p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetAddForm}
            disabled={addClient.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAddClient}
            disabled={addClient.isPending || !newFirstName.trim() || !newLastName.trim() || !newEmail.trim()}
          >
            {addClient.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Add Client
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Select
        value={value || ""}
        onValueChange={(val) => {
          if (val === "__add_new__") {
            setShowAddForm(true);
          } else {
            onChange(val);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a client...">
            {selectedClient
              ? `${selectedClient.client.firstName} ${selectedClient.client.lastName}`
              : "Select a client..."}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && filteredClients.length === 0 && (
            <div className="py-2 px-3 text-sm text-muted-foreground">
              No clients yet
            </div>
          )}
          {filteredClients.map((c) => (
            <SelectItem key={c.clientId} value={c.clientId}>
              <div>
                <span className="font-medium">{c.client.firstName} {c.client.lastName}</span>
                <span className="text-muted-foreground ml-2 text-xs">{c.client.email}</span>
              </div>
            </SelectItem>
          ))}
          <SelectItem value="__add_new__" className="text-primary">
            <div className="flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add New Client
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
