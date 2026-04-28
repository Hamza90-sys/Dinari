import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Yassine B.",
    role: "Software Engineer · Tunis",
    quote:
      "I was struggling to pay for ChatGPT Plus for months. Dinari activated my subscription in less than 10 minutes. Game changer.",
  },
  {
    name: "Sarra M.",
    role: "Designer · Sfax",
    quote:
      "Finally a Tunisian service that feels global. Clean app, instant Spotify Family, fair price. I recommend it to everyone.",
  },
  {
    name: "Mehdi K.",
    role: "Founder · Sousse",
    quote:
      "We use Dinari for our whole team’s tools. Notion, Adobe, ChatGPT. Invoices in TND, zero friction.",
  },
];

export const Testimonials = () => (
  <section className="container py-24">
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Loved locally</p>
      <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl text-balance">
        Trusted by thousands of Tunisians
      </h2>
    </div>

    <div className="mt-14 grid gap-6 md:grid-cols-3">
      {testimonials.map((t) => (
        <figure
          key={t.name}
          className="flex flex-col rounded-3xl border border-border bg-gradient-card p-8 shadow-xs transition-all hover:-translate-y-1 hover:shadow-soft"
        >
          <div className="flex gap-0.5 text-primary">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-foreground">
            “{t.quote}”
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft font-display text-sm font-semibold text-primary">
              {t.name[0]}
            </span>
            <div>
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
);
