import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroImg from "@/assets/hero-fintech.png";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-glow" aria-hidden />
      <div className="absolute inset-0 grid-pattern opacity-60" aria-hidden />

      <div className="container relative pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur animate-fade-in">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary-soft">
                <Sparkles className="h-3 w-3 text-primary" />
              </span>
              Now serving 5,000+ subscriptions across Tunisia
            </div>

            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl animate-fade-in-up">
              Pay for international services{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-primary bg-clip-text text-transparent">
                  easily from Tunisia
                </span>
                <span className="absolute bottom-1 left-0 right-0 -z-0 h-3 bg-primary-soft/70" aria-hidden />
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-balance animate-fade-in-up [animation-delay:100ms]">
              We help you subscribe to ChatGPT, Netflix, Spotify, and more using
              Tunisian dinars — no foreign card, no headaches.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 animate-fade-in-up [animation-delay:200ms]">
              <Button variant="hero" size="xl" asChild>
                <Link to="/request">
                  Get Started <ArrowRight className="ml-1" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/services">Browse Services</Link>
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground animate-fade-in-up [animation-delay:300ms]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                Secured by bank-level encryption
              </div>
              <div className="hidden h-4 w-px bg-border sm:block" />
              <div className="hidden sm:block">⚡ Avg. 12 min processing</div>
            </div>
          </div>

          <div className="relative lg:col-span-5 animate-fade-in [animation-delay:200ms]">
            <div className="absolute -inset-10 -z-10 bg-gradient-radial-red blur-2xl" aria-hidden />
            <img
              src={heroImg}
              alt="International payments illustration"
              width={1024}
              height={1024}
              className="relative mx-auto w-full max-w-md animate-float"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
