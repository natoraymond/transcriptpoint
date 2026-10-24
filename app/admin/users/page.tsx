import { redirect } from "next/navigation";
import AccountControls from "../../components/account-controls";
import UniversalNavbar from "../../components/universal-navbar";
import { getCurrentUser, userHasPermission } from "../../lib/auth";
import AdminUsers from "./users-table";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fadmin%2Fusers");
  if (!userHasPermission(user, "users.read")) redirect("/unauthorized");
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      <UniversalNavbar
        pageTitle="Admin Operations"
        badge="Staff Directory"
        theme="white"
        extraLinks={[
          { label: "Admin Console", href: "/admin" },
          { label: "User Directory", href: "/admin/users" },
        ]}
      />
      <main className="flex-1 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-700">Administration</p><h1 className="mt-2 text-3xl font-semibold">User directory</h1><p className="mt-2 text-sm text-slate-500">View portal accounts. Role and access changes are reserved for the Super Admin.</p></div>
            <AccountControls fullName={user.fullName} role={user.role} dashboardHref="/admin" />
          </header>
        <AdminUsers canManageUsers={userHasPermission(user, "users.update")} />
        </div>
      </main>
    </div>
  );
}
