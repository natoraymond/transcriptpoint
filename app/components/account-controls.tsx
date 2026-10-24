"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = { fullName: string; role: string; dashboardHref: string; avatarUrl?: string | null };

export default function AccountControls({ fullName, role, dashboardHref, avatarUrl }: Props) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/sign-in");
      router.refresh();
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to change password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice(result.message || "Password changed successfully.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <Link href={dashboardHref} className="flex items-center gap-2 text-right">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName}
            className="h-8 w-8 rounded-full border border-slate-200 object-cover shadow-sm"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm">
            {initials}
          </span>
        )}
        <div className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-xs font-semibold text-slate-800">{fullName}</span>
          <span className="block text-[10px] uppercase tracking-[.16em] text-slate-500">
            {role.replaceAll("_", " ")}
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => {
          setIsPasswordDialogOpen(true);
          setPasswordError("");
          setPasswordNotice("");
        }}
        className="rounded-xl border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:px-3"
      >
        <span className="hidden sm:inline">Password</span>
        <span className="sm:hidden text-[11px]">Pass</span>
      </button>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={isSigningOut}
        className="rounded-xl border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:px-3"
      >
        {isSigningOut ? (
          "…"
        ) : (
          <>
            <span className="hidden sm:inline">Sign out</span>
            <span className="sm:hidden text-[11px]">Exit</span>
          </>
        )}
      </button>

      {isPasswordDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsPasswordDialogOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="change-password-title" className="text-xl font-semibold text-slate-950">
                  Change Password
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Choose a new secure password of at least 9 characters.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close password dialog"
                onClick={() => setIsPasswordDialogOpen(false)}
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={changePassword} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  className="form-input mt-1.5"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                New password (min 9 characters)
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={9}
                  maxLength={200}
                  className="form-input mt-1.5"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={9}
                  maxLength={200}
                  className="form-input mt-1.5"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </label>
              {passwordError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {passwordError}
                </p>
              )}
              {passwordNotice && (
                <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  {passwordNotice}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordDialogOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="rounded-xl bg-[#173c5c] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#12314a] disabled:opacity-50"
                >
                  {isChangingPassword ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
