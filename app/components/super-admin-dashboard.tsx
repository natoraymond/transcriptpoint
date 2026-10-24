"use client";

import { useCallback, useEffect, useState, type FormEvent, type ChangeEvent } from "react";
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
type PortalUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  permissions: string[];
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  lastActivityAt: string | null;
};
type SuperAdminData = {
  stats: {
    total: number;
    users: number;
    admins: number;
    superAdmins: number;
    suspended: number;
    totalRequests: number;
    pending: number;
    completed: number;
    paidCount: number;
    paidValue: number;
    totalProducts: number;
    activeProducts: number;
  };
  products: Array<{ value: string; label: string; category: string; amount: number; isActive: boolean; requiresDhl: boolean }>;
  activity: Array<{ id: number; action: string; details: Record<string, unknown>; createdAt: string; actorName: string; actorEmail: string }>;
};

const defaultAdminPermissions = ["dashboard.read", "requests.read", "requests.update", "payments.read", "users.read", "users.update"];

type Props = {
  fullName: string;
  currentUserId: string;
  initialAvatarUrl?: string | null;
  userEmail?: string;
};

export default function SuperAdminDashboard({
  fullName,
  currentUserId,
  initialAvatarUrl,
  userEmail,
}: Props) {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [monitoring, setMonitoring] = useState<SuperAdminData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("admin");
  const [creating, setCreating] = useState(false);

  // Super Admin profile picture state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const loadUsers = useCallback(async () => {
    setError("");
    const response = await fetch("/api/super-admin/users", { cache: "no-store" });
    const result = (await response.json()) as { users?: PortalUser[]; error?: string };
    if (!response.ok || !result.users) throw new Error(result.error || "Unable to load accounts");
    setUsers(result.users);

    // Keep current user avatar in sync
    const current = result.users.find((u) => u.id === currentUserId);
    if (current && current.avatarUrl !== undefined) {
      setAvatarUrl(current.avatarUrl);
    }
  }, [currentUserId]);

  const loadMonitoring = useCallback(async () => {
    const response = await fetch("/api/super-admin/dashboard", { cache: "no-store" });
    const result = (await response.json()) as SuperAdminData & { error?: string };
    if (!response.ok || !result.stats) throw new Error(result.error || "Unable to load monitoring data");
    setMonitoring(result);
  }, []);

  useEffect(() => {
    Promise.all([loadUsers(), loadMonitoring()])
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load accounts"))
      .finally(() => setLoading(false));
  }, [loadMonitoring, loadUsers]);

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setAvatarError("Please select an image smaller than 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setAvatarPreview(dataUrl);
        setAvatarError("");
        setAvatarNotice("Photo preview ready. Click 'Save Photo' to apply.");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    setUploadingAvatar(true);
    setAvatarNotice("");
    setAvatarError("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: avatarPreview }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save profile photo");

      setAvatarUrl(avatarPreview);
      setAvatarNotice("Super Admin profile picture updated successfully!");
      await loadUsers();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Unable to save profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    setAvatarNotice("");
    setAvatarError("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to remove profile photo");

      setAvatarPreview(null);
      setAvatarUrl(null);
      setAvatarNotice("Profile picture removed.");
      await loadUsers();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Unable to remove profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const createAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName: name,
          password: password || undefined,
          role: newRole,
          permissions: newRole === "admin" ? defaultAdminPermissions : [],
        }),
      });
      const result = (await response.json()) as { error?: string; message?: string; user?: { invited?: boolean } };
      if (!response.ok) throw new Error(result.error || "Unable to create account");
      setEmail("");
      setName("");
      setPassword("");
      const wasInvited = result.user?.invited;
      setNotice(
        result.message ||
          (wasInvited
            ? `An account setup invitation was sent to ${email}.`
            : `The ${newRole.replace("_", " ")} account was created with immediate login access.`),
      );
      await loadUsers();
      await loadMonitoring();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create account");
    } finally {
      setCreating(false);
    }
  };

  const saveUser = async (
    user: PortalUser,
    changes: Partial<Pick<PortalUser, "role" | "permissions" | "isActive">>,
  ) => {
    setSavingId(user.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...changes }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update user");
      setNotice(`Access updated for ${user.email}.`);
      await loadUsers();
      await loadMonitoring();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update access");
    } finally {
      setSavingId("");
    }
  };

  const filteredUsers = users.filter((user) =>
    `${user.fullName} ${user.email} ${user.role}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const counts = monitoring?.stats ?? {
    total: users.length,
    admins: users.filter((user) => user.role === "admin").length,
    suspended: users.filter((user) => !user.isActive).length,
  };
  const overviewCards = [
    { title: "Total accounts", value: counts.total },
    { title: "Administrators", value: counts.admins },
    { title: "Suspended accounts", value: counts.suspended },
    { title: "Total transcript requests", value: monitoring?.stats.totalRequests ?? 0 },
  ];

  const initials = fullName
    ? fullName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SA";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-[1500px]">
        {/* System control Header with Profile Picture */}
        <header className="flex flex-col gap-5 rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setAvatarPreview(avatarUrl);
                setAvatarNotice("");
                setAvatarError("");
                setIsAvatarModalOpen(true);
              }}
              className="group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-cyan-400/40 bg-slate-900 shadow-lg transition hover:scale-105 hover:border-cyan-400 sm:h-16 sm:w-16"
              title="Click to upload/change Super Admin profile picture"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-white sm:text-xl">{initials}</span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-current text-white" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
              </div>
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">System control</p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight sm:text-3xl">Super Admin</h1>
              <p className="mt-0.5 truncate text-xs text-slate-300">
                {fullName} {userEmail ? `· ${userEmail}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setAvatarPreview(avatarUrl);
                setAvatarNotice("");
                setAvatarError("");
                setIsAvatarModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400 hover:bg-slate-800 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
              <span>Photo</span>
            </button>
            <AccountControls fullName={fullName} role="super_admin" dashboardHref="/super-admin" avatarUrl={avatarUrl} />
          </div>
        </header>

        <nav className="mt-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 text-xs sm:gap-2 sm:text-sm">
          <a href="#overview" className="shrink-0 rounded-xl bg-slate-900 px-3.5 py-2 font-medium text-white sm:px-4">
            Overview
          </a>
          <a href="#create" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Create account
          </a>
          <a href="#users" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Users &amp; permissions
          </a>
          <a href="#products" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Products
          </a>
          <a href="#activity" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Activity
          </a>
          <a href="/admin" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Admin dashboard
          </a>
        </nav>

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        <section id="overview" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overviewCards.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{item.title}</p>
              <p className="mt-3 text-3xl font-semibold">{loading ? "—" : item.value}</p>
            </article>
          ))}
        </section>

        <section id="create" className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-700">Provision access</p>
            <h2 className="mt-2 text-xl font-semibold">Create a user or administrator</h2>
            <p className="mt-1 text-sm text-slate-500">
              Provide an initial password for immediate sign-in, or leave blank to send an email invitation.
            </p>
          </div>
          <form onSubmit={createAccount} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium">
              Full name
              <input className="form-input mt-2" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
            </label>
            <label className="text-sm font-medium">
              Email
              <input className="form-input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="text-sm font-medium">
              Password (optional, min 9 chars)
              <input
                className="form-input mt-2"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={9}
                maxLength={200}
                placeholder="Direct login password"
              />
            </label>
            <label className="text-sm font-medium">
              Role
              <select className="form-input mt-2" value={newRole} onChange={(event) => setNewRole(event.target.value as Role)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <div className="col-span-full flex justify-end">
              <button disabled={creating} className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                {creating ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        </section>

        <section id="products" className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-semibold">Transcript products</h2>
            <p className="mt-1 text-sm text-slate-500">Current catalog records from the transcript options database.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Delivery</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monitoring?.products.map((product) => (
                  <tr key={product.value}>
                    <td className="px-5 py-3 font-medium">{product.label}</td>
                    <td className="px-5 py-3">{product.category}</td>
                    <td className="px-5 py-3">₦{Number(product.amount).toLocaleString("en-NG")}</td>
                    <td className="px-5 py-3">{product.requiresDhl ? "DHL" : "Email"}</td>
                    <td className="px-5 py-3">{product.isActive ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="activity" className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-semibold">Recent website activity</h2>
            <p className="mt-1 text-sm text-slate-500">Latest recorded account and administrator events.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {monitoring?.activity.map((event) => (
              <article key={event.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
                <div>
                  <p className="font-medium">{event.action.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {event.actorName} · {event.actorEmail}
                  </p>
                </div>
                <time className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</time>
              </article>
            ))}
            {!monitoring?.activity.length && <p className="p-6 text-sm text-slate-500">No activity has been recorded.</p>}
          </div>
        </section>

        <section id="users" className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Users, roles &amp; permissions</h2>
              <p className="mt-1 text-sm text-slate-500">Changes take effect immediately. Suspended accounts lose all active sessions.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                aria-label="Search accounts"
                placeholder="Search name, email, role"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="form-input text-xs sm:text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  void Promise.all([loadUsers(), loadMonitoring()]).catch((e: unknown) =>
                    setError(e instanceof Error ? e.message : "Unable to refresh"),
                  )
                }
                className="shrink-0 rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm font-semibold hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Mobile User Cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredUsers.map((user) => (
              <div key={user.id} className={`p-4 ${!user.isActive ? "bg-slate-50/80 text-slate-500" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {user.fullName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 text-sm">
                        {user.fullName}
                        {user.id === currentUserId ? " · You" : ""}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={savingId === user.id || user.role === "super_admin"}
                    onClick={() => void saveUser(user, { isActive: !user.isActive })}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {user.isActive ? "Active" : "Suspended"}
                  </button>
                </div>

                <div className="mt-3.5 space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Role:</span>
                    <select
                      aria-label={`Role for ${user.email}`}
                      disabled={savingId === user.id || user.role === "super_admin"}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
                      value={user.role}
                      onChange={(event) => void saveUser(user, { role: event.target.value as Role })}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  {user.role === "admin" && (
                    <div className="mt-2 rounded-xl bg-slate-50 p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Admin Permissions</p>
                      <div className="grid grid-cols-2 gap-2">
                        {permissionOptions.map((permission) => (
                          <label key={permission.id} className="flex items-center gap-1.5 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              disabled={savingId === user.id}
                              checked={user.permissions.includes(permission.id)}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...user.permissions, permission.id]
                                  : user.permissions.filter((val) => val !== permission.id);
                                void saveUser(user, { permissions: next });
                              }}
                            />
                            {permission.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                    <span>{savingId === user.id ? "Saving…" : "Auto-saved"}</span>
                  </div>
                </div>
              </div>
            ))}
            {!loading && !filteredUsers.length && (
              <p className="p-6 text-center text-sm text-slate-500">No accounts found.</p>
            )}
            {loading && (
              <p className="p-6 text-center text-sm text-slate-500">Loading accounts…</p>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Admin permissions</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={!user.isActive ? "bg-slate-50 text-slate-500" : ""}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.fullName} className="h-8 w-8 rounded-full border border-slate-200 object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                            {user.fullName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">
                            {user.fullName}
                            {user.id === currentUserId ? " · You" : ""}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        aria-label={`Role for ${user.email}`}
                        disabled={savingId === user.id || user.role === "super_admin"}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                        value={user.role}
                        onChange={(event) => void saveUser(user, { role: event.target.value as Role })}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {permissionOptions.map((permission) => (
                          <label key={permission.id} className={`flex items-center gap-2 text-xs ${user.role !== "admin" ? "opacity-50" : ""}`}>
                            <input
                              type="checkbox"
                              disabled={savingId === user.id || user.role !== "admin"}
                              checked={user.permissions.includes(permission.id)}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...user.permissions, permission.id]
                                  : user.permissions.filter((val) => val !== permission.id);
                                void saveUser(user, { permissions: next });
                              }}
                            />
                            {permission.label}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        disabled={savingId === user.id || user.role === "super_admin"}
                        onClick={() => void saveUser(user, { isActive: !user.isActive })}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Suspended"}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{savingId === user.id ? "Saving…" : "Saved"}</td>
                  </tr>
                ))}
                {!loading && !filteredUsers.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      No accounts found.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      Loading accounts…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Super Admin Profile Photo Modal */}
      {isAvatarModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsAvatarModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="super-admin-avatar-title"
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-7 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 id="super-admin-avatar-title" className="text-xl font-bold text-slate-900">
                  Super Admin Profile Picture
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Upload or update your profile photo for System Control.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="h-28 w-28 rounded-full border-4 border-slate-100 object-cover shadow-lg"
                  />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-950 text-3xl font-bold text-white shadow-lg">
                    {initials}
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                <label className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-slate-800">
                  Choose Photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </label>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    disabled={uploadingAvatar}
                    className="rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {uploadingAvatar ? "Saving…" : "Save Photo"}
                  </button>
                )}

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>

              <p className="mt-3 text-[11px] text-slate-500">Supports JPG, PNG, and WebP (auto-optimized).</p>

              {avatarNotice && (
                <p role="status" className="mt-4 w-full rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs text-emerald-800">
                  {avatarNotice}
                </p>
              )}

              {avatarError && (
                <p role="alert" className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs text-red-700">
                  {avatarError}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
