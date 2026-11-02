import { redirect } from "next/navigation";
import AuthForm from "../components/auth-form";
import { getCurrentUser, roleDashboardPath } from "../lib/auth";

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const user = await getCurrentUser();
  const { next: nextValue, verification: verificationValue, expired: expiredValue } = await searchParams;
  const next = Array.isArray(nextValue) ? nextValue[0] : nextValue;
  const verification = Array.isArray(verificationValue) ? verificationValue[0] : verificationValue;
  const expired = Array.isArray(expiredValue) ? expiredValue[0] : expiredValue;
  if (user) {
    const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : roleDashboardPath(user.role);
    redirect(destination);
  }
  return <AuthForm mode="sign-in" next={next} verification={verification} expired={expired === "true"} />;
}
