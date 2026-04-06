"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserPlus, Trash2 } from "lucide-react";
import {
  useInviteClinician,
  useRemoveMember,
} from "@/hooks/use-practice-dashboard";

interface Member {
  id: string;
  clinicianId: string;
  role: string;
  name: string;
  email: string;
  joinedAt: string;
}

interface MemberManagementProps {
  practiceId: string;
  practiceName: string;
  members: Member[];
  isOwner: boolean;
}

export function MemberManagement({
  practiceId,
  practiceName,
  members,
  isOwner,
}: MemberManagementProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const invite = useInviteClinician(practiceId);
  const remove = useRemoveMember(practiceId);

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    invite.mutate(
      { email: inviteEmail.trim() },
      {
        onSuccess: () => setInviteEmail(""),
      },
    );
  }

  function handleRemove() {
    if (!removeTarget) return;
    remove.mutate(removeTarget.id, {
      onSuccess: () => setRemoveTarget(null),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Team Members</h2>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Email
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Role
              </th>
              {isOwner && (
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium">{member.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {member.email}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={member.role === "OWNER" ? "default" : "outline"}>
                    {member.role === "OWNER" ? "Owner" : "Member"}
                  </Badge>
                </td>
                {isOwner && (
                  <td className="px-4 py-3 text-right">
                    {member.role !== "OWNER" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoveTarget(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite form */}
      {isOwner && (
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Clinician email address..."
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="max-w-sm"
          />
          <Button
            onClick={handleInvite}
            disabled={!inviteEmail.trim() || invite.isPending}
            className="gap-1.5"
          >
            {invite.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Invite
          </Button>
        </div>
      )}
      {invite.isError && (
        <p className="text-sm text-destructive mt-2">
          {(invite.error as Error).message}
        </p>
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Remove {removeTarget?.name} from {practiceName}? They will lose
              access to practice templates and visibility.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={remove.isPending}
            >
              {remove.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
