import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const CTA = () => (
  <section className="container pb-24">
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-card p-10 text-center shadow-soft sm:p-16">
      <div className="absolute -top-20 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="relative">
        <h2 className="mx-auto max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-5xl text-balance">
          Ready to subscribe to anything, from Tunisia?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-balance">
          Join thousands of Tunisians who pay in TND and unlock the world’s best digital services.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="hero" size="xl" asChild>
            <Link to="/request">
              Request a payment <ArrowRight className="ml-1" />
            </Link>
          </Button>
          <Button variant="outline" size="xl" asChild>
            <Link to="/services">Browse services</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);
