import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Loader2, XCircle, AlertCircle } from "lucide-react";

export type RequestStatus =
  | "Completed"
  | "Active"
  | "Processing"
  | "Paid"
  | "Awaiting Payment"
  | "Failed";

const config: Record<
  RequestStatus,
  { className: string; icon: React.ElementType; dot: string }
> = {
  Completed: {
    className: "bg-success-soft text-success ring-1 ring-inset ring-success/20",
    icon: CheckCircle2,
    dot: "bg-success",
  },
  Active: {
    className: "bg-success-soft text-success ring-1 ring-inset ring-success/20",
    icon: CheckCircle2,
    dot: "bg-success",
  },
  Processing: {
    className: "bg-info-soft text-info ring-1 ring-inset ring-info/20",
    icon: Loader2,
    dot: "bg-info",
  },
  Paid: {
    className: "bg-accent text-accent-foreground ring-1 ring-inset ring-primary/20",
    icon: CheckCircle2,
    dot: "bg-primary",
  },
  "Awaiting Payment": {
    className: "bg-warning-soft text-warning ring-1 ring-inset ring-warning/30",
    icon: Clock,
    dot: "bg-warning",
  },
  Failed: {
    className:
      "bg-destructive-soft text-destructive ring-1 ring-inset ring-destructive/20",
    icon: XCircle,
    dot: "bg-destructive",
  },
};

export const StatusBadge = ({
  status,
  withIcon = true,
  className,
}: {
  status: RequestStatus;
  withIcon?: boolean;
  className?: string;
}) => {
  const c = config[status] ?? {
    className: "bg-muted text-muted-foreground",
    icon: AlertCircle,
    dot: "bg-muted-foreground",
  };
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        c.className,
        className,
      )}
    >
      {withIcon ? (
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            status === "Processing" && "animate-spin",
          )}
        />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      )}
      {status}
    </span>
  );
};
