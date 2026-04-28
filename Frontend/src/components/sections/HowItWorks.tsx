import { MousePointerClick, Wallet, PartyPopper } from "lucide-react";

const steps = [
  {
    icon: MousePointerClick,
    title: "Choose a service",
    desc: "Browse our supported services and pick the plan you want to subscribe to.",
  },
  {
    icon: Wallet,
    title: "Pay in TND",
    desc: "Pay securely in Tunisian dinars using your local card or bank transfer.",
  },
  {
    icon: PartyPopper,
    title: "We handle the rest",
    desc: "Our team activates your subscription and sends credentials within minutes.",
  },
];

export const HowItWorks = () => (
  <section className="container py-24">
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">How it works</p>
      <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl text-balance">
        Subscribe in three simple steps
      </h2>
      <p className="mt-4 text-lg text-muted-foreground text-balance">
        From request to activation in less than 15 minutes — no foreign card required.
      </p>
    </div>

    <div className="relative mt-16 grid gap-6 md:grid-cols-3">
      <div className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" aria-hidden />
      {steps.map((s, i) => (
        <div
          key={s.title}
          className="group relative rounded-3xl border border-border bg-card p-8 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary ring-4 ring-background transition-colors group-hover:bg-gradient-primary group-hover:text-primary-foreground">
              <s.icon className="h-5 w-5" />
            </span>
            <span className="font-display text-sm font-semibold text-muted-foreground">
              0{i + 1}
            </span>
          </div>
          <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
        </div>
      ))}
    </div>
  </section>
);
