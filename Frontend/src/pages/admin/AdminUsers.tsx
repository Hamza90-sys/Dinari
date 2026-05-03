import { AdminShell } from "@/components/admin/AdminShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRequests } from "@/hooks/use-requests";
import { useUsersData } from "@/hooks/use-users-data";
import { useWallet } from "@/hooks/use-wallet";
import { useMemo, useState } from "react";
import type { Profile } from "@/types/domain";

export default function AdminUsers() {
  const { profiles } = useUsersData();
  const { requests } = useRequests();
  const { walletTransactions } = useWallet();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const isRole = (value: string): value is "admin" | "user" => value === "admin" || value === "user";

  const rows = useMemo(() => {
    const q = query.toLowerCase().trim();
    return profiles
      .filter((u) => (roleFilter === "all" ? true : u.role === roleFilter))
      .filter((u) => (q ? u.email.toLowerCase().includes(q) || (u.fullName || "").toLowerCase().includes(q) : true))
      .map((u) => {
        const reqCount = requests.filter((r) => r.ownerId === u.id).length;
        const spent = walletTransactions
          .filter((tx) => tx.userId === u.id && tx.type === "service_purchase")
          .reduce((sum, tx) => sum + tx.amountTND, 0);
        return { user: u, reqCount, spent };
      });
  }, [profiles, query, roleFilter, requests, walletTransactions]);

  return (
    <AdminShell title="Users" subtitle="View user accounts, roles, and spending behavior">
      <Card className="rounded-2xl border-border p-4 sm:p-5">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by email or name"
            className="md:col-span-3"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              const value = e.target.value;
              setRoleFilter(value === "all" || isRole(value) ? value : "all");
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All roles</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">User email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Requests</th>
                  <th className="px-4 py-3 text-left">Total spent</th>
                  <th className="px-4 py-3 text-left">Account created</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user.email} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">{row.user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.user.role === "admin" ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                        {row.user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.reqCount}</td>
                    <td className="px-4 py-3">{row.spent.toFixed(2)} TND</td>
                    <td className="px-4 py-3">{new Date(row.user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setSelectedUser(row.user)}>View details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription>Account and financial summary</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-3 text-sm">
              <Detail label="Email" value={selectedUser.email} />
              <Detail label="Role" value={selectedUser.role} />
              <Detail label="Created" value={new Date(selectedUser.createdAt).toLocaleString()} />
              <Detail label="Requests" value={String(requests.filter((r) => r.ownerId === selectedUser.id).length)} />
              <Detail
                label="Total spent"
                value={`${walletTransactions
                  .filter((tx) => tx.userId === selectedUser.id && tx.type === "service_purchase")
                  .reduce((sum, tx) => sum + tx.amountTND, 0)
                  .toFixed(2)} TND`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}