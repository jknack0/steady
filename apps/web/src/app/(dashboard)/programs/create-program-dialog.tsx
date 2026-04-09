"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateProgram,
  useTemplates,
  useCloneProgram,
  useCreateProgramForClient,
} from "@/hooks/use-programs";
import type { ProgramTemplate } from "@/hooks/use-programs";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Loader2, ArrowLeft, FilePlus, UserPlus } from "lucide-react";
import { ClientPicker } from "@/components/client-picker";

interface CreateProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a client — skips client picker and opens directly to the for-client form */
  preselectedClient?: { id: string; name: string } | null;
}

const categoryColors: Record<string, string> = {
  Depression: "bg-blue-100 text-blue-800 border-blue-200",
  "Skills Training": "bg-purple-100 text-purple-800 border-purple-200",
  OCD: "bg-amber-100 text-amber-800 border-amber-200",
  Trauma: "bg-red-100 text-red-800 border-red-200",
  PTSD: "bg-red-100 text-red-800 border-red-200",
  Insomnia: "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Substance Use": "bg-orange-100 text-orange-800 border-orange-200",
  Mindfulness: "bg-teal-100 text-teal-800 border-teal-200",
  Anger: "bg-rose-100 text-rose-800 border-rose-200",
  Parenting: "bg-green-100 text-green-800 border-green-200",
};

type View = "templates" | "blank" | "for-client";

export function CreateProgramDialog({
  open,
  onOpenChange,
  preselectedClient,
}: CreateProgramDialogProps) {
  const router = useRouter();
  const createProgram = useCreateProgram();
  const createForClient = useCreateProgramForClient();
  const cloneProgram = useCloneProgram();
  const { data: templates, isLoading: templatesLoading } = useTemplates();

  const initialView: View = preselectedClient ? "for-client" : "templates";
  const [view, setView] = useState<View>(initialView);
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Blank form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cadence, setCadence] = useState("WEEKLY");
  const [sessionType, setSessionType] = useState("ONE_ON_ONE");

  // For-client form state
  const [clientId, setClientId] = useState<string | null>(preselectedClient?.id ?? null);

  const reset = () => {
    setView(preselectedClient ? "for-client" : "templates");
    setCloningId(null);
    setTitle("");
    setDescription("");
    setCadence("WEEKLY");
    setSessionType("ONE_ON_ONE");
    setClientId(preselectedClient?.id ?? null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleUseTemplate = async (template: ProgramTemplate) => {
    setCloningId(template.id);
    try {
      const program = await cloneProgram.mutateAsync({ id: template.id });
      handleOpenChange(false);
      router.push(`/programs/${program.id}`);
    } catch {
      // Error handled by React Query
    } finally {
      setCloningId(null);
    }
  };

  const handleBlankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const program = await createProgram.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        cadence: cadence as any,
        sessionType: sessionType as any,
      });
      handleOpenChange(false);
      router.push(`/programs/${program.id}`);
    } catch {
      // Error handled by React Query
    }
  };

  const handleForClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId) return;

    try {
      const result = await createForClient.mutateAsync({
        title: title.trim(),
        clientId,
      });
      handleOpenChange(false);
      router.push(`/programs/${result.program.id}`);
    } catch {
      // Error handled by React Query
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>
            {view === "templates" ? "Create Program" : (
              preselectedClient && view === "for-client" ? (
                `Create Program for ${preselectedClient.name}`
              ) : (
                <button
                  type="button"
                  onClick={() => setView("templates")}
                  className="inline-flex items-center gap-1.5 hover:text-muted-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {view === "blank" ? "Start from Scratch" : "Create for Client"}
                </button>
              )
            )}
          </DialogTitle>
          <DialogDescription>
            {view === "templates"
              ? "Start from a proven template or create a blank program."
              : view === "blank"
                ? "Set up a new program from scratch."
                : preselectedClient
                  ? "Build a custom program from scratch for this client."
                  : "Build a custom program for a specific client."}
          </DialogDescription>
        </DialogHeader>

        {view === "templates" && (
          <DialogBody>
            <div className="grid gap-2">
              {/* Action cards */}
              <div className="grid grid-cols-2 gap-2">
                <Card
                  className="cursor-pointer transition-shadow hover:shadow-md border-dashed"
                  onClick={() => setView("blank")}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FilePlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">
                        Start from Scratch
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Build a new program template
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer transition-shadow hover:shadow-md border-dashed"
                  onClick={() => setView("for-client")}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">
                        Create for Client
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Build a custom program for a specific client
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Templates */}
              {templatesLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {templates?.map((template) => (
                <Card
                  key={template.id}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm truncate">
                          {template.title}
                        </h3>
                        {template.category && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${categoryColors[template.category] || "bg-gray-100 text-gray-800 border-gray-200"}`}
                          >
                            {template.category}
                          </Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {template.moduleCount} modules
                        </span>
                        {template.durationWeeks && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {template.durationWeeks} weeks
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUseTemplate(template)}
                      disabled={cloningId !== null}
                    >
                      {cloningId === template.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Use"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogBody>
        )}

        {view === "blank" && (
          <form onSubmit={handleBlankSubmit} className="flex flex-col flex-1 overflow-hidden">
            <DialogBody>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., ADHD Executive Function Skills"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the program..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Cadence</Label>
                    <Select value={cadence} onValueChange={setCadence}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                        <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Session Type</Label>
                    <Select value={sessionType} onValueChange={setSessionType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONE_ON_ONE">One-on-One</SelectItem>
                        <SelectItem value="GROUP">Group</SelectItem>
                        <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </DialogBody>

            <DialogFooter className="shrink-0 px-6 py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProgram.isPending || !title.trim()}
              >
                {createProgram.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Program
              </Button>
            </DialogFooter>
          </form>
        )}
        {view === "for-client" && (
          <form onSubmit={handleForClientSubmit} className="flex flex-col flex-1 overflow-hidden">
            <DialogBody>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="client-title">Program Title *</Label>
                  <Input
                    id="client-title"
                    placeholder="e.g. Anxiety Management Plan"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Client *</Label>
                  {preselectedClient ? (
                    <Input value={preselectedClient.name} disabled />
                  ) : (
                    <ClientPicker value={clientId} onChange={setClientId} />
                  )}
                </div>
              </div>
            </DialogBody>

            <DialogFooter className="shrink-0 px-6 py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createForClient.isPending || !title.trim() || !clientId}
              >
                {createForClient.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createForClient.isPending ? "Creating..." : "Create Program"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
