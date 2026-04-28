import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePayments } from "@/hooks/use-payments";
import { useMemo, useState } from "react";

export default function AdminPayments() {
  const { payments } = usePayments();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Completed" | "Failed" | "Pending">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const isPaymentStatus = (value: string): value is "Completed" | "Failed" | "Pending" =>
    value === "Completed" || value === "Failed" || value === "Pending";
  const isSort = (value: string): value is "newest" | "oldest" => value === "newest" || value === "oldest";

  const rows = useMemo(() => {
    let list = payments;
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);

    const q = query.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          (p.ownerEmail || "").toLowerCase().includes(q) ||
          (p.requestId || "").toLowerCase().includes(q) ||
          (p.method || "").toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [payments, query, sort, statusFilter]);

  return (
    <AdminShell title="Payments" subtitle="Track payment events and audit request transactions">
      <Card className="rounded-2xl border-border p-4 sm:p-5">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Search by payment ID, user, request"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="md:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              setStatusFilter(value === "all" || isPaymentStatus(value) ? value : "all");
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
            <option value="Pending">Pending</option>
          </select>
          <select
            value={sort}
            onChange={(e) => {
              const value = e.target.value;
              setSort(isSort(value) ? value : "newest");
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No payments match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Payment ID</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Request ID</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                    <td className="px-4 py-3">{p.ownerEmail || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.requestId || "-"}</td>
                    <td className="px-4 py-3">{p.amountTND.toFixed(2)} TND</td>
                    <td className="px-4 py-3">{p.method || "-"}</td>
                    <td className="px-4 py-3">
                      {p.requestId ? (
                        <StatusBadge status="Paid" withIcon={false} />
                      ) : (
                        <StatusBadge
                          status={
                            p.status === "Failed"
                              ? "Failed"
                              : p.status === "Pending"
                                ? "Awaiting Payment"
                                : "Completed"
                          }
                          withIcon={false}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
