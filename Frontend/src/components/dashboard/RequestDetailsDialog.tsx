import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, type RequestStatus } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Check, Clock, FileText, ImageIcon, Copy, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DinariRequest } from "@/types/domain";
import { formatDate } from "@/lib/format";
import { useRequests } from "@/hooks/use-requests";
import { useAuth } from "@/hooks/use-auth";

export type RequestRecord = DinariRequest;

const steps = [
  { key: "created", label: "Request created", description: "We received your request." },
  { key: "payment", label: "Payment received", description: "Funds confirmed in TND." },
  { key: "processing", label: "Processing", description: "We're activating your subscription." },
  { key: "completed", label: "Completed", description: "Subscription is active." },
];

const reachedIndex = (status: RequestStatus) => {
  switch (status) {
    case "Awaiting Payment":
      return 0;
    case "Paid":
      return 1;
    case "Processing":
      return 2;
    case "Completed":
    case "Active":
      return 3;
    case "Failed":
      return 1;
    default:
      return 0;
  }
};

export const RequestDetailsDialog = ({
  request,
  open,
  onOpenChange,
  balance,
}: {
  request: DinariRequest | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  balance?: number;
}) => {
  const { payRequest, setRequestStatus } = useRequests();
  const { isAdmin } = useAuth();
  if (!request) return null;

  const reached = reachedIndex(request.status);

  const copyId = () => {
    navigator.clipboard.writeText(request.id);
    toast.success("Request ID copied");
  };

  const amount = request.amountTND ?? 50;
  const canPay = request.status === "Awaiting Payment" && (balance ?? 0) >= amount;

  const pay = async () => {
    try {
      await payRequest(request.id);
      toast.success("Payment confirmed - request is now paid");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    }
  };

  const markCompleted = async () => {
    await setRequestStatus(request.id, "Completed");
    toast.success("Request marked as completed");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-3xl p-0">
        <DialogHeader className="space-y-1 border-b border-border bg-muted/30 p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={copyId}
              className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-1 font-mono text-xs text-muted-foreground ring-1 ring-border hover:text-foreground"
            >
              {request.id}
              <Copy className="h-3 w-3" />
            </button>
            <StatusBadge status={request.status} />
          </div>
          <DialogTitle className="pt-2 font-display text-xl">{request.service}</DialogTitle>
          <DialogDescription>
            {request.plan} - Requested on {formatDate(request.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Account email" value={request.email} />
            <InfoRow label="Amount" value={`${amount.toFixed(2)} TND`} />
            {request.paymentMethod && <InfoRow label="Method" value={request.paymentMethod} />}
            {request.paymentDate && <InfoRow label="Paid on" value={formatDate(request.paymentDate)} />}
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status timeline
            </p>
            <ol className="relative space-y-4 pl-6">
              <span className="absolute left-[11px] top-2 h-[calc(100%-1rem)] w-px bg-border" aria-hidden />
              {steps.map((step, i) => {
                const done = i <= reached && request.status !== "Failed";
                const current = i === reached + 1 && request.status === "Processing";
                return (
                  <li key={step.key} className="relative">
                    <span
                      className={cn(
                        "absolute -left-6 grid h-5 w-5 place-items-center rounded-full ring-4 ring-background",
                        done
                          ? "bg-success text-success-foreground"
                          : current
                            ? "bg-info text-info-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    </span>
                    <p className={cn("text-sm font-medium", done ? "text-foreground" : "text-muted-foreground")}>{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment proof</p>
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-background text-muted-foreground ring-1 ring-border">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">receipt-{request.id.toLowerCase()}.png</p>
                <p className="text-xs text-muted-foreground">
                  {request.paymentDate ? `Uploaded by Dinari - ${formatDate(request.paymentDate)}` : "Awaiting payment confirmation"}
                </p>
              </div>
              <Button variant="outline" size="sm" className="rounded-full" disabled={!request.proofUrl}>
                View
              </Button>
            </div>
          </div>

          {(request.notes || request.adminNotes) && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
              <div className="space-y-2">
                {request.notes && (
                  <div className="flex gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <p>{request.notes}</p>
                  </div>
                )}
                {request.adminNotes && (
                  <div className="flex gap-3 rounded-2xl border border-border bg-info-soft p-4 text-sm text-foreground">
                    <FileText className="h-4 w-4 shrink-0 text-info" />
                    <p>{request.adminNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            {request.status === "Awaiting Payment" && (
              <Button variant="hero" size="sm" onClick={pay} disabled={!canPay}>
                <CreditCard className="h-4 w-4" />
                {canPay ? `Pay ${amount.toFixed(2)} TND` : "Top up to pay"}
              </Button>
            )}
            {isAdmin && request.status === "Processing" && (
              <Button variant="outline" size="sm" className="rounded-full" onClick={markCompleted}>
                <Check className="h-4 w-4" /> Mark as completed
              </Button>
            )}
            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-background/60 px-3 py-2">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="truncate text-sm font-medium text-foreground">{value}</p>
  </div>
);
