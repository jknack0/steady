"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useClinicianParticipant,
} from "@/hooks/use-clinician-participants";
import { Tabs } from "@/components/ui/tabs";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/loading-state";
import { OverviewTab } from "@/components/participant-detail/OverviewTab";
import { HomeworkTab } from "@/components/participant-detail/HomeworkTab";
import { TrackersTab } from "@/components/participant-detail/TrackersTab";
import { InsuranceTab } from "@/components/participant-detail/InsuranceTab";

type Tab = "overview" | "homework" | "trackers" | "insurance";

export default function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading, isError } = useClinicianParticipant(id);

  const participantName = data
    ? `${data.participant.firstName} ${data.participant.lastName}`.trim()
    : "";
  usePageTitle(participantName || "Client");

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-muted-foreground">Failed to load client data.</p>
      </div>
    );
  }

  const participant = data.participant;
  const name = `${participant.firstName} ${participant.lastName}`.trim();

  const tabLabels: Record<Tab, string> = { overview: "Overview", homework: "Homework", trackers: "Check-in", insurance: "Insurance" };

  return (
    <div>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm mb-4">
        <Link href="/participants" className="text-muted-foreground hover:text-foreground transition-colors">
          Clients
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-muted-foreground">{name}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="font-medium text-foreground">{tabLabels[tab]}</span>
      </nav>

      <PageHeader title={name} subtitle={participant.email} />

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "homework", label: "Homework" },
          { key: "trackers", label: "Check-in" },
          { key: "insurance", label: "Insurance" },
        ]}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
        className="mb-6"
      />

      {tab === "overview" ? (
        <OverviewTab data={data} participantId={id} />
      ) : tab === "homework" ? (
        <HomeworkTab participantId={id} participantProfileId={data.participantProfileId} />
      ) : tab === "trackers" ? (
        <TrackersTab participantProfileId={data.participantProfileId} participantUserId={data.participant.id} />
      ) : (
        <InsuranceTab participantProfileId={data.participantProfileId} demographics={data.demographics} />
      )}
    </div>
  );
}
