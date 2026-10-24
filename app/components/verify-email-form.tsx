"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import UniversalNavbar from "./universal-navbar";

export default function VerifyEmailForm({ token, purpose }: { token: string; purpose: "verify" | "setup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const verify = async () => {
    setError("");
    if (purpose === "setup") {
      if (password.length < 9 || password.length > 200) {
        setError("Choose a password with at least 9 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("The passwords do not match.");
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json() as { error?: string; role?: "user" | "admin" | "super_admin" };
      if (!response.ok) throw new Error(result.error || "Unable to verify email");
      const destination = result.role === "super_admin" ? "/super-admin" : result.role === "admin" ? "/admin" : "/dashboard";
      router.replace(`${destination}?verified=1`);
      router.refresh();
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Unable to verify email");
      setIsSubmitting(false);
    }
  };
  const tokenIsValid = /^[a-f0-9]{64}$/i.test(token);
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <UniversalNavbar pageTitle="Email Verification" badge="Security" theme="white" />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-700">TranscriptPoint</p>
          <h1 className="mt-4 text-2xl font-semibold text-slate-950">Verify your email</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Confirm that you own this email address{purpose === "setup" ? " and set a strong password" : ""} to activate your account. This link can only be used once.</p>
          {tokenIsValid && purpose === "setup" && <div className="mt-5 space-y-3 text-left"><label className="block text-sm font-medium text-slate-700">Password<input type="password" autoComplete="new-password" minLength={9} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} className="form-input mt-2" required /></label><label className="block text-sm font-medium text-slate-700">Confirm password<input type="password" autoComplete="new-password" minLength={9} maxLength={200} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="form-input mt-2" required /></label></div>}
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {tokenIsValid ? <button type="button" onClick={() => void verify()} disabled={isSubmitting} className="mt-6 w-full rounded-xl bg-[#173c5c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#12314a] disabled:opacity-50">{isSubmitting ? "Verifying…" : "Verify email and continue"}</button> : <p className="mt-5 text-sm text-red-700">This verification link is invalid.</p>}
          <Link href="/sign-in" className="mt-5 inline-block text-sm font-semibold text-blue-800 hover:underline">Back to sign in</Link>
        </section>
      </main>
    </div>
  );
}
