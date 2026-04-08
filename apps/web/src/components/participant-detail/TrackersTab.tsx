"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useParticipantCheckin } from "@/hooks/use-daily-trackers";
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
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/loading-state";
import { TrackerDataView } from "@/components/tracker-data-view";
import { EditCheckinModal } from "@/components/edit-checkin-modal";
import {
  Loader2,
  Activity,
  ClipboardList,
  Settings2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

type TrackerDialogMode = "pick" | "review" | "custom";

interface TemplateData {
  key: string;
  name: string;
  description: string;
  fields: Array<{ label: string; fieldType: string }>;
}

const ALL_FIELD_TYPES = [
  { value: "SCALE", label: "Scale (1-10)" },
  { value: "NUMBER", label: "Number" },
  { value: "YES_NO", label: "Yes / No" },
  { value: "MULTI_CHECK", label: "Multi-Check" },
  { value: "FREE_TEXT", label: "Free Text" },
  { value: "TIME", label: "Time" },
];

function TrackerFieldEditor({
  generated,
  setGenerated,
  isCustom,
}: {
  generated: { name: string; description: string; fields: any[] };
  setGenerated: (g: { name: string; description: string; fields: any[] }) => void;
  isCustom: boolean;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("SCALE");

  const addField = () => {
    if (!newLabel.trim()) return;
    const field: any = {
      label: newLabel.trim(),
      fieldType: newType,
      options: null,
      sortOrder: generated.fields.length,
      isRequired: true,
    };
    if (newType === "SCALE") {
      field.options = { min: 1, max: 10, minLabel: "Low", maxLabel: "High" };
    }
    if (newType === "MULTI_CHECK") {
      field.options = { choices: ["Option 1", "Option 2"] };
    }
    setGenerated({ ...generated, fields: [...generated.fields, field] });
    setNewLabel("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tracker Name</Label>
        <Input
          value={generated.name}
          onChange={(e) => setGenerated({ ...generated, name: e.target.value })}
          placeholder="e.g., Daily Mood & Symptom Log"
          autoFocus={isCustom}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input
          value={generated.description}
          onChange={(e) => setGenerated({ ...generated, description: e.target.value })}
          placeholder="Brief description shown to participant"
        />
      </div>

      {/* Fields */}
      <div className="space-y-1.5">
        <Label>Fields ({generated.fields.length})</Label>
        <div className="space-y-2">
          {generated.fields.map((field, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border p-2.5">
              <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{i + 1}</span>
              <Input
                value={field.label}
                onChange={(e) => {
                  const fields = [...generated.fields];
                  fields[i] = { ...fields[i], label: e.target.value };
                  setGenerated({ ...generated, fields });
                }}
                className="flex-1 h-8 text-sm"
              />
              <select
                value={field.fieldType}
                onChange={(e) => {
                  const fields = [...generated.fields];
                  const ft = e.target.value;
                  let options = null;
                  if (ft === "SCALE") options = { min: 1, max: 10, minLabel: "Low", maxLabel: "High" };
                  if (ft === "MULTI_CHECK") options = field.options?.choices ? field.options : { choices: ["Option 1"] };
                  fields[i] = { ...fields[i], fieldType: ft, options };
                  setGenerated({ ...generated, fields });
                }}
                className="h-8 rounded-md border bg-background px-2 text-xs shrink-0"
              >
                {ALL_FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
              <button
                onClick={() => setGenerated({
                  ...generated,
                  fields: generated.fields.filter((_, j) => j !== i).map((f, j) => ({ ...f, sortOrder: j })),
                })}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add field row */}
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Field label..."
            className="flex-1 h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") addField(); }}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-xs shrink-0"
          >
            {ALL_FIELD_TYPES.map((ft) => (
              <option key={ft.value} value={ft.value}>{ft.label}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={addField} disabled={!newLabel.trim()} className="h-8 px-3">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface TrackersTabProps {
  participantProfileId: string;
  participantUserId: string;
}

export function TrackersTab({ participantProfileId, participantUserId }: TrackersTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<TrackerDialogMode>("pick");
  const [aiInput, setAiInput] = useState("");
  const [editFieldsOpen, setEditFieldsOpen] = useState(false);
  const [generated, setGenerated] = useState<{ name: string; description: string; fields: any[] } | null>(null);

  const { data: checkin, isLoading } = useParticipantCheckin(participantUserId);

  const { data: templates } = useQuery<TemplateData[]>({
    queryKey: ["tracker-templates"],
    queryFn: () => api.get("/api/daily-trackers/templates"),
    enabled: dialogOpen,
  });

  const createCustom = useMutation({
    mutationFn: (data: { name: string; description: string; fields: any[] }) =>
      api.post("/api/daily-trackers", { ...data, participantId: participantProfileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participant-checkin", participantUserId] });
      closeDialog();
    },
  });

  const generateTracker = useMutation({
    mutationFn: (description: string) =>
      api.post<{ name: string; description: string; fields: any[] }>("/api/ai/generate-tracker", { description }),
    onSuccess: (data) => {
      setGenerated(data);
      setDialogMode("review");
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setTimeout(() => {
      setDialogMode("pick");
      setAiInput("");
      setGenerated(null);
      generateTracker.reset();
    }, 200);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Check-in</h3>
          <p className="text-sm text-muted-foreground">
            Daily check-in tracker for this client.
          </p>
        </div>
        {checkin && (
          <Button size="sm" variant="outline" onClick={() => setEditFieldsOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Edit Fields
          </Button>
        )}
      </div>

      {!checkin ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No check-in set up for this client</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Use Template
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setGenerated({ name: "", description: "", fields: [] });
                setDialogMode("custom");
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Start Blank
            </Button>
          </div>
        </div>
      ) : (
        <TrackerDataView
          trackerId={checkin.id}
          trackerName={checkin.name}
          userId={participantUserId}
          fields={checkin.fields}
          onBack={() => {}}
        />
      )}

      {/* Edit Fields Modal */}
      {checkin && (
        <EditCheckinModal
          open={editFieldsOpen}
          onOpenChange={setEditFieldsOpen}
          trackerId={checkin.id}
          participantId={participantProfileId}
          fields={checkin.fields}
        />
      )}

      {/* Add Check-in Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent size="md">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>
              {dialogMode === "review" ? "Review Check-in" : dialogMode === "custom" ? "Build Check-in" : "Set Up Check-in"}
            </DialogTitle>
            {dialogMode === "pick" && (
              <DialogDescription>
                Generate with AI, pick a template, or build from scratch.
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogBody>
            {dialogMode === "pick" && (
              <div className="space-y-4">
                {/* AI Generate */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <h4 className="text-sm font-semibold">Generate with AI</h4>
                  </div>
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="e.g., Track ADHD medication side effects — monitor sleep quality, appetite, mood, focus level, and any headaches or stomach issues"
                    className="w-full rounded-md border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
                  />
                  <Button
                    onClick={() => generateTracker.mutate(aiInput.trim())}
                    disabled={generateTracker.isPending || !aiInput.trim()}
                    className="w-full"
                    size="sm"
                  >
                    {generateTracker.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" />Generate Tracker</>
                    )}
                  </Button>
                  {generateTracker.isError && (
                    <p className="text-xs text-destructive">Failed to generate. Try again.</p>
                  )}
                </div>

                {/* Separator */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or pick a template</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Templates */}
                <div className="space-y-2">
                  {templates?.map((template) => (
                    <button
                      key={template.key}
                      onClick={() => {
                        setGenerated({
                          name: template.name,
                          description: template.description,
                          fields: template.fields.map((f, i) => ({
                            label: f.label,
                            fieldType: f.fieldType,
                            options: (f as any).options || null,
                            sortOrder: i,
                            isRequired: true,
                          })),
                        });
                        setDialogMode("review");
                      }}
                      className="w-full text-left rounded-lg border p-3 hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-teal shrink-0" />
                        <span className="text-sm font-semibold">{template.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">{template.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2 ml-6">
                        {template.fields.map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {f.label}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                  {!templates && (
                    <div className="py-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  )}

                  {/* Build custom */}
                  <button
                    onClick={() => {
                      setGenerated({ name: "", description: "", fields: [] });
                      setDialogMode("custom");
                    }}
                    className="w-full text-left rounded-lg border border-dashed p-3 hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold">Build Custom Tracker</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      Create a tracker from scratch with your own fields
                    </p>
                  </button>
                </div>
              </div>
            )}

            {(dialogMode === "review" || dialogMode === "custom") && generated && (
              <TrackerFieldEditor
                generated={generated}
                setGenerated={setGenerated}
                isCustom={dialogMode === "custom"}
              />
            )}
          </DialogBody>

          {/* Footer */}
          {(dialogMode === "review" || dialogMode === "custom") && generated && (
            <DialogFooter className="shrink-0 px-6 py-4 border-t justify-between">
              <Button variant="ghost" size="sm" onClick={() => setDialogMode("pick")}>
                Back
              </Button>
              <Button
                onClick={() => createCustom.mutate(generated)}
                disabled={createCustom.isPending || !generated.name.trim() || generated.fields.length === 0}
              >
                {createCustom.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                ) : (
                  "Create Check-in"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
