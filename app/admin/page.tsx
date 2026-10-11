"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
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

const stats = [
  { label: "Total requests", value: "1,284", change: "+12.4%", tone: "bg-blue-600" },
  { label: "Pending review", value: "218", change: "+4.1%", tone: "bg-amber-500" },
  { label: "Completed", value: "974", change: "+8.7%", tone: "bg-emerald-500" },
  { label: "Avg. response", value: "2.4d", change: "-0.8d", tone: "bg-violet-500" },
];

const monthlyTrend = [
  { month: "Jan", value: 38 },
  { month: "Feb", value: 52 },
  { month: "Mar", value: 46 },
  { month: "Apr", value: 64 },
  { month: "May", value: 71 },
  { month: "Jun", value: 82 },
  { month: "Jul", value: 76 },
  { month: "Aug", value: 90 },
];

const recentRequests = [
  { id: "TP-2048", name: "Nneka Okafor", campus: "Alvan Ikoku", type: "Official transcript", status: "In review", date: "Today, 09:20" },
  { id: "TP-2041", name: "John Eze", campus: "UNN", type: "Certificate verification", status: "Approved", date: "Today, 08:42" },
  { id: "TP-2037", name: "Grace Adebayo", campus: "Distance Learning", type: "Hardcopy delivery", status: "Queued", date: "Yesterday" },
  { id: "TP-2030", name: "Oluwaseun Bello", campus: "Yaratech", type: "English proficiency", status: "Flagged", date: "Yesterday" },
  { id: "TP-2023", name: "Miriam Umeh", campus: "NOCEN", type: "Student softcopy", status: "Completed", date: "Mon, 14 Jul" },
];

const studentRecords = [
  { name: "Amaka Nnadi", program: "B.Sc. Education", status: "Active", progress: "96%" },
  { name: "Samuel Okoro", program: "M.Ed. Admin", status: "Review", progress: "71%" },
  { name: "Nafisat Bello", program: "PGD Records", status: "Active", progress: "88%" },
  { name: "Daniel Eze", program: "B.A. English", status: "Pending", progress: "62%" },
];

const institutionRecords = [
  { name: "University of Lagos", type: "Verification partner", status: "Verified" },
  { name: "Federal Polytech Yola", type: "Transcript recipient", status: "Pending" },
  { name: "Nnamdi Azikiwe University", type: "Partner campus", status: "Verified" },
  { name: "Ahmadu Bello University", type: "Academic partner", status: "In review" },
];

const paymentRecords = [
  { ref: "INV-4091", amount: "N72,500", payer: "Nneka Okafor", method: "Card", status: "Paid" },
  { ref: "INV-4089", amount: "N29,000", payer: "John Eze", method: "Transfer", status: "Processing" },
  { ref: "INV-4082", amount: "N54,000", payer: "Grace Adebayo", method: "Wallet", status: "Paid" },
  { ref: "INV-4078", amount: "N12,000", payer: "Miriam Umeh", method: "Card", status: "Pending" },
];

const reportCards = [
  { title: "Requests processed", value: "94%", detail: "This week" },
  { title: "Avg. turnaround", value: "2.4 days", detail: "Down from 3.1" },
  { title: "Institution response", value: "87%", detail: "Across partner schools" },
];

const settingsOptions = [
  { label: "Access control", description: "Role permissions and admin access" },
  { label: "Notification rules", description: "Email and SMS triggers" },
  { label: "System preferences", description: "Dashboard, date and locale settings" },
];

const actions = [
  { title: "New transcript request", detail: "18 waiting for admin approval", color: "bg-blue-600" },
  { title: "Institution verification", detail: "6 universities need review", color: "bg-amber-500" },
  { title: "Payment reconciliation", detail: "12 transactions pending", color: "bg-emerald-500" },
];

const serviceBreakdown = [
  { label: "Official transcript", value: 52, amount: "N612k" },
  { label: "Verification", value: 31, amount: "N294k" },
  { label: "Hardcopy", value: 17, amount: "N198k" },
];

const sectionMeta: Record<NavItem, { heading: string; subheading: string }> = {
  Overview: { heading: "Overview", subheading: "Dashboard overview" },
  Requests: { heading: "Requests", subheading: "Request queue" },
  Students: { heading: "Students", subheading: "Student records" },
  Institutions: { heading: "Institutions", subheading: "Partner institutions" },
  Payments: { heading: "Payments", subheading: "Transaction overview" },
  Reports: { heading: "Reports", subheading: "Performance and analytics" },
  Settings: { heading: "Settings", subheading: "Administrative controls" },
};

export default function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState<NavItem>("Overview");
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { isLoaded: isUserLoaded, user } = useUser();
  const isAgent = user?.publicMetadata.role === "agent";

  useEffect(() => {
    if (!isUserLoaded || !isAgent) return;

    void fetch("/api/admin/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "agent_login" }),
    }).catch(() => undefined);
  }, [isAgent, isUserLoaded]);

  useEffect(() => {
    if (!isUserLoaded || !isAgent) return;

    void fetch("/api/admin/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "section_viewed", section: activeSection }),
    }).catch(() => undefined);
  }, [activeSection, isAgent, isUserLoaded]);

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
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentRequests.map((request) => (
                <div key={request.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-500">{request.id}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        request.status === "Approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : request.status === "In review"
                            ? "bg-amber-100 text-amber-700"
                            : request.status === "Flagged"
                              ? "bg-rose-100 text-rose-700"
                              : request.status === "Queued"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">{request.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{request.type}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{request.campus}</span>
                    <span>{request.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "Students":
        return (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {studentRecords.map((student) => (
              <div key={student.name} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{student.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{student.program}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-semibold text-slate-900">{student.progress}</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    style={{ width: student.progress }}
                  />
                </div>
                <div className="mt-4 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {student.status}
                </div>
              </div>
            ))}
          </div>
        );
      case "Institutions":
        return (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {institutionRecords.map((institution) => (
              <div key={institution.name} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{institution.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      institution.status === "Verified"
                        ? "bg-emerald-100 text-emerald-700"
                        : institution.status === "Pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {institution.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{institution.type}</p>
              </div>
            ))}
          </div>
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
                {paymentRecords.map((payment) => (
                  <tr key={payment.ref}>
                    <td className="px-4 py-3 font-medium text-slate-900">{payment.ref}</td>
                    <td className="px-4 py-3">{payment.payer}</td>
                    <td className="px-4 py-3">{payment.amount}</td>
                    <td className="px-4 py-3">{payment.method}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          payment.status === "Paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : payment.status === "Processing"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "Reports":
        return (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reportCards.map((report) => (
              <div key={report.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{report.title}</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{report.value}</h3>
                <p className="mt-2 text-sm text-slate-500">{report.detail}</p>
              </div>
            ))}
          </div>
        );
      case "Settings":
        return (
          <div className="mt-6 space-y-4">
            {settingsOptions.map((setting) => (
              <div key={setting.label} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{setting.label}</h3>
                  <p className="mt-1 text-sm text-slate-600">{setting.description}</p>
                </div>
                <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Configure
                </button>
              </div>
            ))}
          </div>
        );
      case "Overview":
      default:
        return (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                    </div>
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone} text-sm font-semibold text-white`}>
                      {stat.change}
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
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    +18.2%
                  </span>
                </div>

                <div className="mt-6 flex h-52 items-end gap-3">
                  {monthlyTrend.map((item) => (
                    <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-40 w-full items-end justify-center rounded-t-2xl bg-slate-200/80 p-1">
                        <div
                          className="w-full rounded-t-2xl bg-gradient-to-t from-blue-600 via-blue-500 to-cyan-400"
                          style={{ height: `${item.value}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500">{item.month}</span>
                    </div>
                  ))}
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
                  {serviceBreakdown.map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-semibold text-slate-900">{item.amount}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${item.value}%` }}
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
                      {recentRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{request.id}</td>
                          <td className="px-4 py-3 text-slate-700">{request.name}</td>
                          <td className="px-4 py-3 text-slate-600">{request.campus}</td>
                          <td className="px-4 py-3 text-slate-600">{request.type}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                request.status === "Approved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : request.status === "In review"
                                    ? "bg-amber-100 text-amber-700"
                                    : request.status === "Flagged"
                                      ? "bg-rose-100 text-rose-700"
                                      : request.status === "Queued"
                                        ? "bg-sky-100 text-sky-700"
                                        : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {request.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{request.date}</td>
                        </tr>
                      ))}
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
                    {actions.map((action) => (
                      <div key={action.title} className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm">
                        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${action.color}`} />
                        <div>
                          <p className="font-medium text-slate-800">{action.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{action.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
                  <p className="text-sm font-medium text-slate-300">Performance</p>
                  <h3 className="mt-1 text-xl font-semibold">Processing score</h3>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-semibold">89</p>
                      <p className="mt-1 text-sm text-slate-300">/100</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      +6.4%
                    </span>
                  </div>

                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full w-[89%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
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

          <Link
            href="/admin/agents"
            className="mt-5 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <span className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-cyan-300" aria-hidden="true">
                <circle cx="9" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
                <path d="M3.5 19v-1.25A4.75 4.75 0 0 1 8.25 13h1.5a4.75 4.75 0 0 1 4.75 4.75V19M17 8v6M14 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              Agents
            </span>
            <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">Team</span>
          </Link>

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
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current">
                  <circle cx="11" cy="11" r="6" strokeWidth="1.8" />
                  <path d="M16 16L21 21" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Search
              </div>
              <button
                type="button"
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
              >
                + New request
              </button>
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
