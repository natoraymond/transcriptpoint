"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import AccountControls from "./account-controls";

const permissionOptions = [
  { id: "dashboard.read", label: "Dashboard" },
  { id: "requests.read", label: "View requests" },
  { id: "requests.update", label: "Update request status" },
  { id: "payments.read", label: "View payments" },
  { id: "users.read", label: "View users" },
  { id: "users.update", label: "Manage user accounts" },
] as const;
type Role = "user" | "admin" | "super_admin";
type PortalUser = { id: string; email: string; fullName: string; phoneNumber: string; role: Role; permissions: string[]; isActive: boolean; createdAt: string; lastActivityAt: string | null };

const defaultAdminPermissions = ["dashboard.read", "requests.read", "requests.update", "payments.read", "users.read", "users.update"];

export default function SuperAdminDashboard({ fullName, currentUserId }: { fullName: string; currentUserId: string }) {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [newRole, setNewRole] = useState<Role>("admin");
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setError("");
    const response = await fetch("/api/super-admin/users", { cache: "no-store" });
    const result = await response.json() as { users?: PortalUser[]; error?: string };
    if (!response.ok || !result.users) throw new Error(result.error || "Unable to load accounts");
    setUsers(result.users);
  }, []);

  useEffect(() => {
    fetch("/api/super-admin/users", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { users?: PortalUser[]; error?: string };
        if (!response.ok || !result.users) throw new Error(result.error || "Unable to load accounts");
        setUsers(result.users);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load accounts"))
      .finally(() => setLoading(false));
  }, [loadUsers]);

  const createAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/super-admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, fullName: name, role: newRole, permissions: newRole === "admin" ? defaultAdminPermissions : [] }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to create account");
      setEmail(""); setName("");
      const wasInvited = (result as { user?: { invited?: boolean } }).user?.invited;
      setNotice(wasInvited
        ? `An account setup invitation was sent to ${email}.`
        : `The ${newRole.replace("_", " ")} account was created.`);
      if (newRole === "super_admin") setNotice("A new Super Admin account was created. It is strongly recommended to require verified email and MFA for all privileged accounts.");
      await loadUsers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create account");
    } finally {
      setCreating(false);
    }
  };

  const saveUser = async (user: PortalUser, changes: Partial<Pick<PortalUser, "role" | "permissions" | "isActive">>) => {
    setSavingId(user.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/super-admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, ...changes }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update user");
      setNotice(`Access updated for ${user.email}.`);
      await loadUsers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update access");
    } finally {
      setSavingId("");
    }
  };

  const counts = { total: users.length, admins: users.filter((user) => user.role === "admin").length, suspended: users.filter((user) => !user.isActive).length };
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">System control</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Super Admin</h1><p className="mt-2 text-sm text-slate-300">Manage users, grant roles, set permissions, and control account access.</p></div>
          <AccountControls fullName={fullName} role="super_admin" dashboardHref="/super-admin" />
        </header>
        <nav className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm"><a href="#overview" className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white">Overview</a><a href="#create" className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">Create account</a><a href="#users" className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">Users & permissions</a></nav>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <section id="overview" className="mt-5 grid gap-4 sm:grid-cols-3">{[{ title: "Total accounts", value: counts.total }, { title: "Administrators", value: counts.admins }, { title: "Suspended accounts", value: counts.suspended }].map((item) => <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{item.title}</p><p className="mt-3 text-3xl font-semibold">{loading ? "—" : item.value}</p></article>)}</section>
        <section id="create" className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-700">Provision access</p><h2 className="mt-2 text-xl font-semibold">Create a user or administrator</h2><p className="mt-1 text-sm text-slate-500">New accounts cannot assign themselves roles. The account holder sets their password through a secure, expiring email invitation.</p></div>
          <form onSubmit={createAccount} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><label className="text-sm font-medium">Full name<input className="form-input mt-2" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></label><label className="text-sm font-medium">Email<input className="form-input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label className="text-sm font-medium">Role<select className="form-input mt-2" value={newRole} onChange={(event) => setNewRole(event.target.value as Role)}><option value="user">User</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></label><button disabled={creating} className="self-end rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{creating ? "Creating…" : "Send setup invitation"}</button></form>
        </section>
        <section id="users" className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-6"><div><h2 className="text-lg font-semibold">Users, roles & permissions</h2><p className="mt-1 text-sm text-slate-500">Changes take effect immediately. Suspended accounts lose all active sessions.</p></div><button type="button" onClick={() => void loadUsers().catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to refresh"))} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Refresh</button></div>
          <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Account</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Admin permissions</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Save</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id} className={!user.isActive ? "bg-slate-50 text-slate-500" : ""}><td className="px-5 py-4"><p className="font-semibold text-slate-900">{user.fullName}{user.id === currentUserId ? " · You" : ""}</p><p className="mt-1 text-xs">{user.email}</p></td><td className="px-5 py-4"><select aria-label={`Role for ${user.email}`} disabled={savingId === user.id || user.role === "super_admin"} className="rounded-lg border border-slate-300 bg-white px-3 py-2" value={user.role} onChange={(event) => void saveUser(user, { role: event.target.value as Role })}><option value="user">User</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></td><td className="px-5 py-4"><div className="grid grid-cols-2 gap-x-4 gap-y-2">{permissionOptions.map((permission) => <label key={permission.id} className={`flex items-center gap-2 text-xs ${user.role !== "admin" ? "opacity-50" : ""}`}><input type="checkbox" disabled={savingId === user.id || user.role !== "admin"} checked={user.permissions.includes(permission.id)} onChange={(event) => { const next = event.target.checked ? [...user.permissions, permission.id] : user.permissions.filter((value) => value !== permission.id); void saveUser(user, { permissions: next }); }} />{permission.label}</label>)}</div></td><td className="px-5 py-4"><button type="button" disabled={savingId === user.id || user.role === "super_admin"} onClick={() => void saveUser(user, { isActive: !user.isActive })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{user.isActive ? "Active" : "Suspended"}</button></td><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td><td className="px-5 py-4 text-xs text-slate-500">{savingId === user.id ? "Saving…" : "Saved"}</td></tr>)}{!loading && !users.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No accounts found.</td></tr>}{loading && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Loading accounts…</td></tr>}</tbody></table></div>
        </section>
      </div>
    </main>
  );
}
