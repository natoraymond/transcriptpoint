"use client";

import { useEffect, useState } from "react";

type PortalUser = { id: string; email: string; fullName: string; phoneNumber: string; role: string; isActive: boolean; createdAt: string };

export default function AdminUsers({ canManageUsers }: { canManageUsers: boolean }) {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  useEffect(() => {
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { users?: PortalUser[]; error?: string };
        if (!response.ok || !result.users) throw new Error(result.error || "Unable to load users");
        setUsers(result.users);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load users"))
      .finally(() => setLoading(false));
  }, []);
  const toggleUser = async (user: PortalUser) => {
    setUpdatingId(user.id);
    setError("");
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, isActive: !user.isActive }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update user account");
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, isActive: !user.isActive } : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update user account");
    } finally {
      setUpdatingId("");
    }
  };
  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5"><h2 className="font-semibold">Registered users</h2><p className="mt-1 text-sm text-slate-500">Read-only account listing based on your assigned permissions.</p></div>
      {error && <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Joined</th>{canManageUsers && <th className="px-5 py-3">Access</th>}</tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id}><td className="px-5 py-4 font-medium">{user.fullName}</td><td className="px-5 py-4">{user.email}</td><td className="px-5 py-4 capitalize">{user.role.replaceAll("_", " ")}</td><td className="px-5 py-4">{user.isActive ? "Active" : "Suspended"}</td><td className="px-5 py-4">{new Date(user.createdAt).toLocaleDateString()}</td>{canManageUsers && <td className="px-5 py-4"><button type="button" disabled={updatingId === user.id} onClick={() => void toggleUser(user)} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${user.isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>{updatingId === user.id ? "Saving…" : user.isActive ? "Suspend" : "Restore access"}</button></td>}</tr>)}{!loading && users.length === 0 && <tr><td colSpan={canManageUsers ? 6 : 5} className="p-10 text-center text-slate-500">No accounts found.</td></tr>}{loading && <tr><td colSpan={canManageUsers ? 6 : 5} className="p-10 text-center text-slate-500">Loading users…</td></tr>}</tbody></table></div>
    </section>
  );
}
