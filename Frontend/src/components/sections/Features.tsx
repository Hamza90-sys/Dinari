import { Lock, Zap, Receipt, HeartHandshake } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Secure payments",
    desc: "End-to-end encryption and PCI-compliant infrastructure protect every transaction.",
  },
  {
    icon: Zap,
    title: "Fast processing",
    desc: "Most subscriptions are activated within 15 minutes of payment confirmation.",
  },
  {
    icon: Receipt,
    title: "Transparent pricing",
    desc: "No hidden fees. See the exact TND amount before you confirm any payment.",
  },
  {
    icon: HeartHandshake,
    title: "Local support",
    desc: "Tunisian team available 7 days a week — in Arabic, French, or English.",
  },
];

export const Features = () => (
  <section className="bg-surface/50 py-24">
    <div className="container">
      <div className="grid items-end justify-between gap-6 md:flex">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Why Dinari</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl text-balance">
            Built for Tunisians, designed like a global fintech
          </h2>
        </div>
        <p className="max-w-md text-muted-foreground">
          Every detail — from pricing to support — is engineered to make international
          subscriptions feel local and effortless.
        </p>
      </div>

      <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative bg-card p-8 transition-colors hover:bg-primary-soft/40"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary transition-all group-hover:bg-gradient-primary group-hover:text-primary-foreground group-hover:shadow-glow">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
