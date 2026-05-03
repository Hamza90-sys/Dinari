import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { usePayments } from "@/hooks/use-payments";
import { useWallet } from "@/hooks/use-wallet";
import { walletService } from "@/services/wallet.service";
import { useAuth } from "@/hooks/use-auth";

const QUICK = [50, 100, 200, 500];

const PAYMENT_INSTRUCTIONS = {
  D17: {
    title: "Send payment to",
    details: ["D17 Number: XX XXX XXX", "Name: Dinari Payments"],
    note: "Send the exact amount shown above.",
  },
  "Bank Transfer": {
    title: "Bank transfer details",
    details: ["Bank: Bank Name", "RIB/IBAN: TN00 0000 0000 0000 0000 0000", "Account holder: Dinari Payments"],
    note: "Please include the exact amount and keep your receipt.",
  },
  Flouci: {
    title: "Send payment to",
    details: ["Flouci ID: XX XXX XXX", "Name: Dinari Payments"],
    note: "Send the exact amount shown above.",
  },
} as const;

type Mode = "topup" | "withdraw";
type TopUpStep = "details" | "proof";
const ALLOWED_PROOF_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_PROOF_SIZE_BYTES = 10 * 1024 * 1024;

export const MoneyDialog = ({
  mode,
  email,
  balance,
  open,
  onOpenChange,
}: {
  mode: Mode;
  email: string;
  balance: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const { withdraw } = usePayments();
  const { createPaymentRequest } = useWallet();
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"D17" | "Bank Transfer" | "Flouci">("D17");
  const [step, setStep] = useState<TopUpStep>("details");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setMethod("D17");
      setStep("details");
      setProofFile(null);
      setTransactionReference("");
      setNote("");
    }
  }, [open, mode]);

  const isTopUp = mode === "topup";
  const numeric = parseFloat(amount);
  const valid = !Number.isNaN(numeric) && numeric > 0 && (isTopUp || numeric <= balance);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setSubmitting(true);
    try {
      if (isTopUp) {
        if (!user) {
          toast.error("Please sign in first.");
          return;
        }
        if (!proofFile) {
          toast.error("Please upload your payment proof.");
          return;
        }
        if (!ALLOWED_PROOF_TYPES.has(proofFile.type)) {
          toast.error("Proof must be JPG, PNG, or PDF.");
          return;
        }
        if (proofFile.size > MAX_PROOF_SIZE_BYTES) {
          toast.error("Proof file must be 10 MB or smaller.");
          return;
        }

        const proofPath = await walletService.uploadTopUpProof(proofFile, user.id);
        await createPaymentRequest({
          amount: numeric,
          method,
          transactionReference: transactionReference.trim() || undefined,
          screenshotUrl: proofPath,
          note: note.trim() || undefined,
        });
        toast.success("Your payment is awaiting manual verification.");
      } else {
        await withdraw(numeric);
        toast.success(`Withdrew ${numeric} TND`);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              {isTopUp ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
            </span>
            <div>
              <DialogTitle className="font-display text-xl">
                {isTopUp ? "Top up your balance" : "Withdraw funds"}
              </DialogTitle>
              <DialogDescription>
                {isTopUp
                  ? "Add TND to your Dinari balance to pay for requests instantly."
                  : `Available: ${balance.toFixed(2)} TND`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (TND)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-12 rounded-xl text-lg font-semibold"
              autoFocus
              required
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  +{q} TND
                </button>
              ))}
            </div>
            {!isTopUp && numeric > balance && (
              <p className="text-xs text-destructive">Amount exceeds available balance.</p>
            )}
          </div>

          {isTopUp && step === "details" && (
            <div className="space-y-2">
              <Label>Payment method</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["D17", "Bank Transfer", "Flouci"] as const).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                      method === m
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isTopUp && step === "details" && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {PAYMENT_INSTRUCTIONS[method].title}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                {PAYMENT_INSTRUCTIONS[method].details.map((line) => (
                  <li key={line}>{line}</li>
                ))}
                <li className="font-semibold">Exact amount: {(numeric || 0).toFixed(2)} TND</li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">{PAYMENT_INSTRUCTIONS[method].note}</p>
            </div>
          )}

          {isTopUp && step === "proof" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proof">Upload payment proof</Label>
                <Input
                  id="proof"
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">Accepted formats: JPG, PNG, PDF up to 10 MB.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Transaction reference</Label>
                <Input
                  id="reference"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="e.g. D17-839201"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add anything that helps us verify the payment"
                  rows={3}
                />
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                Your balance updates only after manual approval.
              </div>
            </div>
          )}

          {!isTopUp && (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">New balance</span>
              <span className="font-display text-base font-semibold">
                {(balance - (numeric || 0)).toFixed(2)} TND
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isTopUp ? (
              step === "details" ? (
                <Button
                  type="button"
                  variant="hero"
                  disabled={!valid}
                  onClick={() => setStep("proof")}
                >
                  I have sent the payment
                </Button>
              ) : (
                <Button type="submit" variant="hero" disabled={!valid || submitting}>
                  Submit for verification
                </Button>
              )
            ) : (
              <Button type="submit" variant="hero" disabled={!valid || submitting}>
                Confirm withdrawal
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
