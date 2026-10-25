"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import RoleAuthModal from "./role-auth-modal";

type AuthUser = {
  fullName: string;
  role: "user" | "admin" | "super_admin";
  avatarUrl?: string | null;
  email?: string;
};

type Props = {
  /** Optional custom title or section name for page context */
  pageTitle?: string;
  /** Optional contextual badge (e.g. "Admin Portal", "Personal Workspace") */
  badge?: string;
  /** Custom links to append or highlight in the navbar */
  extraLinks?: Array<{ label: string; href: string }>;
  /** Theme style: "emerald" for public/landing, "slate" for dashboards/admin, "clean" for auth */
  theme?: "emerald" | "slate" | "white";
};

export default function UniversalNavbar({
  pageTitle,
  badge,
  extraLinks = [],
  theme = "white",
}: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { user?: AuthUser | null }) => {
        if (isMounted) setUser(data.user ?? null);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingAuth(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Check if we should hide Super Admin details (e.g. on /request or /dashboard for users)
  const isRequestPage = pathname === "/request";
  const isUserDashboardPage = pathname === "/dashboard";
  // On /request or /dashboard, never display Super Admin details or avatar
  const isSuperAdmin = user?.role === "super_admin";
  const shouldHideUser = isSuperAdmin && (isRequestPage || isUserDashboardPage);
  const activeDisplayUser = shouldHideUser ? null : user;

  const dashboardHref =
    activeDisplayUser?.role === "super_admin"
      ? "/super-admin"
      : activeDisplayUser?.role === "admin"
      ? "/admin"
      : "/dashboard";

  const getDashboardLabel = () => {
    if (!activeDisplayUser) return "Dashboard";
    if (activeDisplayUser.role === "super_admin") return "Super Admin";
    if (activeDisplayUser.role === "admin") return "Admin Portal";
    return "My Dashboard";
  };

  // Nav link styles based on active status
  const navLinkClass = (href: string) => {
    const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
    return `text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
      isActive
        ? "bg-slate-900/10 text-slate-950 font-semibold"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`;
  };

  const mobileNavLinkClass = (href: string) => {
    const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
    return `flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-slate-900 text-white"
        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
    }`;
  };

  const themeContainerStyles = {
    white: "border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm",
    slate: "border-b border-slate-800 bg-[#0f172a] text-white shadow-md",
    emerald: "border-b border-[#dce5d7] bg-[#f8f8f5]/95 backdrop-blur-md text-[#142a27]",
  }[theme];

  return (
    <header className={`sticky top-0 z-40 w-full transition-all ${themeContainerStyles}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-8 lg:px-12">
        {/* Brand Logo & Context Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3" aria-label="TranscriptPoint Home">
            <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-[12px] sm:rounded-[14px] bg-[#173d35] text-white shadow-md shadow-[#173d35]/20">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M6 3.75h8l4 4v12.5H6a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 4v4h4M8 12h8M8 15.5h6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className={`text-[17px] font-bold tracking-[-0.03em] ${theme === "slate" ? "text-white" : "text-[#142a27]"}`}>
                Transcript<span className="text-[#64923e]">Point</span>
              </span>
              {pageTitle && (
                <span className={`text-[10px] font-medium uppercase tracking-wider ${theme === "slate" ? "text-slate-400" : "text-slate-500"}`}>
                  {pageTitle}
                </span>
              )}
            </div>
          </Link>

          {badge && (
            <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
              theme === "slate" ? "bg-slate-800 text-cyan-300 border border-slate-700" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}>
              {badge}
            </span>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1.5 md:flex" aria-label="Desktop primary navigation">
          <Link href="/" className={navLinkClass("/")}>
            Home
          </Link>
          <Link href="/request" className={navLinkClass("/request")}>
            New Request
          </Link>
          <Link href="/assistant" className={navLinkClass("/assistant")}>
            Chat with Support
          </Link>
          {extraLinks.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Right Actions (Auth / Dashboard CTA) */}
        <div className="hidden items-center gap-3 md:flex">
          {!isLoadingAuth && activeDisplayUser ? (
            <div className="flex items-center gap-3">
              <Link
                href={dashboardHref}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                {activeDisplayUser.avatarUrl ? (
                  <img src={activeDisplayUser.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#173d35] text-[10px] text-white font-bold">
                    {activeDisplayUser.fullName?.charAt(0) || "U"}
                  </span>
                )}
                <span className="max-w-[120px] truncate">{activeDisplayUser.fullName || getDashboardLabel()}</span>
              </Link>
              <Link
                href="/request"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#173d35] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#173d35]/20 transition hover:bg-[#22574b]"
              >
                <span>Request</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#173c5c] transition hover:bg-slate-100"
              >
                Sign in
              </button>
              <Link
                href="/request"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#173d35] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#173d35]/20 transition hover:bg-[#22574b]"
              >
                <span>Get started</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Icon Button */}
        <div className="flex items-center gap-2 md:hidden">
          {activeDisplayUser && (
            <Link
              href={dashboardHref}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden"
              aria-label="View user dashboard"
            >
              {activeDisplayUser.avatarUrl ? (
                <img src={activeDisplayUser.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-slate-700">
                  {activeDisplayUser.fullName?.charAt(0) || "U"}
                </span>
              )}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border p-2 transition shadow-sm ${
              theme === "slate"
                ? "border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Slide-Down Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200/80 bg-white/98 p-4 shadow-2xl backdrop-blur-xl md:hidden">
          <nav className="flex flex-col space-y-1.5" aria-label="Mobile navigation menu">
            <Link href="/" className={mobileNavLinkClass("/")}>
              <span className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                <span>Home</span>
              </span>
              <span className="text-xs text-slate-400">→</span>
            </Link>

            <Link href="/request" className={mobileNavLinkClass("/request")}>
              <span className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span>New Transcript Request</span>
              </span>
              <span className="text-xs text-slate-400">→</span>
            </Link>

            <Link href="/assistant" className={mobileNavLinkClass("/assistant")}>
              <span className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-.75-.805 4.887 4.887 0 0 0 .762-2.31C3.87 16.402 3 14.316 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
                <span>Chat with Support</span>
              </span>
              <span className="text-xs text-slate-400">→</span>
            </Link>

            {extraLinks.map((link) => (
              <Link key={link.href} href={link.href} className={mobileNavLinkClass(link.href)}>
                <span>{link.label}</span>
                <span className="text-xs text-slate-400">→</span>
              </Link>
            ))}

            <div className="my-2 border-t border-slate-100 pt-2">
              {activeDisplayUser ? (
                <div className="space-y-1.5">
                  <Link href={dashboardHref} className={mobileNavLinkClass(dashboardHref)}>
                    <span className="flex items-center gap-2.5">
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-13.5 18v-2.25Z" />
                      </svg>
                      <span>{getDashboardLabel()}</span>
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] uppercase font-bold text-slate-600">
                      {activeDisplayUser.role}
                    </span>
                  </Link>

                  {activeDisplayUser.role === "admin" && (
                    <Link href="/admin/users" className={mobileNavLinkClass("/admin/users")}>
                      <span>User Directory</span>
                      <span className="text-xs text-slate-400">→</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="flex items-center justify-center rounded-xl bg-[#173d35] py-2.5 text-xs font-semibold text-white shadow transition hover:bg-[#22574b]"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Role-Based Authentication Pop-up Form Modal */}
      <RoleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialRole="user"
      />
    </header>
  );
}
