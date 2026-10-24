import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=%2Fadmin");
  }

  // If signed in as regular user, present a clean access screen with functioning sign-in/sign-up buttons
  if (user.role === "user") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-current" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.01" />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            Administrator Access Required
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            You are currently signed in as <span className="font-semibold text-slate-900">{user.fullName}</span> ({user.email}) with a standard user account. An administrator account is required to access the Admin Dashboard.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-in?next=%2Fadmin"
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Sign in as Admin
            </Link>
            <Link
              href="/sign-up?role=admin&next=%2Fadmin"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Create Admin Account
            </Link>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-700 hover:underline">
              ← Return to your personal user dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
