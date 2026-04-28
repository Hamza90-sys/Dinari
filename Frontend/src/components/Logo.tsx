import { Link } from "react-router-dom";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 group ${className}`}>
      <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary shadow-glow transition-transform group-hover:scale-105">
        <span className="font-display text-base font-bold text-primary-foreground">D</span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary-glow ring-2 ring-background" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        Dinari<span className="text-primary">.</span>
      </span>
    </Link>
  );
};
