import { redirect } from "next/navigation";
import UserDashboard from "../components/user-dashboard";
import { getCurrentUser, roleDashboardPath } from "../lib/auth";

export default async function UserDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fdashboard");
  if (user.role !== "user") redirect(roleDashboardPath(user.role));
  return <UserDashboard initialUser={user} />;
}
