import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Bell, LayoutDashboard, ListTodo, Receipt, Users, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/requests", label: "Requests", icon: ListTodo },
  { to: "/admin/payments", label: "Payments", icon: Receipt },
  { to: "/admin/users", label: "Users", icon: Users },
];

export function AdminShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const onSignOut = async () => {
    try {
      await signOut();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign out failed.");
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-border bg-card lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center px-5">
            <Logo />
          </div>
          <nav className="space-y-1 px-3 py-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-border p-3">
            <div className="mb-3 rounded-xl border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="truncate text-sm font-medium">{user?.email}</p>
            </div>
            <Button variant="outline" className="w-full justify-start" onClick={onSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-lg sm:px-6">
            <div>
              <h1 className="font-display text-xl font-semibold sm:text-2xl">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
