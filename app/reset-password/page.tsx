"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import UniversalNavbar from "../components/universal-navbar";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 9) {
      setError("Password must be at least 9 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Unable to reset password");
      }

      setNotice(result.message || "Your password has been reset successfully.");
      setTimeout(() => {
        router.push("/sign-in");
      }, 2500);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No password reset token was provided or the link is invalid.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block w-full rounded-xl bg-slate-900 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  return (
    <>
      {notice ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Success!</p>
            <p className="mt-1">{notice}</p>
            <p className="mt-2 text-xs text-emerald-600">Redirecting you to sign in…</p>
          </div>
          <Link
            href="/sign-in"
            className="inline-block w-full rounded-xl bg-slate-900 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sign in now
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            New password
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="form-input pr-16"
                autoComplete="new-password"
                minLength={9}
                maxLength={200}
                required
                placeholder="At least 9 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-600 hover:text-slate-950"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Confirm new password
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="form-input mt-2"
              autoComplete="new-password"
              minLength={9}
              maxLength={200}
              required
              placeholder="Re-enter password"
            />
          </label>

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
            {isSubmitting ? "Updating password…" : "Reset password"}
          </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_#dbeafe,_#f1f5f9_55%)]">
      <UniversalNavbar pageTitle="Set Password" badge="Security" theme="white" />
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <section className="w-full max-w-md rounded-[28px] border border-white bg-white/90 p-7 shadow-[0_24px_80px_rgba(15,23,42,.12)] backdrop-blur sm:p-9">
          <Link href="/" className="text-xs font-bold uppercase tracking-[.22em] text-blue-800">
            TranscriptPoint
          </Link>
          <h1 className="mt-7 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Set new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter and confirm your new secure password.
          </p>

          <div className="mt-6">
            <Suspense fallback={<p className="text-center text-sm text-slate-500">Loading reset verification…</p>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </section>
      </main>
    </div>
  );
}
