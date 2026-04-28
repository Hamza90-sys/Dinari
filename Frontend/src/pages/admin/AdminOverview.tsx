import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card } from "@/components/ui/card";
import { usePayments } from "@/hooks/use-payments";
import { useRequests } from "@/hooks/use-requests";
import { useUsersData } from "@/hooks/use-users-data";
import { Activity, BadgeDollarSign, CheckCheck, Loader, Wallet } from "lucide-react";
import type { RequestStatus } from "@/components/dashboard/StatusBadge";

export default function AdminOverview() {
  const { requests } = useRequests();
  const { payments } = usePayments();
  const { profiles } = useUsersData();

  const pendingPayments = requests.filter((r) => r.status === "Awaiting Payment").length;
  const processing = requests.filter((r) => r.status === "Processing").length;
  const completed = requests.filter((r) => r.status === "Completed").length;
  const revenue = payments
    .filter((p) => p.requestId && p.status === "Completed")
    .reduce((sum, p) => sum + p.amountTND, 0);

  const distribution: { label: RequestStatus; count: number }[] = [
    { label: "Awaiting Payment", count: pendingPayments },
    { label: "Paid", count: requests.filter((r) => r.status === "Paid").length },
    { label: "Processing", count: processing },
    { label: "Completed", count: completed },
    { label: "Failed", count: requests.filter((r) => r.status === "Failed").length },
  ];

  return (
    <AdminShell title="Admin Overview" subtitle="Operations visibility across requests, payments, and users">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Total Requests" value={String(requests.length)} icon={Activity} />
        <Metric title="Pending Payments" value={String(pendingPayments)} icon={Wallet} />
        <Metric title="Processing Requests" value={String(processing)} icon={Loader} />
        <Metric title="Completed Orders" value={String(completed)} icon={CheckCheck} />
        <Metric title="Total Revenue" value={`${revenue.toFixed(2)} TND`} icon={BadgeDollarSign} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="rounded-2xl border-border p-5 xl:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Recent requests</h3>
          {requests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Service</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 8).map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                      <td className="px-4 py-3">{r.ownerEmail}</td>
                      <td className="px-4 py-3">{r.service}</td>
                      <td className="px-4 py-3">{r.amountTND.toFixed(2)} TND</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} withIcon={false} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border-border p-5">
          <h3 className="mb-4 text-sm font-semibold">Status distribution</h3>
          <div className="space-y-2">
            {distribution.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                <StatusBadge status={item.label} withIcon={false} />
                <span className="text-sm font-semibold">{item.count}</span>
              </div>
            ))}
          </div>

          <h3 className="mb-3 mt-6 text-sm font-semibold">Recent activity</h3>
          <ul className="space-y-2 text-sm">
            {requests.slice(0, 5).map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{r.id} - {r.service}</p>
                <p className="text-xs text-muted-foreground">{r.ownerEmail} - {new Date(r.updatedAt).toLocaleString()}</p>
              </li>
            ))}
            {requests.length === 0 && <li className="text-muted-foreground">No activity yet.</li>}
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Users: {profiles.length}</p>
        </Card>
      </div>
    </AdminShell>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <Card className="rounded-2xl border-border p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
    </Card>
  );
}