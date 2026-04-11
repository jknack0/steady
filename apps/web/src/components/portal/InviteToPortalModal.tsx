"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePortalInvitation } from "@/hooks/use-portal-invitations";

// FR-1 / UX Flow 15 + Flow 16 — "Invite to portal" modal.
// Used on both the clients list (for brand-new clients) and the client
// detail page (for existing clients who don't yet have portal access).

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the form pre-fills these values and disables editing
   *  (used from the client detail page). */
  preset?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  onSuccess?: () => void;
}

export function InviteToPortalModal({
  open,
  onOpenChange,
  preset,
  onSuccess,
}: Props) {
  const [firstName, setFirstName] = useState(preset?.firstName ?? "");
  const [lastName, setLastName] = useState(preset?.lastName ?? "");
  const [email, setEmail] = useState(preset?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const createInvitation = useCreatePortalInvitation();

  // Reset form when the modal reopens
  useEffect(() => {
    if (open) {
      setFirstName(preset?.firstName ?? "");
      setLastName(preset?.lastName ?? "");
      setEmail(preset?.email ?? "");
      setError(null);
    }
  }, [open, preset]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast || !trimmedEmail) {
      setError("All fields are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      await createInvitation.mutateAsync({
        recipientEmail: trimmedEmail,
        firstName: trimmedFirst,
        lastName: trimmedLast,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send invitation. Please try again."
      );
    }
  }

  const title = preset
    ? `Invite ${preset.firstName} ${preset.lastName} to their portal`.trim()
    : "Invite new client";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email with instructions to set up their
            account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="invite-first-name">First name</Label>
              <Input
                id="invite-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={!!preset || createInvitation.isPending}
                required
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="invite-last-name">Last name</Label>
              <Input
                id="invite-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={!!preset || createInvitation.isPending}
                required
                maxLength={100}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!preset || createInvitation.isPending}
              required
              autoComplete="email"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createInvitation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createInvitation.isPending}
              aria-busy={createInvitation.isPending}
            >
              {createInvitation.isPending ? "Sending..." : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
