"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  triggerContext?: string;
};

export default function SuperAdminAuthModal({ isOpen, onClose, triggerContext }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [alertSent, setAlertSent] = useState(false);

  // Send security alert email to Super Admin as soon as this modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    fetch("/api/auth/super-admin-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: triggerContext || "Someone opened the Super Admin sign-in verification prompt",
      }),
    })
      .then((res) => res.json())
      .then(() => {
        if (isMounted) setAlertSent(true);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen, triggerContext]);

  if (!isOpen) return null;

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as {
        error?: string;
        user?: { role: string; fullName: string };
      };

      if (!response.ok || !result.user) {
        throw new Error(result.error || "Authentication failed");
      }

      if (result.user.role !== "super_admin") {
        throw new Error(
          "Access denied. This account has the role of '" +
            result.user.role +
            "', not Super Admin.",
        );
      }

      // Success - user is Super Admin
      router.push("/super-admin");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in as Super Admin");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="super-admin-auth-title"
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-red-200/50 bg-white p-7 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-current" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-rose-600">
                Restricted Access
              </p>
              <h3 id="super-admin-auth-title" className="text-xl font-bold tracking-tight text-slate-950">
                Super Admin Verification
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Security Alert Banner */}
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs leading-5 text-rose-900">
          <p className="font-semibold text-rose-800">
            🔒 No other roles have access to the Super Admin&apos;s account.
          </p>
          <p className="mt-1">
            {alertSent
              ? "A security notification has just been dispatched to the Super Admin's email stating someone is attempting to access this account."
              : "Dispatched security notification to the Super Admin's email."}
          </p>
          <p className="mt-2 font-medium text-rose-700">
            Are you the Super Admin? Please sign in to verify your identity.
          </p>
        </div>

        <form onSubmit={handleSignIn} className="mt-5 space-y-4">
          <label className="block text-xs font-semibold text-slate-700">
            Super Admin Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input mt-1.5"
              placeholder="superadmin@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Password
            <div className="relative mt-1.5">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input pr-16"
                placeholder="•••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-600 hover:text-slate-950"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-950 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? "Verifying…" : "Sign In as Super Admin"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel &amp; Return
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
