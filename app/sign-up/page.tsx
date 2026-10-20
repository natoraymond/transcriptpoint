import { redirect } from "next/navigation";
import AuthForm from "../components/auth-form";
import { getCurrentUser, roleDashboardPath } from "../lib/auth";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect(roleDashboardPath(user.role));
  return <AuthForm mode="sign-up" />;
}
