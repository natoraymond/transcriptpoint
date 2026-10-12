"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";

export default function AgentDashboardPage() {
  const { isLoaded, user } = useUser();
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Agent";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">TranscriptPoint · Agent portal</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome, {isLoaded ? displayName : "…"}</h1>
            <p className="mt-2 text-sm text-slate-300">Your personal workspace and account details.</p>
          </div>
          <UserButton />
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Account status</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">Your access is managed by the TranscriptPoint Super Admin.</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Your profile</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{displayName}</p>
            <p className="mt-1 text-sm text-slate-600">{user?.primaryEmailAddress?.emailAddress ?? ""}</p>
            <Link href="/agent/profile" className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">View and update profile</Link>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Assigned transcript requests</p>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">Your request queue</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">No requests are currently assigned to your account. Requests and transactions will appear here when they are assigned to you.</p>
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">This workspace only shows information associated with your signed-in account. For account access changes, contact the Super Admin.</p>
        </section>
      </div>
    </main>
  );
}
