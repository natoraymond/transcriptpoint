"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navigationItems = [
  "Overview",
  "Requests",
  "Students",
  "Institutions",
  "Payments",
  "Reports",
  "Settings",
] as const;

type NavItem = (typeof navigationItems)[number];

type DashboardRequest = { id: string; student: string; campus: string; transcriptType: string | null; status: string; paymentStatus: string; createdAt: string; institution?: string; yearOfGraduation?: number };
type DashboardPayment = { id: string; reference: string; payer: string; amount: number; method: string; status: string; createdAt: string };
type DashboardData = {
  stats: { totalRequests: number; pendingRequests: number; completedRequests: number; paidRevenue: number };
  requests: DashboardRequest[];
  payments: DashboardPayment[];
  monthly: Array<{ month: string; count: number }>;
  services: Array<{ label: string; count: number; revenue: number }>;
};

const sectionMeta: Record<NavItem, { heading: string; subheading: string }> = {
  Overview: { heading: "Overview", subheading: "Dashboard overview" },
  Requests: { heading: "Requests", subheading: "Request queue" },
  Students: { heading: "Students", subheading: "Student records" },
  Institutions: { heading: "Institutions", subheading: "Partner institutions" },
  Payments: { heading: "Payments", subheading: "Transaction overview" },
  Reports: { heading: "Reports", subheading: "Performance and analytics" },
  Settings: { heading: "Settings", subheading: "Administrative controls" },
};

const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export default function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState<NavItem>("Overview");
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingRequest, setUpdatingRequest] = useState("");
  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const result = (await response.json()) as DashboardData & { error?: string };
        if (!response.ok) throw new Error(result.error || "Unable to load dashboard data");
        if (isMounted) {
          setDashboard(result);
          setDashboardError("");
        }
      } catch (error) {
        if (isMounted) setDashboardError(error instanceof Error ? error.message : "Unable to load dashboard data");
      }
    };
    void loadDashboard();
    return () => { isMounted = false; };
  }, []);

  const refreshDashboard = async () => {
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const result = (await response.json()) as DashboardData & { error?: string };
    if (!response.ok) throw new Error(result.error || "Unable to refresh dashboard");
    setDashboard(result);
  };

  const updateRequestStatus = async (request: DashboardRequest, status: string) => {
    setUpdatingRequest(request.id);
    setDashboardError("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update request");
      await refreshDashboard();
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Unable to update request");
    } finally {
      setUpdatingRequest("");
    }
  };

  const filteredRequests = (dashboard?.requests ?? []).filter((request) =>
    `${request.id} ${request.student} ${request.campus} ${request.institution ?? ""} ${request.transcriptType ?? ""} ${request.status}`
      .toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!isSupportOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSupportOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSupportOpen]);

  const renderSection = () => {
    switch (activeSection) {
      case "Requests":
        return (
          <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Request</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Campus / recipient</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Update status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((request) => <tr key={request.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">#{request.id}<span className="mt-1 block text-xs font-normal text-slate-500">{formatDate(request.createdAt)}</span></td>
                  <td className="px-4 py-3">{request.student}</td>
                  <td className="px-4 py-3">{request.campus}<span className="mt-1 block text-xs text-slate-500">{request.institution}</span></td>
                  <td className="px-4 py-3">{request.transcriptType ?? "Unknown service"}</td>
                  <td className="px-4 py-3 capitalize">{request.paymentStatus}</td>
                  <td className="px-4 py-3 capitalize">{request.status}</td>
                  <td className="px-4 py-3"><select aria-label={`Update request ${request.id} status`} disabled={updatingRequest === request.id} value={request.status} onChange={(event) => void updateRequestStatus(request, event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:opacity-50"><option value="pending">Pending</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></td>
                </tr>)}
                {!filteredRequests.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">{dashboardError || "No transcript requests match this search."}</td></tr>}
              </tbody>
            </table>
          </div>
        );
      case "Students":
        return (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredRequests.map((request) => <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-slate-900">{request.student}</h3><p className="mt-1 text-sm text-slate-500">{request.campus} · Graduated {request.yearOfGraduation ?? "—"}</p><p className="mt-3 text-xs text-slate-500">Request #{request.id} · <span className="capitalize">{request.status}</span></p></article>)}{!filteredRequests.length && <p className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No applicant records match this search.</p>}</div>
        );
      case "Institutions":
        return (
          <div className="mt-6 grid gap-3 md:grid-cols-2">{Array.from(new Set(filteredRequests.map((request) => request.institution).filter((value): value is string => Boolean(value)))).map((institution) => <article key={institution} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-slate-900">{institution}</h3><p className="mt-2 text-sm text-slate-500">{filteredRequests.filter((request) => request.institution === institution).length} transcript request(s)</p></article>)}{!dashboard?.requests.some((request) => request.institution) && <p className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Recipient institutions from submitted requests will appear here. Partner verification data is not yet configured.</p>}</div>
        );
      case "Payments":
        return (
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Payer</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {(dashboard?.payments ?? []).filter((payment) => `${payment.reference} ${payment.payer} ${payment.status}`.toLowerCase().includes(searchQuery.toLowerCase())).map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{payment.reference}</td>
                    <td className="px-4 py-3">{payment.payer}</td>
                    <td className="px-4 py-3">{formatNaira(payment.amount)}</td>
                    <td className="px-4 py-3 capitalize">{payment.method}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          payment.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : payment.status === "processing"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <span className="capitalize">{payment.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
                {!dashboard?.payments.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No payment records have been recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        );
      case "Reports":
        return (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { title: "Total requests", value: dashboard?.stats.totalRequests ?? 0, detail: "All requests currently stored" },
              { title: "Completed", value: dashboard?.stats.completedRequests ?? 0, detail: "Requests marked complete" },
              { title: "Paid revenue", value: formatNaira(dashboard?.stats.paidRevenue ?? 0), detail: "Sum of verified paid services" },
            ].map((report) => <div key={report.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{report.title}</p><h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{report.value}</h3><p className="mt-2 text-sm text-slate-500">{report.detail}</p></div>)}
          </div>
        );
      case "Settings":
        return (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">Platform settings</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Administrative controls for the TranscriptPoint platform will appear here.</p></section>
        );
      case "Overview":
      default:
        return (
          <>
            {dashboardError && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{dashboardError}</p>}
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total requests", value: dashboard?.stats.totalRequests ?? "—", detail: "All-time requests", tone: "bg-blue-600" },
                { label: "Pending review", value: dashboard?.stats.pendingRequests ?? "—", detail: "Awaiting processing", tone: "bg-amber-500" },
                { label: "Completed", value: dashboard?.stats.completedRequests ?? "—", detail: "Completed requests", tone: "bg-emerald-500" },
                { label: "Paid revenue", value: dashboard ? formatNaira(dashboard.stats.paidRevenue) : "—", detail: "Verified payments", tone: "bg-violet-500" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{stat.detail}</p>
                    </div>
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone} text-sm font-semibold text-white`}>
                      TP
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_1fr]">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Request volume</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">Monthly throughput</h3>
                  </div>
                  <button type="button" onClick={() => void refreshDashboard()} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Refresh</button>
                </div>

                <div className="mt-6 flex h-52 items-end gap-3">
                  {(dashboard?.monthly ?? []).map((item) => (
                    <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-40 w-full items-end justify-center rounded-t-2xl bg-slate-200/80 p-1">
                        <div
                          className="w-full rounded-t-2xl bg-gradient-to-t from-blue-600 via-blue-500 to-cyan-400"
                          style={{ height: `${Math.max(4, (item.count / Math.max(1, ...(dashboard?.monthly.map((month) => month.count) ?? []))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-center text-[10px] font-medium text-slate-500">{item.month}<br />{item.count}</span>
                    </div>
                  ))}
                  {!dashboard?.monthly.length && <p className="m-auto text-sm text-slate-500">Request volume will appear here.</p>}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Service mix</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">Request types</h3>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {(dashboard?.services ?? []).map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600">{item.label} · {item.count}</span>
                        <span className="font-semibold text-slate-900">{formatNaira(item.revenue)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${Math.max(3, (item.count / Math.max(1, ...(dashboard?.services.map((service) => service.count) ?? []))) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Operations</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">Recent transcript requests</h3>
                  </div>
                  <button type="button" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    View all
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Request ID</th>
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Campus</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                          {(dashboard?.requests ?? []).slice(0, 8).map((request) => (
                        <tr key={request.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-900">#{request.id}</td>
                              <td className="px-4 py-3 text-slate-700">{request.student}</td>
                          <td className="px-4 py-3 text-slate-600">{request.campus}</td>
                              <td className="px-4 py-3 text-slate-600">{request.transcriptType ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                request.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : request.status === "processing"
                                    ? "bg-amber-100 text-amber-700"
                                    : request.status === "cancelled"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-sky-100 text-sky-700"
                              }`}
                            >
                              <span className="capitalize">{request.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatDate(request.createdAt)}</td>
                        </tr>
                      ))}
                      {!dashboard?.requests.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No transcript requests yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Tasks</p>
                      <h3 className="mt-1 text-xl font-semibold text-slate-900">Quick actions</h3>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <button type="button" onClick={() => setActiveSection("Requests")} className="flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-blue-50"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" /><span><span className="block font-medium text-slate-800">Requests awaiting review</span><span className="mt-1 block text-sm text-slate-500">{dashboard?.stats.pendingRequests ?? 0} request(s)</span></span></button>
                    <button type="button" onClick={() => setActiveSection("Payments")} className="flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-blue-50"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-600" /><span><span className="block font-medium text-slate-800">Payment reconciliation</span><span className="mt-1 block text-sm text-slate-500">{dashboard?.payments.length ?? 0} payment record(s)</span></span></button>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
                  <p className="text-sm font-medium text-slate-300">Performance</p>
                  <h3 className="mt-1 text-xl font-semibold">Request completion</h3>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-semibold">{dashboard?.stats.totalRequests ? Math.round((dashboard.stats.completedRequests / dashboard.stats.totalRequests) * 100) : 0}</p>
                      <p className="mt-1 text-sm text-slate-300">% completed</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      Live
                    </span>
                  </div>

                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${dashboard?.stats.totalRequests ? (dashboard.stats.completedRequests / dashboard.stats.totalRequests) * 100 : 0}%` }} />
                  </div>
                </section>
              </aside>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-[1600px] gap-6 p-4 lg:p-6">
        <aside className="hidden w-[280px] shrink-0 rounded-[28px] border border-slate-200 bg-[#0f172a] p-5 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.18)] lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-slate-700 pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-bold text-white">
              TP
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                TranscriptPoint
              </p>
              <h1 className="text-lg font-semibold">Admin</h1>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveSection(item)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition ${
                  activeSection === item
                    ? "bg-white/10 font-semibold text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{item}</span>
                {item === "Overview" ? (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-200">
                    Live
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            aria-haspopup="dialog"
            className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-cyan-300" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.75c-1.1 1.08-1.9 1.5-1.9 3.05M12 17.25v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Support
          </button>

          <div className="mt-auto rounded-3xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Operational health</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-3xl font-semibold text-white">96%</span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                +3.1%
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full w-[96%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
            </div>
          </div>
        </aside>

        <main className="flex-1 rounded-[28px] border border-slate-200 bg-white/70 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {sectionMeta[activeSection].subheading}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                {sectionMeta[activeSection].heading}
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current">
                  <circle cx="11" cy="11" r="6" strokeWidth="1.8" />
                  <path d="M16 16L21 21" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span className="sr-only">Search dashboard data</span>
                <input aria-label="Search dashboard data" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search requests, people…" className="w-40 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500 sm:w-56" />
              </label>
              <Link href="/request" className="rounded-2xl bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800">+ New request</Link>
            </div>
          </header>

          {renderSection()}
        </main>
      </div>

      {isSupportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsSupportOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-support-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,.28)]"
          >
            <div className="relative overflow-hidden bg-[#0f172a] px-6 py-7 text-white sm:px-8">
              <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
              <div className="relative flex items-start justify-between gap-5">
                <div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-200" aria-hidden="true">?</span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[.2em] text-cyan-200">TranscriptPoint admin</p>
                  <h2 id="admin-support-title" className="mt-2 text-2xl font-semibold tracking-tight">How can we help?</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">Find a dashboard workflow or get guidance from the TranscriptPoint assistant.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSupportOpen(false)}
                  aria-label="Close support dialog"
                  className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Quick links</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {([
                    { label: "Request queue", detail: "Review requests", section: "Requests" },
                    { label: "Payments", detail: "Check transactions", section: "Payments" },
                    { label: "Institutions", detail: "View partners", section: "Institutions" },
                  ] as const).map((item) => (
                    <button
                      key={item.section}
                      type="button"
                      onClick={() => {
                        setActiveSection(item.section);
                        setIsSupportOpen(false);
                      }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/60"
                    >
                      <span className="block text-sm font-semibold text-slate-800">{item.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{item.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-slate-900">Ask the AI assistant</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">Get help with transcript services, delivery options, and the request process.</p>
                <Link
                  href="/assistant"
                  onClick={() => setIsSupportOpen(false)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Open assistant <span aria-hidden="true">→</span>
                </Link>
              </div>

              <p className="text-center text-xs leading-5 text-slate-500">Choose a quick link to jump straight to that admin section.</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
