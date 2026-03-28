"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, Check } from "lucide-react";
import { useCreateInvitation, type Invitation } from "@/hooks/use-invitations";
import { usePrograms } from "@/hooks/use-programs";
import { showToast } from "@/hooks/use-toast";

interface InvitePatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prefillName?: string;
  prefillEmail?: string;
}

export function InvitePatientModal({
  open,
  onOpenChange,
  onSuccess,
  prefillName,
  prefillEmail,
}: InvitePatientModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [patientName, setPatientName] = useState(prefillName ?? "");
  const [patientEmail, setPatientEmail] = useState(prefillEmail ?? "");
  const [programId, setProgramId] = useState<string>("none");
  const [sendEmail, setSendEmail] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null);

  const createInvitation = useCreateInvitation();
  const { data: programs } = usePrograms();

  function resetForm() {
    setStep(1);
    setPatientName(prefillName ?? "");
    setPatientEmail(prefillEmail ?? "");
    setProgramId("none");
    setSendEmail(false);
    setDuplicateError(null);
    setCopied(false);
    setCreatedInvitation(null);
    createInvitation.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDuplicateError(null);

    createInvitation.mutate(
      {
        patientName: patientName.trim(),
        patientEmail: patientEmail.trim(),
        programId: programId !== "none" ? programId : undefined,
        sendEmail,
      },
      {
        onSuccess: (data) => {
          setCreatedInvitation(data);
          setStep(2);
        },
        onError: (error) => {
          if (error instanceof Error && error.message.includes("active invitation already exists")) {
            setDuplicateError("An active invitation already exists for this email.");
          } else if (error instanceof Error && error.message.includes("409")) {
            setDuplicateError("An active invitation already exists for this email.");
          } else {
            showToast("Something went wrong. Please try again.", "error");
          }
        },
      }
    );
  }

  async function handleCopy() {
    if (!createdInvitation) return;
    try {
      await navigator.clipboard.writeText(createdInvitation.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the code text
    }
  }

  function handleDone() {
    onSuccess?.();
    handleOpenChange(false);
  }

  const canSubmit = patientName.trim().length > 0 && patientEmail.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite Patient</DialogTitle>
              <DialogDescription>
                Create an invite code for a new patient. They will use this code to create their account.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Patient name</Label>
                <Input
                  id="invite-name"
                  placeholder="Jane Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  disabled={createInvitation.isPending}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="jane@example.com"
                  value={patientEmail}
                  onChange={(e) => {
                    setPatientEmail(e.target.value);
                    setDuplicateError(null);
                  }}
                  disabled={createInvitation.isPending}
                  required
                  className={duplicateError ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {duplicateError && (
                  <p className="text-sm text-red-600">{duplicateError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-program">Program</Label>
                <Select
                  value={programId}
                  onValueChange={setProgramId}
                  disabled={createInvitation.isPending}
                >
                  <SelectTrigger id="invite-program">
                    <SelectValue placeholder="No program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No program</SelectItem>
                    {(programs ?? [])
                      .filter((p) => p.status === "PUBLISHED")
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="invite-send-email"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked === true)}
                  disabled={createInvitation.isPending}
                />
                <Label htmlFor="invite-send-email" className="text-sm font-normal cursor-pointer">
                  Send email notification
                </Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={createInvitation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit || createInvitation.isPending}>
                  {createInvitation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Continue
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite Created</DialogTitle>
              <DialogDescription>
                {createdInvitation?.emailSent
                  ? `Email sent to ${createdInvitation.patientEmail}`
                  : "Share this code with your patient"}
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <code
                  className="text-2xl font-mono font-bold tracking-widest select-all"
                  aria-label={createdInvitation?.code
                    .split("")
                    .join(" ")}
                >
                  {createdInvitation?.code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  aria-label="Copy invite code"
                  className="gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Your patient will enter this code when creating their account in the Steady app.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
