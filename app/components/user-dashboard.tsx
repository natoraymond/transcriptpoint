"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AccountControls from "./account-controls";

type User = { id: string; email: string; fullName: string; phoneNumber: string; role: string };
type Dashboard = {
  requests: Array<{ id: string; campus: string; status: string; paymentStatus: string; createdAt: string; service: string | null }>;
  activity: Array<{ id: number; action: string; details: Record<string, unknown>; createdAt: string }>;
  stats: { totalRequests: number; paidRequests: number; completedRequests: number };
};

export default function UserDashboard({ initialUser }: { initialUser: User }) {
  const [user, setUser] = useState(initialUser);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadDashboard = async () => {
    const response = await fetch("/api/user/dashboard", { cache: "no-store" });
    const result = await response.json() as Dashboard & { error?: string };
    if (!response.ok) throw new Error(result.error || "Unable to load your activity");
    setDashboard(result);
  };

  useEffect(() => {
    fetch("/api/user/dashboard", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as Dashboard & { error?: string };
        if (!response.ok) throw new Error(result.error || "Unable to load your activity");
        setDashboard(result);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard"));
  }, []);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: user.fullName, phoneNumber: user.phoneNumber }),
      });
      const result = await response.json() as { user?: User; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error || "Unable to update profile");
      setUser(result.user);
      setNotice("Your profile was updated.");
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const stats = dashboard?.stats;
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-700">Personal workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome, {user.fullName}</h1><p className="mt-2 text-sm text-slate-500">Manage your profile and follow your transcript requests.</p></div>
          <AccountControls fullName={user.fullName} role="user" dashboardHref="/dashboard" />
        </header>
        <nav aria-label="User dashboard navigation" className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
          <a href="#overview" className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white">Overview</a>
          <a href="#profile" className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">My profile</a>
          <a href="#requests" className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">My requests</a>
          <a href="#activity" className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">Activity</a>
          <Link href="/request" className="ml-auto rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">New transcript request</Link>
        </nav>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <section id="overview" className="mt-5 grid gap-4 sm:grid-cols-3">
          {[{ label: "My requests", value: stats?.totalRequests ?? "—" }, { label: "Paid", value: stats?.paidRequests ?? "—" }, { label: "Completed", value: stats?.completedRequests ?? "—" }].map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-3 text-3xl font-semibold">{item.value}</p></article>)}
        </section>
        <div className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
          <section id="profile" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">My profile</h2><p className="mt-1 text-sm text-slate-500">Your email is used as your account identity and cannot be changed here.</p>
            <form onSubmit={saveProfile} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Full name<input className="form-input mt-2" value={user.fullName} onChange={(event) => setUser({ ...user, fullName: event.target.value })} maxLength={120} required /></label>
              <label className="block text-sm font-medium text-slate-700">Email<input className="form-input mt-2 bg-slate-50" value={user.email} readOnly /></label>
              <label className="block text-sm font-medium text-slate-700">Phone number<input className="form-input mt-2" value={user.phoneNumber} onChange={(event) => setUser({ ...user, phoneNumber: event.target.value })} maxLength={40} /></label>
              <button disabled={isSaving} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? "Saving…" : "Save profile"}</button>
            </form>
          </section>
          <section id="requests" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6"><h2 className="text-lg font-semibold">My transcript requests</h2><p className="mt-1 text-sm text-slate-500">Only requests submitted while signed into this account are listed.</p></div>
            <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Request</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{(dashboard?.requests ?? []).map((request) => <tr key={request.id}><td className="px-5 py-4">#{request.id}<span className="mt-1 block text-xs text-slate-500">{request.campus}</span></td><td className="px-5 py-4">{request.service ?? "Transcript"}</td><td className="px-5 py-4 capitalize">{request.status}</td><td className="px-5 py-4 capitalize">{request.paymentStatus}</td><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{new Date(request.createdAt).toLocaleDateString()}</td></tr>)}{dashboard && !dashboard.requests.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No requests are linked to this account yet.</td></tr>}</tbody></table></div>
          </section>
        </div>
        {user.role === "admin" && <Link href="/admin" className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Open Admin dashboard</Link>}
        <section id="activity" className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Recent activity</h2><div className="mt-4 divide-y divide-slate-100">{(dashboard?.activity ?? []).map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 py-3"><span className="text-sm capitalize text-slate-700">{item.action.replaceAll("_", " ")}</span><time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time></div>)}{dashboard && !dashboard.activity.length && <p className="py-5 text-sm text-slate-500">Account activity will appear here.</p>}</div></section>
      </div>
    </main>
  );
}
