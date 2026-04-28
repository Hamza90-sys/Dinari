import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Tv, Music, Film, Apple, Bot, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";

const services = [
  { name: "ChatGPT", desc: "Plus, Team & Pro plans for AI productivity.", icon: Bot, accent: "from-emerald-500/20 to-emerald-500/5", price: "from 79 TND/mo" },
  { name: "Netflix", desc: "Basic, Standard & Premium streaming plans.", icon: Film, accent: "from-red-500/20 to-red-500/5", price: "from 39 TND/mo" },
  { name: "Spotify", desc: "Individual, Duo & Family music subscriptions.", icon: Music, accent: "from-green-500/20 to-green-500/5", price: "from 29 TND/mo" },
  { name: "Disney+", desc: "Full Disney+ catalog with Star content.", icon: Tv, accent: "from-blue-500/20 to-blue-500/5", price: "from 35 TND/mo" },
  { name: "Apple TV+", desc: "Apple Originals streaming on any device.", icon: Apple, accent: "from-zinc-500/20 to-zinc-500/5", price: "from 32 TND/mo" },
  { name: "Custom Request", desc: "Need something else? Tell us what to subscribe to.", icon: Plus, accent: "from-primary/20 to-primary/5", price: "Quote in 1h" },
];

const Services = () => {
  useEffect(() => {
    document.title = "Services — Dinari";
  }, []);

  return (
    <Layout>
      <section className="relative border-b border-border bg-surface/40">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="container relative py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs">
            <Sparkles className="h-3 w-3 text-primary" /> 30+ services supported
          </div>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-5xl font-bold tracking-tight sm:text-6xl text-balance">
            Every subscription you need, paid in TND
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-balance">
            Pick a service below and we’ll handle the rest — typically activated within 15 minutes.
          </p>
        </div>
      </section>

      <section className="container py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.name}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-gradient-card p-7 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft"
            >
              <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${s.accent} blur-2xl`} aria-hidden />
              <div className="relative flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary transition-all group-hover:bg-gradient-primary group-hover:text-primary-foreground group-hover:shadow-glow">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">{s.price}</span>
              </div>
              <h3 className="relative mt-5 font-display text-xl font-semibold">{s.name}</h3>
              <p className="relative mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              <Button variant="outline" className="relative mt-6 w-fit" asChild>
                <Link to={`/request?service=${encodeURIComponent(s.name)}`}>
                  Request Payment <ArrowRight />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Services;
