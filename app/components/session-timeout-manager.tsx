"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

// Configuration: 15 minutes total inactivity, warn at 2 minutes remaining (13 minutes idle)
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_WINDOW_MS = 2 * 60 * 1000; // 2 minutes countdown

export default function SessionTimeoutManager() {
  const router = useRouter();
  const pathname = usePathname();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(WARNING_WINDOW_MS / 1000));
  const [isExtending, setIsExtending] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef<boolean>(false);

  // Check initial authentication status & re-check when route changes
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const authed = !!data?.user?.id;
        setIsAuthenticated(authed);
        if (authed) {
          lastActivityRef.current = Date.now();
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [pathname, checkAuth]);

  // Logout handler
  const performLogout = useCallback(async (isExpired: boolean = true) => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    setShowWarning(false);
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Auto-logout request failed:", err);
    } finally {
      setIsAuthenticated(false);
      isLoggingOutRef.current = false;
      const destination = isExpired ? "/sign-in?expired=true" : "/sign-in";
      router.push(destination);
      router.refresh();
    }
  }, [router]);

  // Extend session handler (user clicked "Stay Logged In")
  const extendSession = useCallback(async () => {
    setIsExtending(true);
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        lastActivityRef.current = Date.now();
        setShowWarning(false);
        setSecondsRemaining(Math.floor(WARNING_WINDOW_MS / 1000));
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      } else {
        // If refresh failed because session is already gone
        await performLogout(true);
      }
    } catch {
      setShowWarning(false);
    } finally {
      setIsExtending(false);
    }
  }, [performLogout]);

  // Track user activity
  const recordActivity = useCallback(() => {
    // If warning is already showing, user must explicitly click "Stay Logged In"
    if (showWarning) return;
    lastActivityRef.current = Date.now();
  }, [showWarning]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Events to monitor user activity
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => recordActivity();

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Inactivity checking interval
    checkIntervalRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      const timeLeft = DEFAULT_TIMEOUT_MS - idleTime;

      if (timeLeft <= 0) {
        // Session timed out completely
        performLogout(true);
      } else if (timeLeft <= WARNING_WINDOW_MS) {
        // Show warning modal and update remaining seconds
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.floor(timeLeft / 1000)));
      } else {
        if (showWarning) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isAuthenticated, showWarning, recordActivity, performLogout]);

  // Don't render modal if unauthenticated or not warning
  if (!isAuthenticated || !showWarning) {
    return null;
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      aria-describedby="session-warning-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-200/60 bg-white p-6 shadow-2xl transition-all sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.75"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>

          <div className="flex-1">
            <h3
              id="session-warning-title"
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              Session Expiration Warning
            </h3>
            <p
              id="session-warning-desc"
              className="mt-2 text-sm leading-relaxed text-slate-600"
            >
              Your session has been inactive and will expire in{" "}
              <span className="font-semibold tabular-nums text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                {formatCountdown(secondsRemaining)}
              </span>
              . For your security, you will be automatically logged out. Any unsaved request details are protected.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => performLogout(false)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-auto"
          >
            Log Out Now
          </button>
          <button
            type="button"
            onClick={extendSession}
            disabled={isExtending}
            className="w-full rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 disabled:opacity-60 sm:w-auto"
          >
            {isExtending ? "Extending Session..." : "Stay Logged In"}
          </button>
        </div>
      </div>
    </div>
  );
}

