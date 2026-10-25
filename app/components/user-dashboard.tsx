"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AccountControls from "./account-controls";
import ChatSupportModal from "./chat-support-modal";
import RaycomTechModal from "./raycom-tech-modal";
import UniversalNavbar from "./universal-navbar";

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
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isRaycomModalOpen, setIsRaycomModalOpen] = useState(false);

  const loadDashboard = async () => {
    const response = await fetch("/api/user/dashboard", { cache: "no-store" });
    const result = (await response.json()) as Dashboard & { error?: string };
    if (!response.ok) throw new Error(result.error || "Unable to load your activity");
    setDashboard(result);
  };

  useEffect(() => {
    fetch("/api/user/dashboard", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as Dashboard & { error?: string };
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
      const result = (await response.json()) as { user?: User; error?: string };
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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <UniversalNavbar
        pageTitle="Student Workspace"
        badge="Personal"
        theme="white"
        extraLinks={[
          { label: "New Request", href: "/request" },
          { label: "Chat with Support", href: "/assistant" },
        ]}
      />
      <main className="px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">Student &amp; Alumni Portal</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Welcome, {user.fullName}</h1>
              <p className="mt-2 text-sm text-slate-500">Track your degree transcript requests and access official support.</p>
            </div>
            <AccountControls fullName={user.fullName} role="user" dashboardHref="/dashboard" />
          </header>

          {/* Navigation Bar */}
          <nav aria-label="User dashboard navigation" className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
            <a href="#overview" className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white">Overview</a>
            <a href="#requests" className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">My requests</a>
            <a href="#contact-support" className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">Contact Us &amp; Support</a>
            <a href="#profile" className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">My profile</a>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-[#173d35] transition hover:bg-emerald-100"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Chat with Support</span>
              </button>
              <Link href="/request" className="rounded-xl bg-[#173d35] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#245246]">
                New Request ↗
              </Link>
            </div>
          </nav>

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

          {/* Contact Us & Raycom Global Tech Hub Hero Banner (Replacing any Super Admin visibility) */}
          <section id="contact-support" className="mt-5 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/40 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-[#173d35]">
                  <span>📞</span>
                  <span>Contact Us &amp; Support Centre</span>
                </div>
                <h2 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Have questions about your degree transcript or document delivery?
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Our dedicated student and alumni desk is here to help. Whether you want to verify your transcript status, inquire about DHL shipment tracking, or ask about university processing timelines (standard SLA: 2 weeks+).
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSupportModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#173d35]/20 transition hover:bg-[#245246]"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Open Live Support Chat</span>
                  </button>
                  <a
                    href="mailto:support@transcriptpoint.com"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-slate-50 shadow-sm"
                  >
                    <span>✉️</span>
                    <span>support@transcriptpoint.com</span>
                  </a>
                </div>
              </div>

              {/* Company Info Box & Link to explore Raycom Global Tech Hub */}
              <div className="rounded-2xl border border-emerald-200 bg-[#f8faf8] p-5 lg:max-w-md shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173d35] text-white text-base">🌐</span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Powered By</p>
                    <h3 className="text-sm font-bold text-slate-900">Raycom Global Tech Hub</h3>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                  Engineers of high-integrity academic records software, cryptographic document verification, and university automated clearinghouses across Africa.
                </p>
                <button
                  type="button"
                  onClick={() => setIsRaycomModalOpen(true)}
                  className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#173d35] hover:text-[#245246] hover:underline"
                >
                  <span>Explore Raycom Global Tech Hub &amp; Products</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </section>

          {/* Stats Overview */}
          <section id="overview" className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { label: "My Requests", value: stats?.totalRequests ?? "—" },
              { label: "Paid & Verified", value: stats?.paidRequests ?? "—" },
              { label: "Completed & Dispatched", value: stats?.completedRequests ?? "—" },
            ].map((item) => (
              <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
              </article>
            ))}
          </section>

          {/* Profile & Requests Split */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
            <section id="profile" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">My Profile</h2>
              <p className="mt-1 text-sm text-slate-500">Your email is verified as your unique identity on TranscriptPoint.</p>
              <form onSubmit={saveProfile} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                  <input
                    className="form-input mt-2"
                    value={user.fullName}
                    onChange={(event) => setUser({ ...user, fullName: event.target.value })}
                    maxLength={120}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input className="form-input mt-2 bg-slate-50" value={user.email} readOnly />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Phone number
                  <input
                    className="form-input mt-2"
                    value={user.phoneNumber}
                    onChange={(event) => setUser({ ...user, phoneNumber: event.target.value })}
                    maxLength={40}
                  />
                </label>
                <button
                  disabled={isSaving}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition hover:bg-slate-800"
                >
                  {isSaving ? "Saving…" : "Save profile"}
                </button>
              </form>
            </section>

            <section id="requests" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-lg font-semibold">My Transcript Requests</h2>
                <p className="mt-1 text-sm text-slate-500">Follow the status of your applications submitted through your account.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Request</th>
                      <th className="px-5 py-3">Service</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Payment</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(dashboard?.requests ?? []).map((request) => (
                      <tr key={request.id}>
                        <td className="px-5 py-4">
                          #{request.id}
                          <span className="mt-1 block text-xs text-slate-500">{request.campus}</span>
                        </td>
                        <td className="px-5 py-4">{request.service ?? "Transcript"}</td>
                        <td className="px-5 py-4 capitalize">
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            {request.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 capitalize">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            {request.paymentStatus}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {dashboard && !dashboard.requests.length && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                          No requests are linked to this account yet. Click &quot;New Request&quot; to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Activity Section */}
          <section id="activity" className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {(dashboard?.activity ?? []).map((item) => (
                <div key={item.id} className="flex flex-wrap justify-between gap-2 py-3">
                  <span className="text-sm capitalize text-slate-700">{item.action.replaceAll("_", " ")}</span>
                  <time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time>
                </div>
              ))}
              {dashboard && !dashboard.activity.length && (
                <p className="py-5 text-sm text-slate-500">Account activity will appear here as your requests proceed.</p>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Interactive Chat with Support Modal */}
      <ChatSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        initialQuestion="I applied for my degree transcript and yet have not received it"
      />

      {/* Raycom Global Tech Hub Informational Modal */}
      <RaycomTechModal
        isOpen={isRaycomModalOpen}
        onClose={() => setIsRaycomModalOpen(false)}
        onOpenLiveChat={() => setIsSupportModalOpen(true)}
      />
    </div>
  );
}

