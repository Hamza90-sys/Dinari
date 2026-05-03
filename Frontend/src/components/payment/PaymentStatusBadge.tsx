import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/types/domain";
import { CheckCircle2, AlertCircle, Clock, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => {
  const config = {
    Completed: {
      label: "Paid",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    Failed: {
      label: "Failed",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    Pending: {
      label: "Pending",
      bgColor: "bg-amber-100",
      textColor: "text-amber-800",
      icon: <Clock className="h-3 w-3" />,
    },
  };

  const { label, bgColor, textColor, icon } = config[status] || config.Pending;

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        bgColor,
        textColor
      )}
    >
      {icon}
      {label}
    </Badge>
  );
};

export const PaymentSessionStatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; bgColor: string; textColor: string; icon: React.ReactNode }> = {
    pending: {
      label: "Pending",
      bgColor: "bg-amber-100",
      textColor: "text-amber-800",
      icon: <Clock className="h-3 w-3" />,
    },
    active: {
      label: "Active",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      icon: <CreditCard className="h-3 w-3" />,
    },
    completed: {
      label: "Completed",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    cancelled: {
      label: "Cancelled",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    expired: {
      label: "Expired",
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };

  const { label, bgColor, textColor, icon } = config[status] || config.pending;

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        bgColor,
        textColor
      )}
    >
      {icon}
      {label}
    </Badge>
  );
};
