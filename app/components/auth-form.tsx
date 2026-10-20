"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = { mode: "sign-in" | "sign-up"; next?: string; verification?: string };

export default function AuthForm({ mode, next, verification }: Props) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${isSignUp ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(isSignUp ? { fullName } : {}) }),
      });
      const result = await response.json() as { error?: string; message?: string; signInNotificationSent?: boolean; user?: { role: "user" | "admin" | "super_admin" } };
      if (isSignUp && response.ok) {
        setNotice(result.message ?? "Account created. Check your email for a verification link before signing in.");
        setIsSubmitting(false);
        return;
      }
      if (!response.ok || !result.user) throw new Error(result.error || "Authentication failed");
      const destination = result.user.role === "super_admin" ? "/super-admin" : result.user.role === "admin" ? "/admin" : "/dashboard";
      const requestedDestination = next;
      let safeDestination = destination;
      if (requestedDestination?.startsWith("/") && !requestedDestination.startsWith("//")) {
        const parsedDestination = new URL(requestedDestination, window.location.origin);
        if (parsedDestination.origin === window.location.origin) {
          safeDestination = `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`;
        }
      }
      router.push(safeDestination);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#dbeafe,_#f1f5f9_55%)] px-4 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-white bg-white/90 p-7 shadow-[0_24px_80px_rgba(15,23,42,.12)] backdrop-blur sm:p-9">
        <Link href="/" className="text-xs font-bold uppercase tracking-[.22em] text-blue-800">TranscriptPoint</Link>
        <h1 className="mt-7 text-3xl font-semibold tracking-tight text-slate-950">{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{isSignUp ? "Create a personal account to manage your profile and track transcript requests." : "Sign in to continue to your role-specific workspace."}</p>
        {!isSignUp && verification && <p role="status" className={`mt-4 rounded-xl border p-3 text-sm ${verification === "invalid" || verification === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{verification === "invalid" ? "This verification link is invalid or expired. Please create a new account or contact support." : verification === "error" ? "We could not verify your email right now. Please try the link again." : "Email verified. Sign in to continue."}</p>}
        <form onSubmit={submit} className="mt-7 space-y-4">
          {isSignUp && <label className="block text-sm font-medium text-slate-700">Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="form-input mt-2" autoComplete="name" maxLength={120} required /></label>}
          <label className="block text-sm font-medium text-slate-700">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-input mt-2" autoComplete="email" required /></label>
          <label className="block text-sm font-medium text-slate-700">Password<div className="relative mt-2"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="form-input pr-16" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={isSignUp ? 9 : undefined} maxLength={200} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-600 hover:text-slate-950" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div></label>
          {isSignUp && <p className="text-xs text-slate-500">Use at least 9 characters. New accounts are created with the User role.</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[#173c5c] px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#12314a] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">{isSignUp ? "Already have an account?" : "New to TranscriptPoint?"} <Link href={isSignUp ? "/sign-in" : "/sign-up"} className="font-semibold text-blue-800 hover:underline">{isSignUp ? "Sign in" : "Create an account"}</Link></p>
      </section>
    </main>
  );
}
