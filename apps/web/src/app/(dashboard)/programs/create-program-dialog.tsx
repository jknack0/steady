"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateProgram } from "@/hooks/use-programs";
import {
  Dialog,
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
import { Loader2 } from "lucide-react";

interface CreateProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProgramDialog({
  open,
  onOpenChange,
}: CreateProgramDialogProps) {
  const router = useRouter();
  const createProgram = useCreateProgram();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cadence, setCadence] = useState("WEEKLY");
  const [sessionType, setSessionType] = useState("ONE_ON_ONE");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const program = await createProgram.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        cadence: cadence as any,
        sessionType: sessionType as any,
      });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setCadence("WEEKLY");
      setSessionType("ONE_ON_ONE");
      router.push(`/programs/${program.id}`);
    } catch {
      // Error is handled by React Query
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Program</DialogTitle>
            <DialogDescription>
              Set up a new clinical program for your participants
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., ADHD Executive Function Skills"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProgram.isPending || !title.trim()}>
              {createProgram.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Program
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
