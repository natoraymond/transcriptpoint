import SuperAdminDashboard from "../components/super-admin-dashboard";
import SuperAdminGate from "../components/super-admin-gate";
import { getCurrentUser, notifySuperAdminSecurityAlert } from "../lib/auth";

export default async function SuperAdminPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "super_admin") {
    // Notify Super Admin of access attempt
    await notifySuperAdminSecurityAlert({
      attemptedBy: user
        ? `${user.fullName} (${user.email}) [Role: ${user.role}]`
        : "Unauthenticated visitor attempting to access /super-admin",
      action: "Attempted to directly access the Super Admin System Control page",
    });

    return <SuperAdminGate currentUserRole={user?.role ?? null} />;
  }

  return (
    <SuperAdminDashboard
      fullName={user.fullName}
      currentUserId={user.id}
      initialAvatarUrl={user.avatarUrl}
      userEmail={user.email}
    />
  );
}
