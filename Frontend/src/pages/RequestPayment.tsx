import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ShieldCheck, Clock, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRequests } from "@/hooks/use-requests";

const SERVICES = [
  { name: "ChatGPT", price: 79 },
  { name: "Netflix", price: 65 },
  { name: "Spotify", price: 49 },
  { name: "Disney+", price: 55 },
  { name: "Apple TV+", price: 45 },
  { name: "YouTube Premium", price: 39 },
  { name: "Adobe", price: 159 },
  { name: "Notion", price: 29 },
  { name: "Other", price: 50 },
];

const RequestPayment = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRequest } = useRequests();
  const [service, setService] = useState(params.get("service") || "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const price = useMemo(() => SERVICES.find((s) => s.name === service)?.price ?? 50, [service]);

  useEffect(() => {
    document.title = "Request a payment - Dinari";
  }, []);

  useEffect(() => {
    if (user && !email) setEmail(user.email ?? "");
  }, [user, email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first.");
      navigate("/login", { state: { from: "/request" } });
      return;
    }

    setLoading(true);
    try {
      const req = await createRequest({
        service,
        plan,
        email,
        notes: notes.trim() || undefined,
        amountTND: price,
      });
      toast.success(`Request ${req.id} created - awaiting payment`);
      navigate("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not create request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="relative border-b border-border bg-surface/40">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="container relative py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Average reply time: 12 minutes
          </div>
          <h1 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-5xl text-balance">
            Request your payment
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground text-balance">
            Tell us what you'd like to subscribe to and we'll send you a TND quote within the hour.
          </p>
        </div>
      </section>

      <section className="container py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-border bg-card p-8 shadow-soft sm:p-10">
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="service">Service</Label>
                  <Select value={service} onValueChange={setService} required>
                    <SelectTrigger id="service" className="h-12 rounded-xl">
                      <SelectValue placeholder="Choose a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES.map((s) => (
                        <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Account email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Plan type</Label>
                  <Input
                    id="plan"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="e.g. Premium / Family / Yearly"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything we should know?"
                    rows={4}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
                  <span>Estimated price</span>
                  <span className="font-display text-base font-semibold text-foreground">{price} TND</span>
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading || !service}>
                  {loading ? "Submitting..." : "Submit request"}
                </Button>

                {!user && (
                  <p className="text-center text-xs text-muted-foreground">
                    You'll be asked to sign in to complete this request.
                  </p>
                )}
              </form>
            </div>
          </div>

          <aside className="space-y-4">
            <SidePoint icon={ShieldCheck} title="Secure by design" desc="Your data is encrypted and never shared with third parties." />
            <SidePoint icon={Clock} title="Fast activation" desc="Most subscriptions are live within 15 minutes of payment." />
            <SidePoint icon={CheckCircle2} title="Money-back guarantee" desc="If we can't fulfill your request, you're refunded in full." />
          </aside>
        </div>
      </section>
    </Layout>
  );
};

const SidePoint = ({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
      <Icon className="h-5 w-5" />
    </span>
    <h3 className="mt-3 font-display text-base font-semibold">{title}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
  </div>
);

export default RequestPayment;