import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type AlertVariant = "error" | "warning" | "info" | "success";

interface AlertBannerProps {
  variant: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CONFIG: Record<
  AlertVariant,
  { border: string; bg: string; text: string; icon: typeof Info }
> = {
  error: {
    border: "border-red-300",
    bg: "bg-red-50",
    text: "text-red-900",
    icon: XCircle,
  },
  warning: {
    border: "border-yellow-300",
    bg: "bg-yellow-50",
    text: "text-yellow-900",
    icon: AlertTriangle,
  },
  info: {
    border: "border-blue-300",
    bg: "bg-blue-50",
    text: "text-blue-900",
    icon: Info,
  },
  success: {
    border: "border-green-300",
    bg: "bg-green-50",
    text: "text-green-900",
    icon: CheckCircle2,
  },
};

export function AlertBanner({ variant, children, className }: AlertBannerProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border p-3 text-sm",
        config.border,
        config.bg,
        config.text,
        className,
      )}
    >
      <div className="flex gap-2">
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <div>{children}</div>
      </div>
    </div>
  );
}
