import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccountControls from "../components/account-controls";
import { getCurrentUser } from "../lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fadmin");
  if (user.role === "user") redirect("/dashboard");

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
        <Link href="/admin" className="text-xs font-bold uppercase tracking-[.2em] text-slate-700">TranscriptPoint Admin</Link>
        <AccountControls fullName={user.fullName} role={user.role} dashboardHref="/admin" />
      </div>
      {children}
    </>
  );
}
