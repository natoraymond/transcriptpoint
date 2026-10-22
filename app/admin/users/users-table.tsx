"use client";

import { useEffect, useState, type FormEvent } from "react";

type PortalUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function AdminUsers({ canManageUsers }: { canManageUsers: boolean }) {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  // Create account modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("admin");
  const [search, setSearch] = useState("");

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = (await response.json()) as { users?: PortalUser[]; error?: string };
      if (!response.ok || !result.users) throw new Error(result.error || "Unable to load users");
      setUsers(result.users);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const toggleUser = async (user: PortalUser) => {
    setUpdatingId(user.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isActive: !user.isActive }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update user account");
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, isActive: !user.isActive } : item)),
      );
      setNotice(`Account for ${user.email} ${!user.isActive ? "activated" : "suspended"}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update user account");
    } finally {
      setUpdatingId("");
    }
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name,
          email,
          password,
          role,
        }),
      });
      const result = (await response.json()) as { error?: string; message?: string; user?: PortalUser };
      if (!response.ok) throw new Error(result.error || "Unable to create account");

      setNotice(result.message || `${role === "admin" ? "Admin" : "User"} account created successfully.`);
      setName("");
      setEmail("");
      setPassword("");
      setIsModalOpen(false);
      await loadUsers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create account");
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    `${user.fullName} ${user.email} ${user.role}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Registered users</h2>
          <p className="mt-1 text-sm text-slate-500">
            View portal accounts and create administrator accounts with immediate sign-in access.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search accounts…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
              setIsModalOpen(true);
            }}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-slate-800"
          >
            + Create Account
          </button>
        </div>
      </div>

      {notice && <p role="status" className="m-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Name</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Joined</th>
              <th className="px-5 py-3.5">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-4 font-medium text-slate-900">{user.fullName}</td>
                <td className="px-5 py-4 text-slate-600">{user.email}</td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      user.role === "super_admin"
                        ? "bg-purple-100 text-purple-700"
                        : user.role === "admin"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {user.role.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      user.isActive ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-600" : "bg-rose-600"}`} />
                    {user.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  {user.role !== "super_admin" && (
                    <button
                      type="button"
                      disabled={updatingId === user.id}
                      onClick={() => void toggleUser(user)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                        user.isActive
                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {updatingId === user.id ? "Saving…" : user.isActive ? "Suspend" : "Restore access"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-500">
                  No accounts found matching your search.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-500">
                  Loading users…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal to Create User / Admin Account */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-account-title"
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 id="create-account-title" className="text-xl font-bold text-slate-900">
                  Create New Account
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Create an account with immediate sign-in credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">Role</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                      role === "admin"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Administrator
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("user")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                      role === "user"
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Standard User
                  </button>
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Full Name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="form-input mt-1.5"
                  required
                  placeholder="e.g. John Doe"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Email Address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="form-input mt-1.5"
                  required
                  placeholder="admin@example.com"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Initial Password (min. 9 characters)
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="form-input mt-1.5"
                  minLength={9}
                  maxLength={200}
                  required
                  placeholder="•••••••••"
                />
              </label>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {creating ? "Creating…" : "Create & Authorize"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
