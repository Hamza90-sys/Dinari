import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaTo,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
}) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
    <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
    {ctaLabel && ctaTo && (
      <Button variant="hero" size="sm" asChild className="mt-5">
        <Link to={ctaTo}>{ctaLabel}</Link>
      </Button>
    )}
  </div>
);
