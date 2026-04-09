"use client";

import { useState, useEffect } from "react";
import { useLogRtmTime, type RtmClientRow } from "@/hooks/use-rtm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTIVITY_TYPES, TIME_PRESETS, type TimePreset } from "@/lib/rtm-constants";

interface LogTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** List of RTM clients for the client picker. When empty, preselectedEnrollmentId is required. */
  clients: RtmClientRow[];
  /** Pre-select a specific enrollment (skips client picker). */
  preselectedEnrollmentId?: string;
  /** Pre-check the interactive communication checkbox. */
  presetInteractive?: boolean;
  /** Optional client name to display in the description. Used by the detail page. */
  clientName?: string;
}

/**
 * Shared "Log Monitoring Time" dialog used by both the RTM dashboard
 * and the RTM enrollment detail page.
 *
 * The dashboard version shows a client picker dropdown when no
 * preselectedEnrollmentId is provided.
 */
export function LogTimeDialog({
  open,
  onOpenChange,
  clients,
  preselectedEnrollmentId,
  presetInteractive,
  clientName,
}: LogTimeDialogProps) {
  const [enrollmentId, setEnrollmentId] = useState(preselectedEnrollmentId || "");
  const [duration, setDuration] = useState("");
  const [activityType, setActivityType] = useState("");
  const [description, setDescription] = useState("");
  const [isInteractive, setIsInteractive] = useState(presetInteractive || false);
  const logTime = useLogRtmTime();

  const effectiveEnrollmentId = preselectedEnrollmentId || enrollmentId;

  // Find the selected client to show progress
  const selectedClient = clients.find(
    (c) => c.rtmEnrollmentId === effectiveEnrollmentId,
  );
  const currentMinutes = selectedClient?.currentPeriod?.clinicianMinutes ?? 0;

  useEffect(() => {
    if (preselectedEnrollmentId) setEnrollmentId(preselectedEnrollmentId);
  }, [preselectedEnrollmentId]);

  useEffect(() => {
    if (presetInteractive) {
      setIsInteractive(true);
      setActivityType("INTERACTIVE_COMMUNICATION");
    }
  }, [presetInteractive]);

  function resetForm() {
    setEnrollmentId(preselectedEnrollmentId || "");
    setDuration("");
    setActivityType("");
    setDescription("");
    setIsInteractive(presetInteractive || false);
  }

  function applyPreset(preset: TimePreset) {
    setDuration(String(preset.duration));
    setActivityType(preset.activityType);
    setDescription(preset.description);
    setIsInteractive(preset.isInteractive ?? false);
  }

  function handleSubmit() {
    if (!effectiveEnrollmentId || !duration || !activityType) return;
    logTime.mutate(
      {
        rtmEnrollmentId: effectiveEnrollmentId,
        durationMinutes: parseInt(duration, 10),
        activityType,
        description: description.trim() || undefined,
        isInteractiveCommunication: isInteractive,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      },
    );
  }

  const dialogDescription = clientName
    ? `Record time spent monitoring ${clientName}.`
    : "Record time spent on RTM monitoring activities.";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent size="md">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Log Monitoring Time</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          {/* Progress indicator */}
          {effectiveEnrollmentId && (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {currentMinutes}/20 min logged this period
              </span>
              <div className="ml-auto h-1.5 w-20 rounded-full bg-gray-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    currentMinutes >= 20 ? "bg-green-500" : "bg-blue-500",
                  )}
                  style={{ width: `${Math.min((currentMinutes / 20) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Quick Presets
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs h-auto py-2"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            {/* Client select -- shown only on the dashboard (no preselectedEnrollmentId) */}
            {!preselectedEnrollmentId && (
              <div className="space-y-2">
                <Label htmlFor="log-client">Client</Label>
                <Select value={effectiveEnrollmentId} onValueChange={setEnrollmentId}>
                  <SelectTrigger id="log-client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.rtmEnrollmentId} value={c.rtmEnrollmentId}>
                        {c.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="log-duration">Duration (minutes)</Label>
              <Input
                id="log-duration"
                type="number"
                min="1"
                max="120"
                placeholder="e.g. 15"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            {/* Activity type */}
            <div className="space-y-2">
              <Label htmlFor="log-activity">Activity Type</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger id="log-activity">
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="log-description">Description</Label>
              <Textarea
                id="log-description"
                placeholder="Brief description of the activity..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Interactive communication checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="log-interactive"
                checked={isInteractive}
                onCheckedChange={(checked) => setIsInteractive(checked === true)}
              />
              <Label htmlFor="log-interactive" className="text-sm font-normal cursor-pointer">
                This included a live interaction with the client
              </Label>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              logTime.isPending ||
              !effectiveEnrollmentId ||
              !duration ||
              !activityType
            }
          >
            {logTime.isPending && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            Log Time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
