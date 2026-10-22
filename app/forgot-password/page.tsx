"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Unable to send password reset link");
      }

      setNotice(
        result.message ||
          "If an account exists with that email address, a password reset link has been sent. Check your inbox.",
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to process request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#dbeafe,_#f1f5f9_55%)] px-4 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-white bg-white/90 p-7 shadow-[0_24px_80px_rgba(15,23,42,.12)] backdrop-blur sm:p-9">
        <Link href="/" className="text-xs font-bold uppercase tracking-[.22em] text-blue-800">
          TranscriptPoint
        </Link>
        <h1 className="mt-7 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter your email address and we will send you a secure link to reset your password.
        </p>

        {notice ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Reset link sent</p>
              <p className="mt-1">{notice}</p>
            </div>
            <Link
              href="/sign-in"
              className="inline-block w-full rounded-xl bg-slate-900 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="form-input mt-2"
                placeholder="name@example.com"
                required
                autoComplete="email"
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
              {isSubmitting ? "Sending reset link…" : "Send password reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Remember your password?{" "}
          <Link href="/sign-in" className="font-semibold text-blue-800 hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
