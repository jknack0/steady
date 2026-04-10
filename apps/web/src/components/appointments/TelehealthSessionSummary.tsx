"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTelehealthTranscript } from "@/hooks/use-telehealth-transcript";

interface Props {
  appointmentId: string;
}

export function TelehealthSessionSummary({ appointmentId }: Props) {
  const { data, isLoading, isError } = useTelehealthTranscript(appointmentId);

  // Nothing to show yet — no session, still loading on first open, or fetch errored
  if (isLoading) return null;
  if (isError) return null;
  if (!data) return null;

  // Session exists but summary hasn't been generated (e.g. no recording or still running)
  const inFlight =
    data.summaryStatus === "pending" || data.summaryStatus === "generating";
  const hasSummary = data.summaryStatus === "completed" && data.summary;
  const failed = data.summaryStatus === "failed";

  if (!inFlight && !hasSummary && !failed) return null;

  return (
    <details className="mx-6 mb-3 rounded-md border border-teal-200 bg-teal-50/50 text-sm [&[open]>summary>svg.chev]:rotate-90">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-teal-900 select-none list-none">
        <Sparkles className="h-4 w-4 text-teal-600 shrink-0" />
        <span className="font-medium">AI session summary</span>
        {inFlight && (
          <span className="ml-auto flex items-center gap-1 text-xs text-teal-700">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating…
          </span>
        )}
        {failed && (
          <span className="ml-auto text-xs text-red-700">Generation failed</span>
        )}
        {hasSummary && (
          <svg
            className="chev ml-auto h-3 w-3 transition-transform text-teal-700"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 2l4 4-4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </summary>

      {hasSummary && data.summary && (
        <div className="space-y-3 border-t border-teal-200 px-3 py-3 text-teal-950">
          {data.summary.overview && (
            <Section label="Overview">
              <p className="whitespace-pre-wrap leading-relaxed">{data.summary.overview}</p>
            </Section>
          )}

          {data.summary.progressNotes && (
            <Section label="Progress notes">
              <p className="whitespace-pre-wrap leading-relaxed">
                {data.summary.progressNotes}
              </p>
            </Section>
          )}

          {data.summary.keyThemes && data.summary.keyThemes.length > 0 && (
            <Section label="Key themes">
              <div className="flex flex-wrap gap-1">
                {data.summary.keyThemes.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex rounded-full border border-teal-300 bg-white px-2 py-0.5 text-xs text-teal-800"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {data.summary.actionItems && data.summary.actionItems.length > 0 && (
            <Section label="Action items">
              <ul className="list-disc space-y-0.5 pl-5">
                {data.summary.actionItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </Section>
          )}

          {data.summary.concerns && data.summary.concerns.length > 0 && (
            <Section label="Concerns">
              <ul className="list-disc space-y-0.5 pl-5">
                {data.summary.concerns.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </Section>
          )}

          {data.summary.mood && (data.summary.mood.affect || data.summary.mood.engagement) && (
            <Section label="Mood">
              <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5">
                {data.summary.mood.affect && (
                  <>
                    <dt className="text-teal-700">Affect:</dt>
                    <dd>{data.summary.mood.affect}</dd>
                  </>
                )}
                {data.summary.mood.engagement && (
                  <>
                    <dt className="text-teal-700">Engagement:</dt>
                    <dd>{data.summary.mood.engagement}</dd>
                  </>
                )}
              </dl>
            </Section>
          )}

          {data.summarizedAt && (
            <p className="text-xs text-teal-700">
              Generated {new Date(data.summarizedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {failed && (
        <div className="border-t border-teal-200 px-3 py-2 text-xs text-red-700">
          The clinical summary couldn't be generated. The raw transcript is still
          available.
        </div>
      )}
    </details>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
        {label}
      </div>
      {children}
    </div>
  );
}
