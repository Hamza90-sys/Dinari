import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Bell,
  TrendingDown,
  TrendingUp,
  Plus,
  Repeat,
  ListTodo,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  CreditCard,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { AlertBar } from "@/components/dashboard/AlertBar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { RequestDetailsDialog } from "@/components/dashboard/RequestDetailsDialog";
import { FilterBar, type FilterValue } from "@/components/dashboard/FilterBar";
import { MoneyDialog } from "@/components/dashboard/MoneyDialogs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useRequests } from "@/hooks/use-requests";
import { useUsersData } from "@/hooks/use-users-data";
import { usePayments } from "@/hooks/use-payments";
import { formatDate } from "@/lib/format";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { requests } = useRequests();
  const { subscriptions, profile: dbProfile } = useUsersData();
  const { payments } = usePayments();

  const [filters, setFilters] = useState<FilterValue>({ statuses: [], services: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moneyMode, setMoneyMode] = useState<"topup" | "withdraw" | null>(null);

  useEffect(() => {
    document.title = "Dashboard - Dinari";
  }, []);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true, state: { from: "/dashboard" } });
  }, [user, navigate]);

  const userId = user?.id ?? "";
  const balance = dbProfile?.balanceTnd ?? profile?.balanceTnd ?? 0;
  const ownedRequests = useMemo(() => requests.filter((r) => r.ownerId === userId), [requests, userId]);
  const ownedSubscriptions = useMemo(() => subscriptions.filter((s) => s.ownerId === userId), [subscriptions, userId]);
  const ownedPayments = useMemo(() => payments.filter((p) => p.ownerId === userId), [payments, userId]);

  const filteredPayments = useMemo(() => {
    return ownedPayments.filter((p) => {
      const statusToken = p.requestId ? "Completed" : p.status;
      const statusOk = filters.statuses.length === 0 || filters.statuses.includes(statusToken);
      const serviceValue = p.requestId ? p.requestId : p.method;
      const serviceOk =
        filters.services.length === 0 || filters.services.some((s) => serviceValue.toLowerCase().includes(s.toLowerCase()));
      return statusOk && serviceOk;
    });
  }, [filters, ownedPayments]);

  const awaitingRequest = ownedRequests.find((r) => r.status === "Awaiting Payment");
  const lastTopUp = useMemo(() => {
    const t = ownedPayments.find((p) => !p.requestId && p.method !== "Withdrawal");
    return t ? `${t.amountTND} TND on ${formatDate(t.createdAt)}` : undefined;
  }, [ownedPayments]);

  const totalPaid = useMemo(
    () =>
      ownedPayments
        .filter((p) => p.requestId || p.method === "Withdrawal")
        .reduce((sum, p) => sum + p.amountTND, 0),
    [ownedPayments],
  );

  const monthSpend = useMemo(() => {
    const now = new Date();
    return ownedPayments
      .filter((p) => {
        if (!p.requestId) return false;
        const d = new Date(p.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + p.amountTND, 0);
  }, [ownedPayments]);

  const initials =
    (profile?.fullName ?? user?.email ?? "?")
      .split(/[\s@.]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  const selectedRequest = ownedRequests.find((r) => r.id === selectedId) ?? null;

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-surface">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          {awaitingRequest && (
            <AlertBar
              message={`Your ${awaitingRequest.service} request (${awaitingRequest.id}) is awaiting payment.`}
              ctaLabel="View details"
              ctaTo="#"
            />
          )}

          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative rounded-full">
                <Bell className="h-4 w-4" />
                {awaitingRequest && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />}
              </Button>
              <Button variant="hero" size="sm" asChild className="rounded-full">
                <Link to="/request">
                  <Plus className="h-4 w-4" /> New request
                </Link>
              </Button>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft font-display text-sm font-semibold text-primary">
                {initials}
              </span>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-8">
            <div className="mb-8 flex flex-col gap-1">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">Welcome back, {profile?.fullName ?? user.email?.split("@")[0]}</h1>
              <p className="text-sm text-muted-foreground">Here's a quick view of your balance, requests, and activity.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <BalanceCard
                balance={balance}
                lastTopUp={lastTopUp}
                onTopUp={() => setMoneyMode("topup")}
                onWithdraw={() => setMoneyMode("withdraw")}
              />
              <StatCard
                label="This month spend"
                value={`${monthSpend.toFixed(0)} TND`}
                delta={monthSpend === 0 ? "No activity yet" : "Across paid requests"}
                trendUp={false}
                icon={TrendingDown}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <SmallStat
                label="Active subscriptions"
                value={String(ownedSubscriptions.length)}
                hint={ownedSubscriptions.length === 0 ? "Start by adding one" : "Auto-renews monthly"}
                icon={Repeat}
              />
              <SmallStat
                label="Open requests"
                value={String(ownedRequests.filter((r) => r.status !== "Completed" && r.status !== "Failed").length)}
                hint={awaitingRequest ? "1+ awaiting payment" : "Nothing pending"}
                icon={ListTodo}
              />
              <SmallStat
                label="Total paid"
                value={`${totalPaid.toFixed(0)} TND`}
                hint="Lifetime"
                icon={TrendingUp}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Card
                title="Active subscriptions"
                action={<button className="text-xs font-medium text-primary hover:underline">View all</button>}
                className="lg:col-span-2"
              >
                {ownedSubscriptions.length === 0 ? (
                  <EmptyState
                    icon={Repeat}
                    title="No subscriptions yet"
                    description="When a request is completed, your subscription will show up here."
                    ctaLabel="Browse services"
                    ctaTo="/services"
                  />
                ) : (
                  <DataTable
                    headers={["Service", "Plan", "Next billing", "Amount", "Status"]}
                    rows={ownedSubscriptions.map((s) => [
                      <span className="font-medium text-foreground">{s.service}</span>,
                      <span className="text-muted-foreground">{s.plan}</span>,
                      <span className="text-muted-foreground">{formatDate(s.renewalDate)}</span>,
                      <span className="font-medium text-foreground">--</span>,
                      <StatusBadge status={s.status} />,
                    ])}
                  />
                )}
              </Card>

              <Card
                title="Recent requests"
                action={
                  <Button variant="ghost" size="sm" asChild className="h-8 rounded-full text-xs">
                    <Link to="/request">
                      <Plus className="h-3.5 w-3.5" /> New
                    </Link>
                  </Button>
                }
              >
                {ownedRequests.length === 0 ? (
                  <EmptyState
                    icon={ListTodo}
                    title="No requests yet"
                    description="Create your first request to pay for an international service in TND."
                    ctaLabel="Create your first request"
                    ctaTo="/request"
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {ownedRequests.slice(0, 6).map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{r.service}</p>
                          <p className="text-xs text-muted-foreground">{r.id} - {formatDate(r.createdAt)}</p>
                        </div>
                        <StatusBadge status={r.status} withIcon={false} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Request actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setSelectedId(r.id)}>View details</DropdownMenuItem>
                            {r.status === "Awaiting Payment" && (
                              <DropdownMenuItem onClick={() => setSelectedId(r.id)}>
                                <CreditCard className="mr-2 h-3.5 w-3.5" /> Pay now
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="mt-6">
              <Card title="Payment history" action={<FilterBar value={filters} onChange={setFilters} />}>
                {filteredPayments.length === 0 ? (
                  <EmptyState
                    icon={ArrowUpRight}
                    title={ownedPayments.length === 0 ? "No payments yet" : "No matching payments"}
                    description={
                      ownedPayments.length === 0
                        ? "Top up your balance or pay a request and you'll see it here."
                        : "Try removing some filters to see more results."
                    }
                    ctaLabel={ownedPayments.length === 0 ? "Top up balance" : undefined}
                    ctaTo={undefined}
                  />
                ) : (
                  <DataTable
                    headers={["ID", "Date", "Reference", "Amount", "Status"]}
                    rows={filteredPayments.map((p) => [
                      <span className="font-mono text-xs text-muted-foreground">{p.id.slice(0, 8)}</span>,
                      <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>,
                      <span className="font-medium text-foreground">{p.requestId || p.method}</span>,
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        {!p.requestId && p.method !== "Withdrawal" ? (
                          <ArrowDownRight className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {p.amountTND} TND
                      </span>,
                      <StatusBadge status={p.requestId ? "Completed" : p.status} />,
                    ])}
                  />
                )}
              </Card>
            </div>
          </main>
        </div>
      </div>

      <RequestDetailsDialog
        request={selectedRequest}
        balance={balance}
        open={!!selectedRequest}
        onOpenChange={(o) => !o && setSelectedId(null)}
      />

      <MoneyDialog
        mode={moneyMode ?? "topup"}
        email={user.email ?? ""}
        balance={balance}
        open={moneyMode !== null}
        onOpenChange={(o) => !o && setMoneyMode(null)}
      />
    </SidebarProvider>
  );
};

const StatCard = ({
  label,
  value,
  delta,
  trendUp,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  trendUp: boolean;
  icon: React.ElementType;
}) => (
  <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <p className="mt-3 font-display text-3xl font-bold tracking-tight">{value}</p>
    <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${trendUp ? "text-success" : "text-muted-foreground"}`}>
      {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {delta}
    </p>
  </div>
);

const SmallStat = ({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
}) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-semibold leading-tight">{value}</p>
      </div>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
  </div>
);

const Card = ({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  <section className={`rounded-3xl border border-border bg-card p-6 shadow-xs ${className}`}>
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {action}
    </header>
    {children}
  </section>
);

const DataTable = ({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-muted-foreground">
          {headers.map((h, i) => (
            <th key={`${h}-${i}`} className="pb-3 pr-4 font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((row, i) => (
          <tr key={i} className="text-foreground/80 transition-colors hover:bg-muted/40">
            {row.map((cell, j) => (
              <td key={j} className="py-3 pr-4 align-middle">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Dashboard;