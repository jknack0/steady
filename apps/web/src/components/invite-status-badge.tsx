import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type InviteStatus = "PENDING" | "EXPIRED" | "ACTIVE" | "ACCEPTED" | "REVOKED";

const STATUS_STYLES: Record<InviteStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  EXPIRED: "bg-red-100 text-red-800 border-red-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  ACCEPTED: "bg-green-100 text-green-800 border-green-200",
  REVOKED: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<InviteStatus, string> = {
  PENDING: "Pending",
  EXPIRED: "Expired",
  ACTIVE: "Active",
  ACCEPTED: "Accepted",
  REVOKED: "Revoked",
};

interface InviteStatusBadgeProps {
  status: InviteStatus;
  className?: string;
}

export function InviteStatusBadge({ status, className }: InviteStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs", STATUS_STYLES[status], className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
