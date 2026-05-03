import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminRequestDetailsDialog } from "@/components/admin/AdminRequestDetailsDialog";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useRequests } from "@/hooks/use-requests";
import { type DinariRequest, type RequestStatus } from "@/types/domain";

const transitions: Record<RequestStatus, RequestStatus[]> = {
  "Awaiting Payment": ["Paid", "Failed"],
  Paid: ["Processing", "Failed"],
  Processing: ["Completed", "Failed"],
  Completed: [],
  Failed: ["Processing"],
};

export default function AdminRequests() {
  const { requests, setRequestStatus, deleteRequest } = useRequests();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DinariRequest | null>(null);
  const [toDelete, setToDelete] = useState<DinariRequest | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.ownerEmail.toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.plan.toLowerCase().includes(q),
    );
  }, [requests, query]);

  const changeStatus = async (request: DinariRequest, status: RequestStatus) => {
    await setRequestStatus(request.id, status);
    toast.success(`Request ${request.id} marked as ${status.toLowerCase()}`);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteRequest(toDelete.id);
    toast.success(`Request ${toDelete.id} deleted`);
    setToDelete(null);
  };

  return (
    <AdminShell title="Requests" subtitle="Manage all customer requests from one place">
      <Card className="rounded-2xl border-border p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, user email, service, or plan"
            className="sm:max-w-md"
          />
          <p className="text-sm text-muted-foreground">{filtered.length} requests</p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No requests found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Request ID</th>
                  <th className="px-4 py-3 text-left">User email</th>
                  <th className="px-4 py-3 text-left">Service</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-3">{r.ownerEmail}</td>
                    <td className="px-4 py-3">{r.service}</td>
                    <td className="px-4 py-3">{r.plan}</td>
                    <td className="px-4 py-3">{r.amountTND.toFixed(2)} TND</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} withIcon={false} /></td>
                    <td className="px-4 py-3">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelected(r)}>View Details</Button>
                        {transitions[r.status].map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant="ghost"
                            className="hover:bg-primary-soft"
                            onClick={() => changeStatus(r, status)}
                          >
                            Mark {status}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                          onClick={() => setToDelete(r)}
                        >
                          Delete
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

      <AdminRequestDetailsDialog
        request={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete request?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will remove {toDelete?.id} from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmDelete}>
              Delete request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
