import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ADMIN_EMAIL, ADMIN_FULL_NAME, isAdminEmail } from "@/lib/admin";
import { authService } from "@/services/auth.service";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const from = (location.state as { from?: string })?.from ?? "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = `${mode === "signin" ? "Sign in" : "Create account"} - Dinari`;
  }, [mode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast.success("Welcome back");
      } else {
        await signUp(email, password, name);
        toast.success("Account created");
      }

      const currentUser = await authService.getCurrentUser();
      const currentProfile = currentUser ? await authService.getProfile(currentUser.id) : null;
      if (currentProfile?.role === "admin" || isAdminEmail(email)) {
        navigate("/admin", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setName(ADMIN_FULL_NAME);
    setEmail(ADMIN_EMAIL);
    setPassword("");
    setMode("signin");
  };

  return (
    <Layout>
      <section className="relative border-b border-border bg-surface/40">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="container relative py-16">
          <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" /> Dinari accounts
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl text-balance">
                {mode === "signin" ? "Welcome back" : "Create your Dinari account"}
              </h1>
              <p className="mt-4 max-w-md text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to manage your balance, requests, and subscriptions."
                  : "Get started in seconds. No card required."}
              </p>

              <div className="mt-8 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Secure by design - encrypted in transit
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Local TND support, transparent pricing
                </div>
              </div>

              <button
                onClick={fillDemo}
                type="button"
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Prefill admin account
              </button>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
              <div className="mb-6 inline-flex rounded-full border border-border bg-muted p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-full px-4 py-1.5 transition-colors ${
                    mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-full px-4 py-1.5 transition-colors ${
                    mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Create account
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="h-12 rounded-xl"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      className="h-12 rounded-xl pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
                </Button>

                <p className="pt-2 text-center text-xs text-muted-foreground">
                  {mode === "signin" ? (
                    <>
                      New here?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className="font-medium text-primary hover:underline"
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signin")}
                        className="font-medium text-primary hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
                <p className="text-center text-[11px] text-muted-foreground">
                  By continuing you agree to Dinari's <Link to="/" className="underline">Terms</Link>.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Login;
