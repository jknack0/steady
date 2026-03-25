"use client";

import { WidgetShell } from "@/components/dashboard-widgets";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { User } from "lucide-react";

interface ClientDemographicsProps extends WidgetProps {
  clientId: string;
  clientData?: {
    name: string;
    enrolledAt: string;
    programTitle: string;
    status: string;
  };
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function ClientDemographicsWidget({
  clientData,
  isEditing,
  column,
  dragAttributes,
  dragListeners,
}: ClientDemographicsProps) {
  if (!clientData) {
    return (
      <WidgetShell title="Client Info" icon={User} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
        <p className="text-sm text-muted-foreground">No client data available</p>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Client Info" icon={User} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">{clientData.name}</p>
          <p className="text-xs text-muted-foreground">{clientData.programTitle}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Enrolled: {new Date(clientData.enrolledAt).toLocaleDateString()}</span>
          <span className="capitalize">{clientData.status.toLowerCase()}</span>
        </div>
      </div>
    </WidgetShell>
  );
}
