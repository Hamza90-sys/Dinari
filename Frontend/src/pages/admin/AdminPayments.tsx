import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { walletService } from "@/services/wallet.service";
import { useEffect, useMemo, useState } from "react";

export default function AdminPayments() {
  const { paymentRequests, approvePaymentRequest, rejectPaymentRequest } = useWallet();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [proofPreviews, setProofPreviews] = useState<Record<string, string>>({});
  const isPaymentStatus = (value: string): value is "pending" | "approved" | "rejected" =>
    value === "pending" || value === "approved" || value === "rejected";
  const isSort = (value: string): value is "newest" | "oldest" => value === "newest" || value === "oldest";

  const rows = useMemo(() => {
    let list = paymentRequests;
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);

    const q = query.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          (p.ownerEmail || "").toLowerCase().includes(q) ||
          (p.transactionReference || "").toLowerCase().includes(q) ||
          (p.method || "").toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [paymentRequests, query, sort, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    const loadPreviews = async () => {
      const requestsWithProof = rows.filter((row) => !!row.screenshotUrl);
      if (requestsWithProof.length === 0) {
        setProofPreviews({});
        return;
      }

      const entries = await Promise.all(
        requestsWithProof.map(async (row) => {
          try {
            const signedUrl = await walletService.createTopUpProofPreviewUrl(row.screenshotUrl!);
            return [row.id, signedUrl] as const;
          } catch {
            return [row.id, ""] as const;
          }
        }),
      );

      if (!cancelled) {
        setProofPreviews(Object.fromEntries(entries));
      }
    };

    void loadPreviews();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const isPdf = (path?: string) => (path ?? "").toLowerCase().endsWith(".pdf");

  const openProof = async (path?: string) => {
    if (!path) return;
    const url = await walletService.createTopUpProofPreviewUrl(path);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const onApprove = async (id: string) => {
    await approvePaymentRequest(id, adminNotes[id]);
  };

  const onReject = async (id: string) => {
    await rejectPaymentRequest(id, adminNotes[id]);
  };

  return (
    <AdminShell title="Payments" subtitle="Track payment events and audit request transactions">
      <Card className="rounded-2xl border-border p-4 sm:p-5">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Search by user, method, reference"
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Proof</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Admin note</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">{p.ownerEmail || "-"}</td>
                    <td className="px-4 py-3">{p.amountTND.toFixed(2)} TND</td>
                    <td className="px-4 py-3">{p.method || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.transactionReference || "-"}</td>
                    <td className="px-4 py-3">
                      {!p.screenshotUrl ? (
                        <span className="text-xs text-muted-foreground">No proof</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {!isPdf(p.screenshotUrl) && proofPreviews[p.id] ? (
                            <img
                              src={proofPreviews[p.id]}
                              alt="Proof preview"
                              className="h-10 w-10 rounded-md border border-border object-cover"
                            />
                          ) : (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-[10px] text-muted-foreground">
                              PDF
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => openProof(p.screenshotUrl)}
                          >
                            Open
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        p.status === "approved"
                          ? "bg-success-soft text-success"
                          : p.status === "rejected"
                            ? "bg-destructive-soft text-destructive"
                            : "bg-warning-soft text-warning"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Input
                        value={adminNotes[p.id] ?? p.adminNote ?? ""}
                        onChange={(e) => setAdminNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="Add a note"
                        className="h-9"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => onApprove(p.id)} disabled={p.status !== "pending"}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReject(p.id)}
                          disabled={p.status !== "pending"}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
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
