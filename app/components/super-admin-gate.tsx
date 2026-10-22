"use client";

import Link from "next/link";
import { useState } from "react";
import SuperAdminAuthModal from "./super-admin-auth-modal";

export default function SuperAdminGate({ currentUserRole }: { currentUserRole: string | null }) {
  const [isModalOpen, setIsModalOpen] = useState(true);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-8 text-center text-white shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 stroke-current" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
          Super Admin Restricted Area
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          No other roles have access to the Super Admin&apos;s account. A security notification email was dispatched to the Super Admin.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400"
          >
            Are you the Super Admin? Sign in here
          </button>

          {currentUserRole === "admin" ? (
            <Link
              href="/admin"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              Return to Admin Dashboard
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              Return to User Dashboard
            </Link>
          )}
        </div>
      </div>

      <SuperAdminAuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        triggerContext="Someone navigated directly to the Super Admin restricted page (/super-admin)"
      />
    </main>
  );
}
