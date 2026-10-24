"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import SuperAdminAuthModal from "./super-admin-auth-modal";
import UniversalNavbar from "./universal-navbar";

type Props = { mode: "sign-in" | "sign-up"; next?: string; verification?: string };

export default function AuthForm({ mode, next, verification }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignUp = mode === "sign-up";

  const initialRoleParam = searchParams.get("role");
  const isTargetingAdmin = next?.includes("admin") || initialRoleParam === "admin";

  const [role, setRole] = useState<"user" | "admin">(isTargetingAdmin ? "admin" : "user");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${isSignUp ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(isSignUp ? { fullName, role } : {}),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        signInNotificationSent?: boolean;
        user?: { role: "user" | "admin" | "super_admin"; fullName?: string };
      };

      if (!response.ok) {
        throw new Error(result.error || "Authentication failed");
      }

      // If user is logged in immediately
      if (result.user) {
        const defaultDestination =
          result.user.role === "super_admin"
            ? "/super-admin"
            : result.user.role === "admin"
              ? "/admin"
              : "/dashboard";

        const requestedDestination = next;
        let safeDestination = defaultDestination;
        if (requestedDestination?.startsWith("/") && !requestedDestination.startsWith("//")) {
          const parsedDestination = new URL(requestedDestination, window.location.origin);
          if (parsedDestination.origin === window.location.origin) {
            safeDestination = `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`;
          }
        }
        router.push(safeDestination);
        router.refresh();
        return;
      }

      if (isSignUp && result.message) {
        setNotice(result.message);
        setIsSubmitting(false);
        return;
      }

      throw new Error("Unable to complete authentication");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed");
      setIsSubmitting(false);
    }
  };

  const signInUrl = next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";
  const signUpUrl = next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up";

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_#dbeafe,_#f1f5f9_55%)]">
      <UniversalNavbar
        pageTitle={isSignUp ? "Create Account" : "Sign In"}
        badge={isTargetingAdmin ? "Admin Portal" : undefined}
        theme="white"
      />
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <section className="w-full max-w-md rounded-[28px] border border-white bg-white/90 p-7 shadow-[0_24px_80px_rgba(15,23,42,.12)] backdrop-blur sm:p-9">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xs font-bold uppercase tracking-[.22em] text-blue-800">
              TranscriptPoint
            </Link>
            {isTargetingAdmin && (
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Admin Portal
              </span>
            )}
          </div>

        {/* Tab switch between Sign In and Sign Up */}
        <div className="mt-6 flex rounded-xl bg-slate-100 p-1">
          <Link
            href={signInUrl}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition ${
              !isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Sign In
          </Link>
          <Link
            href={signUpUrl}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition ${
              isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Create Account
          </Link>
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {isSignUp
            ? "Create an account to access transcript processing, request tracking, and the portal."
            : "Sign in to access your role-specific dashboard and transcript operations."}
        </p>

        {!isSignUp && verification && (
          <p
            role="status"
            className={`mt-4 rounded-xl border p-3 text-sm ${
              verification === "invalid" || verification === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {verification === "invalid"
              ? "This verification link is invalid or expired. Please create a new account or contact support."
              : verification === "error"
                ? "We could not verify your email right now. Please try the link again."
                : "Email verified. Sign in to continue."}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Account Type
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("user")}
                  className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition ${
                    role === "user"
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/30"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xs font-bold">Student / User</span>
                  <span className="text-[10px] text-slate-500">Track &amp; request records</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition ${
                    role === "admin"
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xs font-bold">Administrator</span>
                  <span className={`text-[10px] ${role === "admin" ? "text-slate-300" : "text-slate-500"}`}>
                    Full admin dashboard access
                  </span>
                </button>

                {/* Super Admin option that triggers pop-up and security notification */}
                <button
                  type="button"
                  onClick={() => setIsSuperAdminModalOpen(true)}
                  className="col-span-full flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 text-left text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔒</span>
                    <div>
                      <span className="font-bold">Super Admin (System Control)</span>
                      <span className="block text-[10px] text-rose-600">Restricted to Super Admin account only</span>
                    </div>
                  </div>
                  <span className="rounded-lg bg-rose-200/80 px-2 py-0.5 text-[10px] font-bold text-rose-900">Sign in required</span>
                </button>
              </div>
            </div>
          )}

          {isSignUp && (
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="form-input mt-2"
                autoComplete="name"
                maxLength={120}
                placeholder="e.g. Jane Doe"
                required
              />
            </label>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="form-input mt-2"
              autoComplete="email"
              placeholder="name@example.com"
              required
            />
          </label>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              {!isSignUp && (
                <Link href="/forgot-password" className="text-xs font-semibold text-blue-800 hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="form-input pr-16"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={isSignUp ? 9 : undefined}
                maxLength={200}
                placeholder="•••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-600 hover:text-slate-950"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {isSignUp && (
            <p className="text-xs text-slate-500">
              Use at least 9 characters.{" "}
              {role === "admin"
                ? "Admin accounts grant immediate access to the full Admin Dashboard."
                : "Personal accounts allow tracking your transcript applications."}
            </p>
          )}

          {notice && (
            <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#173c5c] px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#12314a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Please wait…"
              : isSignUp
                ? role === "admin"
                  ? "Create Admin Account & Sign In"
                  : "Create Account"
                : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {isSignUp ? "Already have an account?" : "New to TranscriptPoint?"}{" "}
          <Link href={isSignUp ? signInUrl : signUpUrl} className="font-semibold text-blue-800 hover:underline">
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>

      {/* Super Admin Sign-in Pop-up Modal */}
      <SuperAdminAuthModal
        isOpen={isSuperAdminModalOpen}
        onClose={() => setIsSuperAdminModalOpen(false)}
        triggerContext="Visitor clicked on the Super Admin role option during registration"
      />
    </main>
  </div>
  );
}
