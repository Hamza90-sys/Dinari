import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export const AlertBar = ({
  message,
  ctaLabel,
  ctaTo,
}: {
  message: string;
  ctaLabel?: string;
  ctaTo?: string;
}) => {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="flex items-center gap-3 border-b border-warning/20 bg-warning-soft px-4 py-2.5 text-sm text-warning-foreground sm:px-6">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <p className="flex-1 truncate">
        <span className="font-medium">Heads up — </span>
        {message}
      </p>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className="hidden whitespace-nowrap rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground hover:bg-foreground/10 sm:inline-block"
        >
          {ctaLabel} →
        </Link>
      )}
      <button
        onClick={() => setOpen(false)}
        className="rounded-md p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
