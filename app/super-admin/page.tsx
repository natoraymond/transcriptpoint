import { redirect } from "next/navigation";
import SuperAdminDashboard from "../components/super-admin-dashboard";
import { getCurrentUser } from "../lib/auth";

export default async function SuperAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fsuper-admin");
  if (user.role !== "super_admin") redirect(user.role === "admin" ? "/admin" : "/dashboard");
  return <SuperAdminDashboard fullName={user.fullName} currentUserId={user.id} />;
}
