"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useClientPortalInvitation } from "@/hooks/use-portal-invitations";
import { InvitationStatusCard } from "./InvitationStatusCard";
import { InviteToPortalModal } from "./InviteToPortalModal";

// FR-1 / FR-10 / UX Flow 15 — Client portal access panel shown on
// the client detail page. Surfaces the current invitation status when
// one exists, or the "Invite to portal" button when none does.

interface Props {
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
}

export function ClientPortalAccessPanel({
  clientFirstName,
  clientLastName,
  clientEmail,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: invitation, isLoading } = useClientPortalInvitation(clientEmail);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500">
        Loading portal access...
      </div>
    );
  }

  // Active (visible) invitation states
  const activeStates = [
    "PENDING",
    "SENT",
    "BOUNCED",
    "COMPLAINED",
    "SEND_FAILED",
    "EXPIRED",
    "ACCEPTED",
  ];

  const hasActiveInvitation =
    invitation && activeStates.includes(invitation.status);

  return (
    <>
      {hasActiveInvitation ? (
        <InvitationStatusCard invitation={invitation} />
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-800 mb-0.5">
                Portal access
              </p>
              <p className="text-xs text-stone-500">
                Invite this client to access their portal on the web.
              </p>
            </div>
            <Button onClick={() => setModalOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-1.5" />
              Invite to portal
            </Button>
          </div>
        </div>
      )}

      <InviteToPortalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        preset={{
          firstName: clientFirstName,
          lastName: clientLastName,
          email: clientEmail,
        }}
      />
    </>
  );
}
