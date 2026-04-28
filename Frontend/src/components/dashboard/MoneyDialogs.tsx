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
import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { usePayments } from "@/hooks/use-payments";

const QUICK = [50, 100, 200, 500];

type Mode = "topup" | "withdraw";

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
  const { topUp, withdraw } = usePayments();
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"D17" | "Bank transfer" | "Card">("D17");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setMethod("D17");
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
        await topUp(numeric, method);
        toast.success(`Top-up of ${numeric} TND received`);
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

          {isTopUp && (
            <div className="space-y-2">
              <Label>Payment method</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["D17", "Bank transfer", "Card"] as const).map((m) => (
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

          <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">New balance</span>
            <span className="font-display text-base font-semibold">
              {(isTopUp ? balance + (numeric || 0) : balance - (numeric || 0)).toFixed(2)} TND
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={!valid || submitting}>
              {isTopUp ? "Confirm top-up" : "Confirm withdrawal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};