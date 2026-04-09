"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAssignProgram, useAppendModules } from "@/hooks/use-assignment";
import { ParticipantPicker } from "./ParticipantPicker";
import { TemplatePicker } from "./TemplatePicker";
import { ProgramPicker } from "./ProgramPicker";
import { ProgramTreeSelect } from "./ProgramTreeSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

type Step = "select" | "customize" | "conflict";

interface AssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string;      // Entry from program page
  participantId?: string;   // Entry from client profile
  participantName?: string;
  onSuccess?: () => void;
}

interface PreviewModule {
  id: string;
  title: string;
  sortOrder: number;
  parts: { id: string; title: string; type: string; sortOrder: number }[];
}

interface ProgramPreview {
  id: string;
  title: string;
  modules: PreviewModule[];
}

export function AssignmentModal({
  open,
  onOpenChange,
  templateId: initialTemplateId,
  participantId: initialParticipantId,
  participantName: initialParticipantName,
  onSuccess,
}: AssignmentModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || "");
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState(initialParticipantId || "");
  const [selectedParticipantName, setSelectedParticipantName] = useState(initialParticipantName || "");
  const [excludedModuleIds, setExcludedModuleIds] = useState<string[]>([]);
  const [excludedPartIds, setExcludedPartIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [conflictProgramId, setConflictProgramId] = useState("");

  const entryPoint = initialTemplateId ? "program" : "client";
  const templateIdToUse = initialTemplateId || selectedTemplateId;

  const assignMutation = useAssignProgram();
  const appendMutation = useAppendModules();

  // Fetch program preview for tree
  const { data: preview, isLoading: previewLoading } = useQuery<ProgramPreview>({
    queryKey: ["programs", templateIdToUse, "preview"],
    queryFn: () => api.get(`/api/programs/${templateIdToUse}/preview`),
    enabled: !!templateIdToUse && step === "customize",
  });

  const handleSelectionChange = useCallback((exModules: string[], exParts: string[]) => {
    setExcludedModuleIds(exModules);
    setExcludedPartIds(exParts);
  }, []);

  const handleNext = () => {
    setStep("customize");
    setError("");
  };

  const handleBack = () => {
    setStep("select");
    setError("");
  };

  const handleAssign = async () => {
    setError("");
    try {
      const result = await assignMutation.mutateAsync({
        templateId: templateIdToUse,
        participantId: selectedParticipantId,
        excludedModuleIds,
        excludedPartIds,
      });
      onSuccess?.();
      handleClose();
      // Redirect to the new client program for editing
      router.push(`/programs/${result.program.id}`);
    } catch (err: any) {
      if (err.message?.includes("already has this program")) {
        // Extract clientProgramId from error response if available
        setConflictProgramId(templateIdToUse);
        setStep("conflict");
        return;
      }
      setError(err.message || "Failed to assign. Please try again.");
    }
  };

  const handleAppend = async () => {
    setError("");
    try {
      const result = await appendMutation.mutateAsync({
        templateId: templateIdToUse,
        clientProgramId: conflictProgramId,
        excludedModuleIds,
        excludedPartIds,
      });
      onSuccess?.();
      handleClose();
      router.push(`/programs/${result.program.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to add modules. Please try again.");
    }
  };

  const handleClose = () => {
    setStep("select");
    setSelectedTemplateId(initialTemplateId || "");
    setSelectedParticipantId(initialParticipantId || "");
    setExcludedModuleIds([]);
    setExcludedPartIds([]);
    setError("");
    setConflictProgramId("");
    onOpenChange(false);
  };

  const isAssigning = assignMutation.isPending || appendMutation.isPending;
  const canNext = entryPoint === "program" ? !!selectedParticipantId : !!selectedTemplateId;

  const title = step === "conflict"
    ? "Program Already Assigned"
    : step === "customize"
      ? `Customize for ${selectedParticipantName}`
      : entryPoint === "program"
        ? `Assign "${selectedTemplateName || "Program"}"`
        : `Add Program for ${selectedParticipantName}`;

  const subtitle = step === "customize"
    ? "Uncheck modules or parts to exclude them"
    : entryPoint === "program"
      ? "Select a client to assign this program to"
      : "Choose a program to assign to this client";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="lg">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
          {step !== "conflict" && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <DialogBody>
          {step === "select" && entryPoint === "program" && (
            <ParticipantPicker
              selectedId={selectedParticipantId}
              onSelect={(id, name) => {
                setSelectedParticipantId(id);
                setSelectedParticipantName(name);
              }}
            />
          )}

          {step === "select" && entryPoint === "client" && (
            <ProgramPicker
              selectedId={selectedTemplateId}
              onSelect={(id, name) => {
                setSelectedTemplateId(id);
                setSelectedTemplateName(name);
              }}
            />
          )}

          {step === "customize" && (
            <>
              {previewLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              )}
              {preview && (
                <ProgramTreeSelect
                  modules={preview.modules}
                  onChange={handleSelectionChange}
                  disabled={isAssigning}
                />
              )}
              {error && (
                <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
            </>
          )}

          {step === "conflict" && (
            <div className="space-y-4 py-4">
              <p className="text-sm">
                {selectedParticipantName} already has this program assigned. Would you
                like to add more modules from this template?
              </p>
              <p className="text-xs text-muted-foreground">
                New modules will be added after the existing content in their program.
              </p>
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="px-6 pb-6 pt-2">
          {step === "select" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleNext} disabled={!canNext}>Next</Button>
            </>
          )}

          {step === "customize" && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isAssigning}>Back</Button>
              <Button variant="outline" onClick={handleClose} disabled={isAssigning}>Cancel</Button>
              <Button onClick={handleAssign} disabled={isAssigning}>
                {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isAssigning ? "Assigning..." : "Assign"}
              </Button>
            </>
          )}

          {step === "conflict" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button variant="outline" onClick={handleClose}>View Existing</Button>
              <Button onClick={() => { setStep("customize"); setError(""); }}>
                Add Modules
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
