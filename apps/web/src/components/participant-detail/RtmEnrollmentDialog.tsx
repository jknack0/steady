"use client";

import { useState, useMemo } from "react";
import { useCreateRtmEnrollment } from "@/hooks/use-rtm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { COMMON_ICD10_CODES, CUSTOM_ICD10_PATTERN } from "@/lib/billing-constants";
import { Loader2, Search, X, Plus } from "lucide-react";

interface RtmEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  enrollmentId: string;
}

export function RtmEnrollmentDialog({
  open,
  onOpenChange,
  clientId,
  enrollmentId,
}: RtmEnrollmentDialogProps) {
  const createRtmEnrollment = useCreateRtmEnrollment();
  const [payerName, setPayerName] = useState("");
  const [subscriberId, setSubscriberId] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [monitoringType, setMonitoringType] = useState("CBT");
  const [codeSearch, setCodeSearch] = useState("");

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const removeCode = (code: string) => {
    setSelectedCodes((prev) => prev.filter((c) => c !== code));
  };

  const searchLower = codeSearch.toLowerCase().trim();

  const filteredCodes = useMemo(() => {
    if (!searchLower) return COMMON_ICD10_CODES;
    return COMMON_ICD10_CODES.filter(
      ({ code, label }) =>
        code.toLowerCase().includes(searchLower) ||
        label.toLowerCase().includes(searchLower)
    );
  }, [searchLower]);

  const selectedCodeEntries = useMemo(() => {
    return selectedCodes.map((code) => {
      const found = COMMON_ICD10_CODES.find((c) => c.code === code);
      return found ?? { code, label: "Custom code" };
    });
  }, [selectedCodes]);

  const customCodeCandidate = useMemo(() => {
    const trimmed = codeSearch.trim().toUpperCase();
    if (!CUSTOM_ICD10_PATTERN.test(trimmed)) return null;
    const existsInList = COMMON_ICD10_CODES.some((c) => c.code === trimmed);
    const alreadySelected = selectedCodes.includes(trimmed);
    if (existsInList || alreadySelected) return null;
    return trimmed;
  }, [codeSearch, selectedCodes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName.trim() || !subscriberId.trim() || selectedCodes.length === 0) return;

    try {
      await createRtmEnrollment.mutateAsync({
        clientId,
        enrollmentId,
        monitoringType: monitoringType as any,
        diagnosisCodes: selectedCodes,
        payerName: payerName.trim(),
        subscriberId: subscriberId.trim(),
        groupNumber: groupNumber.trim() || undefined,
        startDate: new Date().toISOString().split("T")[0],
      });
      onOpenChange(false);
      setPayerName("");
      setSubscriberId("");
      setGroupNumber("");
      setSelectedCodes([]);
      setCodeSearch("");
    } catch {
      // handled by React Query
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>Enable RTM Billing</DialogTitle>
            <DialogDescription>
              Enroll this client in Remote Therapeutic Monitoring. You can bill
              insurance ~$100-150/month for monitoring their app engagement between
              sessions.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="grid gap-4">
            {/* Insurance Info */}
            <div className="grid gap-2">
              <Label>Payer / Insurance *</Label>
              <Input
                placeholder="e.g., Blue Cross Blue Shield"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Subscriber ID *</Label>
                <Input
                  placeholder="e.g., XYZ123456"
                  value={subscriberId}
                  onChange={(e) => setSubscriberId(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Group Number</Label>
                <Input
                  placeholder="Optional"
                  value={groupNumber}
                  onChange={(e) => setGroupNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Monitoring Type */}
            <div className="grid gap-2">
              <Label>Monitoring Type</Label>
              <Select value={monitoringType} onValueChange={setMonitoringType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBT">Cognitive Behavioral Therapy (98978)</SelectItem>
                  <SelectItem value="MSK">Musculoskeletal (98977)</SelectItem>
                  <SelectItem value="RESPIRATORY">Respiratory (98976)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Diagnosis Codes */}
            <div className="grid gap-2">
              <Label>Diagnosis Codes (ICD-10) *</Label>
              <p className="text-xs text-muted-foreground">
                Select at least one diagnosis code for billing.
              </p>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or description..."
                  value={codeSearch}
                  onChange={(e) => setCodeSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Selected codes as removable badges */}
              {selectedCodes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCodeEntries.map(({ code, label }) => (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="text-xs gap-1 pr-1"
                    >
                      <span className="font-mono">{code}</span>
                      <button
                        type="button"
                        onClick={() => removeCode(code)}
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="max-h-56 overflow-y-auto border rounded-md p-2 space-y-0.5">
                {/* Recently Used / Selected section */}
                {selectedCodes.length > 0 && !searchLower && (
                  <>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-0.5">
                      Selected
                    </p>
                    {selectedCodeEntries.map(({ code, label }) => (
                      <button
                        type="button"
                        key={`selected-${code}`}
                        onClick={() => toggleCode(code)}
                        className="w-full text-left text-sm px-2 py-1.5 rounded transition-colors bg-primary/10 text-primary font-medium"
                      >
                        <span className="font-mono text-xs mr-2">{code}</span>
                        {label}
                      </button>
                    ))}
                    <div className="border-b my-1.5" />
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-0.5">
                      All Codes
                    </p>
                  </>
                )}

                {/* Filtered code list */}
                {filteredCodes.length > 0 ? (
                  filteredCodes.map(({ code, label }) => (
                    <button
                      type="button"
                      key={code}
                      onClick={() => toggleCode(code)}
                      className={cn(
                        "w-full text-left text-sm px-2 py-1.5 rounded transition-colors",
                        selectedCodes.includes(code)
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="font-mono text-xs mr-2">{code}</span>
                      {label}
                    </button>
                  ))
                ) : !customCodeCandidate ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No matching codes
                  </p>
                ) : null}

                {/* Custom code option */}
                {customCodeCandidate && (
                  <button
                    type="button"
                    onClick={() => {
                      toggleCode(customCodeCandidate);
                      setCodeSearch("");
                    }}
                    className="w-full text-left text-sm px-2 py-1.5 rounded transition-colors hover:bg-muted flex items-center gap-2 border-t mt-1 pt-2"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      Add custom code:{" "}
                      <span className="font-mono font-medium">{customCodeCandidate}</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
            </div>
          </DialogBody>

          <DialogFooter className="shrink-0 px-6 py-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createRtmEnrollment.isPending ||
                !payerName.trim() ||
                !subscriberId.trim() ||
                selectedCodes.length === 0
              }
            >
              {createRtmEnrollment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enable RTM
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
