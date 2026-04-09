"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { useRecurringSeries, type SeriesView } from "@/hooks/use-recurring-series";
import { usePauseSeries, useResumeSeries, useDeleteSeries } from "@/hooks/use-recurring-series";

const RULE_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function SeriesRow({ series, onMutate }: { series: SeriesView; onMutate: () => void }) {
  const pause = usePauseSeries(series.id);
  const resume = useResumeSeries(series.id);
  const del = useDeleteSeries(series.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const client = series.participant
    ? `${series.participant.firstName ?? ""} ${series.participant.lastName ?? ""}`.trim() || "(no name)"
    : "(no client)";

  return (
    <div className="border rounded-md p-3 space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-sm">{client}</span>
          <span className="text-xs text-muted-foreground ml-2">
            {RULE_LABELS[series.recurrenceRule] ?? series.recurrenceRule} on{" "}
            {DAY_LABELS[series.dayOfWeek]} {series.startTime}–{series.endTime}
          </span>
        </div>
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full ${
            series.isActive
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {series.isActive ? "Active" : "Paused"}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {series.serviceCode?.code} {series.serviceCode?.description} · {series.location?.name}
        {series.seriesEndDate && ` · Ends ${new Date(series.seriesEndDate).toLocaleDateString()}`}
      </div>
      <div className="flex gap-2 pt-1">
        {series.isActive ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pause.isPending}
            onClick={async () => {
              await pause.mutateAsync();
              onMutate();
            }}
          >
            {pause.isPending ? "Pausing..." : "Pause"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={resume.isPending}
            onClick={async () => {
              await resume.mutateAsync();
              onMutate();
            }}
          >
            {resume.isPending ? "Resuming..." : "Resume"}
          </Button>
        )}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-600">Delete series?</span>
            <Button
              variant="destructive"
              size="sm"
              disabled={del.isPending}
              onClick={async () => {
                await del.mutateAsync();
                setConfirmDelete(false);
                onMutate();
              }}
            >
              {del.isPending ? "Deleting..." : "Yes"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              No
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecurringSeriesPanel({ open, onOpenChange }: Props) {
  const { data: series = [], refetch } = useRecurringSeries();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Recurring series</DialogTitle>
        </DialogHeader>
        <DialogBody className="overflow-y-auto">
          {!series || series.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              No recurring series yet. Create one by toggling "Repeat" when scheduling an appointment.
            </div>
          ) : (
            <div className="space-y-2">
              {series.map((s) => (
                <SeriesRow key={s.id} series={s} onMutate={() => refetch()} />
              ))}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
