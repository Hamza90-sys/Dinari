const logos = [
  "ChatGPT", "Netflix", "Spotify", "Disney+", "Apple TV", "YouTube Premium", "Adobe", "Notion",
];

export const TrustedBy = () => (
  <section className="border-y border-border bg-surface/60">
    <div className="container py-10">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Trusted services we support
      </p>
      <div className="mt-6 grid grid-cols-2 items-center gap-x-8 gap-y-6 sm:grid-cols-4 lg:grid-cols-8">
        {logos.map((l) => (
          <div
            key={l}
            className="text-center font-display text-base font-semibold text-muted-foreground/80 transition-colors hover:text-foreground"
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  </section>
);
