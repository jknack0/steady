"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useDailyTrackers,
  useDeleteDailyTracker,
} from "@/hooks/use-daily-trackers";
import { TrackerTemplatePicker } from "@/components/tracker-template-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  LayoutTemplate,
} from "lucide-react";
import Link from "next/link";

export function DailyTrackerSection({ programId }: { programId: string }) {
  const router = useRouter();
  const { data: trackers, isLoading } = useDailyTrackers(programId);
  const deleteTracker = useDeleteDailyTracker();
  const [open, setOpen] = useState(true);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const handleDelete = (trackerId: string) => {
    if (confirm("Delete this tracker and all its entries?")) {
      deleteTracker.mutate(trackerId);
    }
  };

  const handleTemplateCreated = (trackerId: string) => {
    setShowTemplatePicker(false);
    router.push(`/programs/${programId}/trackers/${trackerId}`);
  };

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-xl font-semibold"
          onClick={() => setOpen(!open)}
        >
          <ClipboardList className="h-5 w-5" />
          Daily Pulse
          {trackers && (
            <span className="text-sm font-normal text-muted-foreground">
              ({trackers.length})
            </span>
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {open && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
            >
              <LayoutTemplate className="mr-2 h-4 w-4" />
              Use Template
            </Button>
          </div>
        )}
      </div>

      {open && (
        <>
          {showTemplatePicker && (
            <div className="mb-4 rounded-lg border p-4">
              <TrackerTemplatePicker
                programId={programId}
                onCreated={handleTemplateCreated}
                onClose={() => setShowTemplatePicker(false)}
              />
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : trackers && trackers.length > 0 ? (
            <div className="rounded-lg border divide-y">
              {trackers.map((tracker) => (
                <div
                  key={tracker.id}
                  className="flex items-center justify-between p-3"
                >
                  <Link
                    href={`/programs/${programId}/trackers/${tracker.id}`}
                    className="flex-1 hover:bg-accent/50 rounded-md p-1 -m-1 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {tracker.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          tracker.isActive
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-100 text-gray-800 border-gray-200"
                        }
                      >
                        {tracker.isActive ? "active" : "inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{tracker.fields.length} fields</span>
                      {tracker._count && (
                        <span>{tracker._count.entries} entries</span>
                      )}
                      <span>Reminder: {tracker.reminderTime}</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDelete(tracker.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
              <ClipboardList className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3 text-sm">
                No daily pulse trackers yet
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTemplatePicker(true)}
              >
                <LayoutTemplate className="mr-2 h-4 w-4" />
                Create from Template
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
