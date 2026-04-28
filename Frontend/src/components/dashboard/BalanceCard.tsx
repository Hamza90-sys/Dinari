import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ArrowUpFromLine, Plus, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export const BalanceCard = ({
  balance = 0,
  onTopUp,
  onWithdraw,
  lastTopUp,
}: {
  balance?: number;
  onTopUp?: () => void;
  onWithdraw?: () => void;
  lastTopUp?: string;
}) => {
  const [hidden, setHidden] = useState(false);
  const formatted = balance.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm md:col-span-2">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-60 blur-3xl"
        style={{ background: "var(--gradient-balance)" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-balance-soft opacity-50" aria-hidden />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Available Balance
            </p>
            <button
              onClick={() => setHidden((h) => !h)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={hidden ? "Show balance" : "Hide balance"}
            >
              {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {hidden ? "••••••" : formatted}
            <span className="ml-2 text-lg font-medium text-muted-foreground">TND</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lastTopUp ? `Last top-up: ${lastTopUp}` : "No top-ups yet — add funds to get started"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="hero" size="sm" asChild>
            <Link to="/request">
              <Plus className="h-4 w-4" /> Request Payment
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={onTopUp}>
            <ArrowDownToLine className="h-4 w-4" /> Top up
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground hover:text-foreground"
            onClick={onWithdraw}
            disabled={balance <= 0}
          >
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </Button>
        </div>
      </div>
    </div>
  );
};
