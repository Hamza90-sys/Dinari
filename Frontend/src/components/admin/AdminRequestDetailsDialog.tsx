import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { DinariRequest } from "@/types/domain";
import { Check, Clock, ImagePlus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { useRequests } from "@/hooks/use-requests";
import { paymentsService } from "@/services/payments.service";

const steps = ["Request Created", "Payment Received", "Processing", "Completed"] as const;

function timelineIndex(status: DinariRequest["status"]) {
  if (status === "Awaiting Payment") return 0;
  if (status === "Paid") return 1;
  if (status === "Processing") return 2;
  if (status === "Completed" || status === "Active") return 3;
  return 1;
}

export function AdminRequestDetailsDialog({
  request,
  open,
  onOpenChange,
}: {
  request: DinariRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { setAdminNotes, setRequestProof } = useRequests();
  const [notes, setNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const statusStep = request ? timelineIndex(request.status) : 0;
  const amount = request?.amountTND ?? 0;

  useEffect(() => {
    setNotes(request?.adminNotes ?? "");
  }, [request?.id, request?.adminNotes]);

  useEffect(() => {
    let mounted = true;
    const loadProof = async () => {
      if (!request?.proofUrl) {
        setPreviewUrl(null);
        return;
      }
      try {
        const url = await paymentsService.createProofPreviewUrl(request.proofUrl);
        if (mounted) setPreviewUrl(url);
      } catch {
        if (mounted) setPreviewUrl(null);
      }
    };
    loadProof();
    return () => {
      mounted = false;
    };
  }, [request?.proofUrl]);

  if (!request) return null;

  const onSaveNotes = async () => {
    await setAdminNotes(request.id, notes);
    toast.success("Admin notes saved");
  };

  const onUploadProof = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await setRequestProof(request.id, file);
      toast.success("Proof uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>Request {request.id}</DialogTitle>
            <StatusBadge status={request.status} />
          </div>
          <DialogDescription>
            Internal request details and processing timeline
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Basic Information</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">User email:</span> {request.ownerEmail}</p>
              <p><span className="text-muted-foreground">Service:</span> {request.service}</p>
              <p><span className="text-muted-foreground">Plan:</span> {request.plan}</p>
              <p><span className="text-muted-foreground">Account email:</span> {request.email}</p>
              <p><span className="text-muted-foreground">Notes:</span> {request.notes || "-"}</p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Payment Information</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Amount:</span> {amount.toFixed(2)} TND</p>
              <p><span className="text-muted-foreground">Method:</span> {request.paymentMethod || "-"}</p>
              <p><span className="text-muted-foreground">Payment date:</span> {request.paymentDate ? formatDate(request.paymentDate) : "-"}</p>
              <p><span className="text-muted-foreground">Created:</span> {formatDate(request.createdAt)}</p>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
          <ol className="space-y-3">
            {steps.map((step, idx) => {
              const done = idx <= statusStep && request.status !== "Failed";
              return (
                <li key={step} className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full ${done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                    {done ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  </span>
                  <p className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>{step}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Admin Notes</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes for operations team"
              rows={5}
            />
            <Button className="mt-3" size="sm" variant="outline" onClick={onSaveNotes}>
              <Save className="h-4 w-4" /> Save notes
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Proof Upload</h3>
            <Label htmlFor="proof">Upload receipt image</Label>
            <Input id="proof" type="file" accept="image/*" className="mt-2" onChange={onUploadProof} />
            <div className="mt-3 rounded-lg border border-dashed border-border p-3">
              {previewUrl ? (
                <img src={previewUrl} alt="Proof" className="max-h-40 rounded-md object-contain" />
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImagePlus className="h-4 w-4" /> No proof uploaded yet
                </div>
              )}
            </div>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}