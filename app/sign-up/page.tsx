import { redirect } from "next/navigation";
import AuthForm from "../components/auth-form";
import { getCurrentUser, roleDashboardPath } from "../lib/auth";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[]; role?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  const resolvedParams = searchParams ? await searchParams : {};
  const nextValue = resolvedParams.next;
  const next = Array.isArray(nextValue) ? nextValue[0] : nextValue;

  if (user) {
    const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : roleDashboardPath(user.role);
    redirect(destination);
  }

  return <AuthForm mode="sign-up" next={next} />;
}
