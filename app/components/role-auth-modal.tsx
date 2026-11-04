"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import SuperAdminAuthModal from "./super-admin-auth-modal";

type RoleType = "user" | "admin" | "super_admin";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: RoleType;
  initialMode?: "sign-in" | "sign-up";
  next?: string;
};

export default function RoleAuthModal({
  isOpen,
  onClose,
  initialRole = "user",
  initialMode = "sign-in",
  next,
}: Props) {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<RoleType>(
    initialRole === "super_admin" ? "admin" : initialRole,
  );
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">(initialMode);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Verification state
  const [showOtpView, setShowOtpView] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");

  if (!isOpen) return null;

  const handleRoleSelect = (role: RoleType) => {
    setError("");
    setNotice("");
    if (role === "super_admin") {
      setIsSuperAdminModalOpen(true);
      return;
    }
    setSelectedRole(role);
  };

  const handleAuthSuccess = (user: { role: "user" | "admin" | "super_admin"; fullName?: string }) => {
    // Enforce role consistency if signing in under a specific role selection
    if (selectedRole === "admin" && user.role === "user") {
      throw new Error(
        "This account is registered as a Student/User. Please select 'Student / User' or sign in with an Administrator account.",
      );
    }

    const defaultDestination =
      user.role === "super_admin"
        ? "/super-admin"
        : user.role === "admin"
        ? "/admin"
        : "/dashboard";

    const requestedDestination = next;
    let safeDestination = defaultDestination;
    if (requestedDestination?.startsWith("/") && !requestedDestination.startsWith("//")) {
      const parsed = new URL(requestedDestination, window.location.origin);
      if (parsed.origin === window.location.origin) {
        safeDestination = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    }

    onClose();
    router.push(safeDestination);
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (authMode === "sign-up" && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = authMode === "sign-up" ? "/api/auth/register" : "/api/auth/login";
      const payload: Record<string, string> = {
        email: email.trim(),
        password,
      };

      if (authMode === "sign-up") {
        payload.fullName = fullName.trim();
        payload.role = selectedRole;
        payload.confirmPassword = confirmPassword;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        error?: string;
        message?: string;
        requiresOtp?: boolean;
        email?: string;
        user?: { role: "user" | "admin" | "super_admin"; fullName?: string };
      };

      if (!response.ok) {
        if (result.requiresOtp) {
          setOtpEmail(result.email || email.trim());
          setShowOtpView(true);
          setNotice(result.error || "Please verify your email address with the 6-digit code.");
          setIsSubmitting(false);
          return;
        }
        throw new Error(result.error || "Authentication failed. Please verify your details.");
      }

      if (result.requiresOtp) {
        setOtpEmail(result.email || email.trim());
        setShowOtpView(true);
        setNotice(result.message || "A 6-digit code was sent to your email.");
        setIsSubmitting(false);
        return;
      }

      if (result.user) {
        handleAuthSuccess(result.user);
        return;
      }

      if (authMode === "sign-up" && result.message) {
        setNotice(result.message);
        setIsSubmitting(false);
        return;
      }

      throw new Error("Unable to complete authentication");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
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

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-auth-title"
      >
        <section
          className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-2xl sm:p-7"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#173c5c]">
                TranscriptPoint Portal
              </p>
              <h2 id="role-auth-title" className="text-lg font-bold tracking-tight text-slate-900">
                {showOtpView
                  ? "Verify Email"
                  : authMode === "sign-in"
                  ? "Sign in to your account"
                  : "Create new account"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          {showOtpView ? (
            <div className="mt-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>

              <h3 className="mt-3 text-base font-bold text-slate-950">
                Enter your verification code
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{otpEmail}</span>.
              </p>

              {notice && (
                <p role="status" className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800">
                  {notice}
                </p>
              )}

              {error && (
                <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {error}
                </p>
              )}

              <form onSubmit={handleVerifyOtp} className="mt-4 space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="form-input text-center text-xl font-mono tracking-[0.25em] py-2.5 font-bold"
                  required
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                  className="w-full rounded-xl bg-[#173c5c] py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-[#12314a] disabled:opacity-60"
                >
                  {isVerifyingOtp ? "Verifying…" : "Confirm Code & Continue"}
                </button>
              </form>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp}
                  className="font-semibold text-blue-700 hover:underline disabled:opacity-50"
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
                  Back to form
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Role Selection Tabs */}
              <div className="mt-3">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Select Portal Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* User / Student Role */}
                  <button
                    type="button"
                    onClick={() => handleRoleSelect("user")}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                      selectedRole === "user"
                        ? "border-[#173d35] bg-[#173d35]/10 text-[#173d35] ring-2 ring-[#173d35]/30 font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs">
                      <span>🎓</span>
                      <span>Student / User</span>
                    </div>
                    <span className="mt-0.5 text-[10px] text-slate-500 leading-tight">
                      For students &amp; alumni to request &amp; track records.
                    </span>
                  </button>

                  {/* Admin Role */}
                  <button
                    type="button"
                    onClick={() => handleRoleSelect("admin")}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                      selectedRole === "admin"
                        ? "border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900/30 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs">
                      <span>💼</span>
                      <span>Administrator</span>
                    </div>
                    <span className={`mt-0.5 text-[10px] leading-tight ${selectedRole === "admin" ? "text-slate-300" : "text-slate-500"}`}>
                      Process requests &amp; operations.
                    </span>
                  </button>
                </div>

                {/* Super Admin Tile */}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect("super_admin")}
                    className="flex w-full items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-left transition hover:bg-rose-100/90"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-500 text-white text-[10px] font-bold">
                        🔒
                      </span>
                      <div>
                        <span className="block text-[11px] font-bold text-rose-950">Super Admin (System Control)</span>
                        <span className="block text-[10px] text-rose-700">Strictly isolated — opens security prompt</span>
                      </div>
                    </div>
                    <span className="rounded-md bg-rose-200/90 px-2 py-0.5 text-[9px] font-bold text-rose-950">
                      Prompt ↗
                    </span>
                  </button>
                </div>
              </div>

              {/* Toggle between Sign In & Sign Up for User and Admin */}
              <div className="mt-3.5 flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("sign-in");
                    setError("");
                    setNotice("");
                  }}
                  className={`flex-1 rounded-md py-1 text-center text-xs font-semibold transition ${
                    authMode === "sign-in" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("sign-up");
                    setError("");
                    setNotice("");
                  }}
                  className={`flex-1 rounded-md py-1 text-center text-xs font-semibold transition ${
                    authMode === "sign-up" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Status / Notices */}
              {notice && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                  {notice}
                </div>
              )}
              {error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                {authMode === "sign-up" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      maxLength={120}
                      className="form-input mt-1 py-2 text-xs"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    maxLength={254}
                    className="form-input mt-1 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                    {authMode === "sign-in" && (
                      <Link
                        href="/forgot-password"
                        onClick={onClose}
                        className="text-[10px] font-semibold text-blue-700 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 9 characters"
                      className="form-input py-2 pr-12 text-xs"
                      minLength={9}
                      maxLength={200}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {authMode === "sign-up" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="form-input py-2 pr-12 text-xs"
                        minLength={9}
                        maxLength={200}
                        required
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full rounded-xl py-2.5 text-xs font-semibold text-white shadow-md transition disabled:opacity-60 ${
                    selectedRole === "admin"
                      ? "bg-slate-900 hover:bg-slate-800"
                      : "bg-[#173d35] hover:bg-[#22574b]"
                  }`}
                >
                  {isSubmitting
                    ? "Verifying details…"
                    : authMode === "sign-up"
                    ? `Create ${selectedRole === "admin" ? "Admin" : "Student"} Account & Get OTP`
                    : `Sign In as ${selectedRole === "admin" ? "Administrator" : "Student / User"}`}
                </button>
              </form>

              <div className="mt-3 border-t border-slate-100 pt-2 text-center">
                <span className="text-[11px] text-slate-500">
                  {authMode === "sign-in" ? "Need an account?" : "Already registered?"}{" "}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in");
                    setError("");
                    setNotice("");
                  }}
                  className="text-[11px] font-bold text-blue-700 hover:underline"
                >
                  {authMode === "sign-in" ? "Create one here" : "Sign in here"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Super Admin Isolated Modal */}
      <SuperAdminAuthModal
        isOpen={isSuperAdminModalOpen}
        onClose={() => setIsSuperAdminModalOpen(false)}
        triggerContext="Visitor clicked on the Super Admin role from the sign in pop-up modal"
      />
    </>
  );
}
