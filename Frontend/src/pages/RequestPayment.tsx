import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useRequests } from "@/hooks/use-requests";
import { services as SERVICE_CATALOG, type ServicePlan } from "@/data/services";
import { BadgeCheck, CheckCircle2, CreditCard, Eye, EyeOff, Headphones, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const RequestPayment = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRequest } = useRequests();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [planId, setPlanId] = useState("");
  const [accountType, setAccountType] = useState<"existing" | "new">("existing");
  const [accountEmail, setAccountEmail] = useState(user?.email ?? "");
  const [accountPassword, setAccountPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [customServiceName, setCustomServiceName] = useState("");
  const [customServiceLink, setCustomServiceLink] = useState("");
  const [notes, setNotes] = useState("");
  const [countryCode, setCountryCode] = useState("+216");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState<
    "Phone Call" | "WhatsApp" | "SMS"
  >("WhatsApp");
  const [loading, setLoading] = useState(false);

  const selectedService = useMemo(
    () => SERVICE_CATALOG.find((s) => s.id === selectedServiceId) ?? null,
    [selectedServiceId],
  );

  const selectedPlan = useMemo(
    () => selectedService?.plans.find((p) => p.id === planId) ?? null,
    [selectedService, planId],
  );

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(SERVICE_CATALOG.map((s) => s.category)))],
    [],
  );

  const filteredServices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return SERVICE_CATALOG.filter((serviceItem) => {
      const matchesCategory = activeCategory === "All" || serviceItem.category === activeCategory;
      if (!query) return matchesCategory;
      const matchesQuery =
        serviceItem.name.toLowerCase().includes(query) ||
        serviceItem.category.toLowerCase().includes(query) ||
        serviceItem.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchTerm]);

  const price = selectedPlan?.priceTND ?? selectedService?.priceFrom ?? 50;
  const priceLabel = selectedPlan?.billingCycle === "yearly"
    ? "per year"
    : selectedPlan?.billingCycle === "one-time"
      ? "one-time"
      : "per month";

  useEffect(() => {
    document.title = "Request a payment - Dinari";
  }, []);

  useEffect(() => {
    if (user && !accountEmail) setAccountEmail(user.email ?? "");
  }, [user, accountEmail]);

  useEffect(() => {
    const requestedService = params.get("service");
    if (!requestedService) return;
    const matched = SERVICE_CATALOG.find((s) => s.name.toLowerCase() === requestedService.toLowerCase());
    if (matched) setSelectedServiceId(matched.id);
  }, [params]);

  useEffect(() => {
    if (!selectedService) return;
    if (!selectedService.plans.find((p) => p.id === planId)) {
      setPlanId(selectedService.plans[0]?.id ?? "");
    }
    if (!selectedService.supportsExistingAccount) {
      setAccountType("new");
    } else if (!selectedService.supportsNewAccount) {
      setAccountType("existing");
    }
  }, [selectedService, planId]);

  useEffect(() => {
    if (accountType === "new") {
      setAccountPassword("");
    }
  }, [accountType]);

  useEffect(() => {
    if (selectedService?.id !== "custom-request") {
      setCustomServiceName("");
      setCustomServiceLink("");
    }
  }, [selectedService?.id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📤 [RequestPayment] Form submitted");

    if (!user) {
      console.log("⚠️ [RequestPayment] User not authenticated, redirecting to login");
      toast.error("Please sign in first.");
      navigate("/login", { state: { from: "/request" } });
      return;
    }

    if (!selectedService || !selectedPlan) {
      toast.error("Please select a service and plan first.");
      return;
    }

    if (selectedService.id === "custom-request" && !customServiceName.trim()) {
      toast.error("Please add a custom service name.");
      return;
    }

    if (accountType === "existing" && !accountEmail.trim()) {
      toast.error("Please enter the existing account email.");
      return;
    }

    if (accountType === "existing" && !accountPassword.trim()) {
      toast.error("Please enter the account password for activation.");
      return;
    }

    const phoneDigits = phoneNumber.replace(/\D/g, "");
    if (!/^\d{8}$/.test(phoneDigits)) {
      toast.error("Please enter a valid Tunisian phone number.");
      return;
    }

    const planCycleLabel = selectedPlan.billingCycle === "yearly"
      ? "Yearly"
      : selectedPlan.billingCycle === "one-time"
        ? "One-time"
        : "Monthly";
    const isCustomRequest = selectedService.id === "custom-request";
    const resolvedServiceName = isCustomRequest
      ? (customServiceName.trim() || "Custom Request")
      : selectedService.name;
    const resolvedAccountEmail = accountType === "existing"
      ? accountEmail
      : (user.email ?? accountEmail);
    const resolvedPhone = `${countryCode}${phoneDigits}`;
    const extraNotes = [
      notes.trim(),
      isCustomRequest && customServiceLink.trim() ? `Service link: ${customServiceLink.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    console.log("👤 [RequestPayment] User authenticated:", user.id);
    console.log("📋 [RequestPayment] Request data:", {
      service: resolvedServiceName,
      plan: `${selectedPlan.label} (${planCycleLabel})`,
      email: resolvedAccountEmail,
      price,
      notes: extraNotes ? "provided" : "none",
    });

    setLoading(true);
    const startTime = Date.now();

    try {
      console.log("⏳ [RequestPayment] Calling createRequest...");
      const req = await createRequest({
        service: resolvedServiceName,
        plan: `${selectedPlan.label} (${planCycleLabel})`,
        email: resolvedAccountEmail,
        accountAccessType: accountType,
        accountPassword: accountType === "existing" ? accountPassword : undefined,
        notes: extraNotes || undefined,
        amountTND: price,
        phoneNumber: resolvedPhone,
        preferredContactMethod,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [RequestPayment] Request created successfully (${duration}ms):`, {
        id: req.id,
        dbId: req.dbId,
        status: req.status,
      });

      toast.success(`Request ${req.id} created - awaiting payment`);
      console.log("🎯 [RequestPayment] Navigating to dashboard");
      navigate("/dashboard");
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      console.error(`❌ [RequestPayment] Request creation failed (${duration}ms):`, err);

      const errorMessage = err instanceof Error ? err.message : "Could not create request.";
      console.error("📍 [RequestPayment] Error details:", {
        message: errorMessage,
        type: err instanceof Error ? err.constructor.name : typeof err,
      });

      toast.error(errorMessage);
    } finally {
      setLoading(false);
      console.log("✔️ [RequestPayment] Loading state reset");
    }
  };

  const SelectedIcon = selectedService?.icon ?? Sparkles;

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
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-8">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Service catalog</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">Pick your subscription</h2>
                </div>
                <Badge variant="secondary" className="self-start">5,000+ activations</Badge>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search services or categories"
                      className="h-11 rounded-2xl"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Button
                        key={category}
                        type="button"
                        size="sm"
                        variant={activeCategory === category ? "default" : "outline"}
                        onClick={() => setActiveCategory(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredServices.map((serviceItem) => {
                    const Icon = serviceItem.icon;
                    const isActive = selectedServiceId === serviceItem.id;
                    const startingPlan = serviceItem.plans.reduce((prev, current) =>
                      current.priceTND < prev.priceTND ? current : prev,
                    );
                    const startingCycle = startingPlan.billingCycle === "yearly"
                      ? "yr"
                      : startingPlan.billingCycle === "one-time"
                        ? "once"
                        : "mo";

                    return (
                      <button
                        key={serviceItem.id}
                        type="button"
                        onClick={() => setSelectedServiceId(serviceItem.id)}
                        className={cn(
                          "group flex h-full flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
                          "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft",
                          isActive ? "border-primary/50 bg-primary/5 shadow-glow" : "border-border bg-background",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          {serviceItem.popular && <Badge className="bg-primary/10 text-primary">Most Requested</Badge>}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">{serviceItem.category}</p>
                          <h3 className="mt-1 font-display text-lg font-semibold">{serviceItem.name}</h3>
                          <p className="mt-2 text-sm text-muted-foreground">{serviceItem.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {serviceItem.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[11px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                          <span>From {serviceItem.priceFrom} {serviceItem.currency} / {startingCycle}</span>
                          <span>{serviceItem.activationTime}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8 shadow-soft sm:p-10">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Selected service</Label>
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {selectedService?.name ?? "Choose a service"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedService?.category ?? "Select from the catalog above"}
                      </p>
                    </div>
                    {selectedService?.popular && <Badge>Popular</Badge>}
                  </div>
                </div>

                {selectedService?.id === "custom-request" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="custom-service">Custom service name</Label>
                      <Input
                        id="custom-service"
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        placeholder="e.g. Miro Team, Asana Premium"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-link">Service link (optional)</Label>
                      <Input
                        id="custom-link"
                        value={customServiceLink}
                        onChange={(e) => setCustomServiceLink(e.target.value)}
                        placeholder="https://service.com"
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select value={planId} onValueChange={setPlanId} required disabled={!selectedService}>
                    <SelectTrigger id="plan" className="h-12 rounded-xl">
                      <SelectValue placeholder="Choose a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedService?.plans ?? []).map((planItem: ServicePlan) => (
                        <SelectItem key={planItem.id} value={planItem.id}>
                          {planItem.label} · {planItem.priceTND} {selectedService?.currency} / {planItem.billingCycle === "yearly" ? "year" : planItem.billingCycle === "one-time" ? "once" : "mo"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Account Access</Label>
                  {!selectedService ? (
                    <div className="rounded-2xl border border-border bg-surface/50 p-4 text-sm text-muted-foreground">
                      Select a service to configure account type.
                    </div>
                  ) : selectedService.supportsExistingAccount && selectedService.supportsNewAccount ? (
                    <RadioGroup value={accountType} onValueChange={(value) => setAccountType(value as "existing" | "new")}>
                      <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface/50 p-4">
                        <RadioGroupItem value="existing" id="account-existing" className="mt-1" />
                        <div>
                          <p className="text-sm font-medium">Upgrade my existing account</p>
                          <p className="text-xs text-muted-foreground">Use your current subscription email.</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface/50 p-4">
                        <RadioGroupItem value="new" id="account-new" className="mt-1" />
                        <div>
                          <p className="text-sm font-medium">Create a new account for me</p>
                          <p className="text-xs text-muted-foreground">We will create and share credentials securely.</p>
                        </div>
                      </label>
                    </RadioGroup>
                  ) : (
                    <div className="rounded-2xl border border-border bg-surface/50 p-4 text-sm text-muted-foreground">
                      {selectedService.supportsExistingAccount ? "Existing account required" : "New account creation only"}
                    </div>
                  )}
                </div>

                {accountType === "existing" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Account email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Account password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="h-12 rounded-xl pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your credentials are encrypted and only used temporarily to activate your subscription. Credentials are never shared with third parties.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3 rounded-2xl border border-border bg-surface/50 p-4">
                  <div>
                    <p className="text-sm font-medium">Contact & Verification</p>
                    <p className="text-xs text-muted-foreground">
                      We may contact you during activation if verification or confirmation codes are required by the subscription provider.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor="country-code">Country code</Label>
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger id="country-code" className="h-12 rounded-xl">
                          <SelectValue placeholder="+216" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+216">+216 (Tunisia)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number</Label>
                      <Input
                        id="phone"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="12 345 678"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred contact method</Label>
                    <RadioGroup
                      value={preferredContactMethod}
                      onValueChange={(value) => setPreferredContactMethod(value as "Phone Call" | "WhatsApp" | "SMS")}
                      className="grid gap-2 sm:grid-cols-3"
                    >
                      {(["Phone Call", "WhatsApp", "SMS"] as const).map((method) => (
                        <label key={method} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs">
                          <RadioGroupItem value={method} id={`contact-${method}`} />
                          <span className="text-sm">{method}</span>
                        </label>
                      ))}
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">
                      Your contact information is used only for subscription activation and support purposes.
                    </p>
                  </div>
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
                  <span>Estimated price ({priceLabel})</span>
                  <span className="font-display text-base font-semibold text-foreground">{price} TND</span>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={
                    loading ||
                    !selectedService ||
                    !selectedPlan ||
                    (selectedService?.id === "custom-request" && !customServiceName.trim()) ||
                    (accountType === "existing" && (!accountEmail.trim() || !accountPassword.trim())) ||
                    !phoneNumber.trim()
                  }
                >
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
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <SelectedIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">Activation time</p>
                  <p className="text-sm font-semibold text-foreground">{selectedService?.activationTime ?? "15 minutes"}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {selectedService?.description ?? "Select a service to see activation details."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(selectedService?.tags ?? []).map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <InfoRow icon={ShieldCheck} title="Secure payment processing" desc="All transactions are encrypted and monitored." />
              <InfoRow icon={Headphones} title="Priority support" desc="Tunisian support team available daily." />
              <InfoRow icon={BadgeCheck} title="Verified fulfillment" desc="Refunded if activation fails." />
              <InfoRow icon={CreditCard} title="Payment protection" desc="Proof-based payment confirmation." />
              <InfoRow icon={CheckCircle2} title="Trusted by professionals" desc="Students, freelancers, and teams." />
            </div>

            <div className="rounded-2xl border border-border bg-surface/60 p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Trusted by Tunisian subscribers</p>
              <p className="mt-2">Average activation: 12-20 minutes</p>
              <p>5,000+ subscriptions activated</p>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
};

const InfoRow = ({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) => (
  <div className="flex items-start gap-3">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
      <Icon className="h-4 w-4" />
    </span>
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  </div>
);

export default RequestPayment;