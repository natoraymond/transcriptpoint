"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import SuperAdminAuthModal from "./super-admin-auth-modal";

type RoleType = "user" | "admin" | "super_admin";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: "user" | "admin" | "super_admin";
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
  const [selectedRole, setSelectedRole] = useState<RoleType>(initialRole);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">(initialMode);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
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
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        error?: string;
        message?: string;
        user?: { role: "user" | "admin" | "super_admin"; fullName?: string };
      };

      if (!response.ok) {
        throw new Error(result.error || "Authentication failed. Please verify your details.");
      }

      if (result.user) {
        // Enforce role consistency if signing in under a specific role selection
        if (selectedRole === "admin" && result.user.role === "user") {
          throw new Error(
            "This account is registered as a Student/User. Please select 'Student / User' or sign in with an Administrator account.",
          );
        }

        const defaultDestination =
          result.user.role === "super_admin"
            ? "/super-admin"
            : result.user.role === "admin"
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
          {/* Header Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 text-xs"
          >
            ✕
          </button>

          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#173d35] text-white shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#173d35]">
              TranscriptPoint Portal
            </span>
          </div>

          <h2 id="role-auth-title" className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {authMode === "sign-in" ? "Sign In to Your Account" : "Create Your Account"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Select your role to access your personalized workspace.
          </p>

          {/* Role selector tiles */}
          <div className="mt-3.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Select Your Role <span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {/* User / Student Role */}
              <button
                type="button"
                onClick={() => handleRoleSelect("user")}
                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                  selectedRole === "user"
                    ? "border-blue-600 bg-blue-50/80 text-blue-950 ring-2 ring-blue-500/30 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <span>🎓</span>
                  <span>User / Student / Alumni</span>
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
              Sign In ({selectedRole === "admin" ? "Admin" : "User"})
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
              Create Account ({selectedRole === "admin" ? "Admin" : "User"})
            </button>
          </div>

          {/* Error & Notice messages */}
          {error && (
            <div role="alert" className="mt-2.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
              {notice}
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="mt-3 space-y-2.5">
            {authMode === "sign-up" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="form-input mt-1 py-2 text-xs"
                  maxLength={120}
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
                ? `Create ${selectedRole === "admin" ? "Admin" : "Student"} Account`
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
