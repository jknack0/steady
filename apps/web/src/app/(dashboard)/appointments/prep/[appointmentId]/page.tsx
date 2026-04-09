"use client";

import { useParams } from "next/navigation";
import { useSessionPrep } from "@/hooks/use-session-prep";
import { useUpdateAppointment } from "@/hooks/use-appointments";
import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "idle") return null;
  return (
    <span className="text-xs text-muted-foreground ml-2">
      {status === "saving" ? "Saving..." : "Saved"}
    </span>
  );
}

export default function SessionPrepPage() {
  const params = useParams();
  const appointmentId = params.appointmentId as string;
  const { data, isLoading, error } = useSessionPrep(appointmentId);
  const updateAppointment = useUpdateAppointment(appointmentId);

  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (data?.appointment?.internalNote && !initializedRef.current) {
      setNotes(data.appointment.internalNote);
      initializedRef.current = true;
    }
  }, [data?.appointment?.internalNote]);

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      setSaveStatus("saving");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateAppointment.mutate(
          { internalNote: value },
          {
            onSuccess: () => {
              setSaveStatus("saved");
              setTimeout(() => setSaveStatus("idle"), 2000);
            },
            onError: () => setSaveStatus("idle"),
          },
        );
      }, 2000);
    },
    [updateAppointment],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Unable to load session prep data.</p>
        <Link href="/appointments" className="text-primary underline mt-2 inline-block">
          Back to appointments
        </Link>
      </div>
    );
  }

  const { appointment, review, homeworkStatus, quickStats, lastSessionNotes, enrollment } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Session Prep</h1>
          <p className="text-muted-foreground">
            {appointment.participantName ?? "Unknown participant"} &middot;{" "}
            {new Date(appointment.startAt).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          {enrollment && (
            <p className="text-sm text-muted-foreground mt-1">
              Program: {enrollment.programTitle}
            </p>
          )}
        </div>
        <Link
          href="/appointments"
          className="text-sm text-primary hover:underline"
        >
          Back to Appointments
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Review Responses */}
        <div className="bg-card rounded-lg border p-5 space-y-4">
          <h2 className="font-semibold text-lg">Steady Work Review</h2>
          {review ? (
            <>
              <div className="space-y-3">
                {review.responses.map((r, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-muted-foreground">{r.question}</p>
                    <p className="mt-1">{r.answer || <span className="italic text-muted-foreground">No answer</span>}</p>
                  </div>
                ))}
              </div>
              {review.barriers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Barriers</p>
                  <div className="flex flex-wrap gap-2">
                    {review.barriers.map((b, i) => (
                      <span
                        key={i}
                        className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Submitted {new Date(review.submittedAt).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Not yet submitted
            </p>
          )}
        </div>

        {/* Center Panel: Homework Status */}
        <div className="bg-card rounded-lg border p-5 space-y-4">
          <h2 className="font-semibold text-lg">Homework Status</h2>
          {homeworkStatus.length > 0 ? (
            homeworkStatus.map((mod) => (
              <div key={mod.moduleId}>
                <p className="font-medium text-sm">{mod.moduleTitle}</p>
                {mod.items.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {mod.items.map((item) => (
                      <li key={item.partId} className="flex items-center gap-2 text-sm">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                            item.completed
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {item.completed ? "\u2713" : "\u2022"}
                        </span>
                        {item.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No homework items</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm italic">
              No homework data available
            </p>
          )}
        </div>

        {/* Right Panel: Stats + Notes */}
        <div className="bg-card rounded-lg border p-5 space-y-4">
          <h2 className="font-semibold text-lg">Quick Stats (last 30 days)</h2>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-muted/50 rounded p-2">
              <p className="text-2xl font-bold">{quickStats.taskCompletionRate}%</p>
              <p className="text-xs text-muted-foreground">Task completion</p>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <p className="text-2xl font-bold">
                {quickStats.tasksCompleted}/{quickStats.tasksTotal}
              </p>
              <p className="text-xs text-muted-foreground">Tasks done</p>
            </div>
            <div className="bg-muted/50 rounded p-2 col-span-2">
              <p className="text-2xl font-bold">{quickStats.journalEntries}</p>
              <p className="text-xs text-muted-foreground">Journal entries</p>
            </div>
          </div>

          {lastSessionNotes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Last Session Notes ({new Date(lastSessionNotes.date).toLocaleDateString()})
              </p>
              <p className="text-sm">
                {lastSessionNotes.notes || (
                  <span className="italic text-muted-foreground">No notes</span>
                )}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center">
              <label
                htmlFor="session-notes"
                className="text-sm font-medium text-muted-foreground"
              >
                Session Notes
              </label>
              <SaveIndicator status={saveStatus} />
            </div>
            <textarea
              id="session-notes"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Jot down notes for this session..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
