"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import SuperAdminAuthModal from "./super-admin-auth-modal";
import UniversalNavbar from "./universal-navbar";

type Props = {
  mode: "sign-in" | "sign-up";
  next?: string;
  verification?: string;
  expired?: boolean;
};

export default function AuthForm({ mode, next, verification, expired }: Props) {
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

  // OTP Verification State
  const [showOtpView, setShowOtpView] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");

  const handleAuthSuccess = (user: { role: "user" | "admin" | "super_admin"; fullName?: string }) => {
    const defaultDestination =
      user.role === "super_admin"
        ? "/super-admin"
        : user.role === "admin"
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
  };

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
        requiresOtp?: boolean;
        email?: string;
        signInNotificationSent?: boolean;
        user?: { role: "user" | "admin" | "super_admin"; fullName?: string };
      };

      if (!response.ok) {
        if (result.requiresOtp) {
          setOtpEmail(result.email || email);
          setShowOtpView(true);
          setNotice(result.error || "Please verify your email address with the 6-digit code.");
          setIsSubmitting(false);
          return;
        }
        throw new Error(result.error || "Authentication failed");
      }

      // If registration requested OTP verification
      if (result.requiresOtp) {
        setOtpEmail(result.email || email);
        setShowOtpView(true);
        setNotice(result.message || "A 6-digit code was sent to your email.");
        setIsSubmitting(false);
        return;
      }

      // If user is logged in immediately
      if (result.user) {
        handleAuthSuccess(result.user);
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

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsVerifyingOtp(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpEmail,
          otp: otpCode.trim(),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        user?: { role: "user" | "admin" | "super_admin"; fullName?: string };
      };

      if (!response.ok) {
        throw new Error(result.error || "Failed to verify code");
      }

      if (result.user) {
        handleAuthSuccess(result.user);
        return;
      }

      throw new Error("Unable to complete email verification");
    } catch (otpErr) {
      setError(otpErr instanceof Error ? otpErr.message : "Verification failed");
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setNotice("");
    setIsResendingOtp(true);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(result.error || "Unable to resend code");
      }
      setNotice(result.message || "A new 6-digit verification code has been sent to your email.");
    } catch (resendErr) {
      setError(resendErr instanceof Error ? resendErr.message : "Unable to resend code");
    } finally {
      setIsResendingOtp(false);
    }
  };

  const signInUrl = next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";
  const signUpUrl = next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up";

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_#dbeafe,_#f1f5f9_55%)]">
      <UniversalNavbar
        pageTitle={showOtpView ? "Verify Email" : isSignUp ? "Create Account" : "Sign In"}
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

          {/* OTP Verification Form View */}
          {showOtpView ? (
            <div className="mt-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                Verify your email address
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                We have sent a 6-digit verification code to <span className="font-semibold text-slate-900">{otpEmail}</span>. Enter the code below to confirm ownership and access your account.
              </p>

              {notice && (
                <p role="status" className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                  {notice}
                </p>
              )}

              {error && (
                <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </p>
              )}

              <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="form-input mt-2 text-center text-2xl font-mono tracking-[0.3em] py-3 font-bold"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                  className="w-full rounded-xl bg-[#173c5c] px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#12314a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifyingOtp ? "Verifying code…" : "Verify Code & Continue"}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp}
                  className="font-semibold text-blue-800 hover:underline disabled:opacity-50"
                >
                  {isResendingOtp ? "Sending code…" : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpView(false);
                    setError("");
                    setNotice("");
                  }}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab switch between Sign In and Sign Up */}
              <div className="mt-6 flex rounded-xl bg-slate-100 p-1">
                <Link
                  href={signInUrl}
                  className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition ${!isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  Sign In
                </Link>
                <Link
                  href={signUpUrl}
                  className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition ${isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
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

              {!isSignUp && (expired || searchParams.get("expired") === "true") && (
                <div
                  role="status"
                  className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-sm text-amber-900"
                >
                  <span className="text-lg">⏳</span>
                  <div>
                    <p className="font-semibold text-amber-900">Session expired</p>
                    <p className="text-xs text-amber-800">
                      You were logged out after a period of inactivity. Please sign in again to continue.
                    </p>
                  </div>
                </div>
              )}

              {!isSignUp && verification && (
                <p
                  role="status"
                  className={`mt-4 rounded-xl border p-3 text-sm ${verification === "invalid" || verification === "error"
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
                        className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition ${role === "user"
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
                        className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition ${role === "admin"
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
                    maxLength={254}
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
                    Use at least 9 characters. A 6-digit OTP code will be sent to verify your email.
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
                      ? "Create Account & Get Verification Code"
                      : "Sign In"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600">
                {isSignUp ? "Already have an account?" : "New to TranscriptPoint?"}{" "}
                <Link href={isSignUp ? signInUrl : signUpUrl} className="font-semibold text-blue-800 hover:underline">
                  {isSignUp ? "Sign in" : "Create an account"}
                </Link>
              </p>

              <div className="mt-5 border-t border-slate-100 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setIsSuperAdminModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-slate-800"
                >
                  <span>🔒 Super Admin Sign In</span>
                </button>
              </div>
            </>
          )}
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
