"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";

const navigationItems = [
  "Overview",
  "Requests",
  "Students",
  "Institutions",
  "Payments",
  "Users",
  "Reports",
  "Settings",
] as const;

type NavItem = (typeof navigationItems)[number];

type DashboardRequest = {
  id: string;
  student: string;
  campus: string;
  transcriptType: string | null;
  status: string;
  paymentStatus: string;
  createdAt: string;
  institution?: string;
  yearOfGraduation?: number;
};
type DashboardPayment = {
  id: string;
  reference: string;
  payer: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
};
type DashboardData = {
  stats: { totalRequests: number; pendingRequests: number; completedRequests: number; paidRevenue: number };
  requests: DashboardRequest[];
  payments: DashboardPayment[];
  monthly: Array<{ month: string; count: number }>;
  services: Array<{ label: string; count: number; revenue: number }>;
};

type PortalUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: string;
};

const sectionMeta: Record<NavItem, { heading: string; subheading: string }> = {
  Overview: { heading: "Overview", subheading: "Dashboard overview" },
  Requests: { heading: "Requests", subheading: "Request queue" },
  Students: { heading: "Students", subheading: "Student records" },
  Institutions: { heading: "Institutions", subheading: "Partner institutions" },
  Payments: { heading: "Payments", subheading: "Transaction overview" },
  Users: { heading: "Users", subheading: "User directory & access" },
  Reports: { heading: "Reports", subheading: "Performance and analytics" },
  Settings: { heading: "Settings", subheading: "Administrative controls" },
};

const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export default function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState<NavItem>("Overview");
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingRequest, setUpdatingRequest] = useState("");
  const [currentRole, setCurrentRole] = useState("admin");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    fullName: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
  } | null>(null);

  // Quick account creation state
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [newAccountRole, setNewAccountRole] = useState<"admin" | "user">("admin");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createAccountNotice, setCreateAccountNotice] = useState("");
  const [createAccountError, setCreateAccountError] = useState("");

  // Profile & Avatar upload state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");

  // Change password inside profile modal
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Users tab state
  const [usersList, setUsersList] = useState<PortalUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = (await response.json()) as { users?: PortalUser[]; error?: string };
      if (response.ok && result.users) {
        setUsersList(result.users);
      }
    } catch {
      // ignore
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { user?: { fullName: string; email: string; role: string; permissions: string[]; avatarUrl?: string | null } }) => {
        if (isMounted && result.user) {
          setCurrentUser(result.user);
          setAvatarPreview(result.user.avatarUrl ?? null);
          setCurrentRole(result.user.role);
          setPermissions(result.user.permissions ?? []);
        }
      })
      .catch(() => {});

    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const result = (await response.json()) as DashboardData & { error?: string };
        if (!response.ok) throw new Error(result.error || "Unable to load dashboard data");
        if (isMounted) {
          setDashboard(result);
          setDashboardError("");
        }
      } catch (error) {
        if (isMounted) setDashboardError(error instanceof Error ? error.message : "Unable to load dashboard data");
      }
    };

    void loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeSection === "Users") {
      void loadUsers();
    }
  }, [activeSection]);

  const hasAccess = (permission: string) =>
    currentRole === "super_admin" || currentRole === "admin" || permissions.includes(permission);

  // All admins and super admins have full visibility into dashboard sections
  const visibleNavigationItems = navigationItems.filter((item) => {
    if (currentRole === "super_admin" || currentRole === "admin") return true;
    if (item === "Overview" || item === "Reports") return hasAccess("dashboard.read");
    if (["Requests", "Students", "Institutions"].includes(item)) return hasAccess("requests.read");
    if (item === "Payments") return hasAccess("payments.read");
    if (item === "Users") return hasAccess("users.read");
    return false;
  });

  const refreshDashboard = async () => {
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const result = (await response.json()) as DashboardData & { error?: string };
    if (!response.ok) throw new Error(result.error || "Unable to refresh dashboard");
    setDashboard(result);
  };

  const updateRequestStatus = async (request: DashboardRequest, status: string) => {
    setUpdatingRequest(request.id);
    setDashboardError("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update request");
      await refreshDashboard();
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Unable to update request");
    } finally {
      setUpdatingRequest("");
    }
  };

  const handleCreateAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingAccount(true);
    setCreateAccountError("");
    setCreateAccountNotice("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newAccountName,
          email: newAccountEmail,
          password: newAccountPassword,
          role: newAccountRole,
        }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to create account");

      setCreateAccountNotice(
        result.message ||
          `${newAccountRole === "admin" ? "Administrator" : "User"} account created successfully with immediate login access! An email notification has been dispatched.`,
      );
      setNewAccountName("");
      setNewAccountEmail("");
      setNewAccountPassword("");
      await loadUsers();
    } catch (error) {
      setCreateAccountError(error instanceof Error ? error.message : "Unable to create account");
    } finally {
      setCreatingAccount(false);
    }
  };

  // Avatar Image Upload with client-side canvas compression to max 300x300
  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setProfileError("Please choose an image under 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setAvatarPreview(dataUrl);
        setProfileError("");
        setProfileNotice("Photo selected! Click 'Save Photo' to apply.");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    setSavingProfile(true);
    setProfileNotice("");
    setProfileError("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: avatarPreview }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save profile picture");

      setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: avatarPreview } : null));
      setProfileNotice("Profile picture updated successfully!");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Unable to save profile picture");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setSavingProfile(true);
    setProfileNotice("");
    setProfileError("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to remove profile picture");

      setAvatarPreview(null);
      setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: null } : null));
      setProfileNotice("Profile picture removed.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Unable to remove profile picture");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordNotice("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 9) {
      setPasswordError("New password must be at least 9 characters.");
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update password");

      setPasswordNotice(result.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Unable to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = currentUser?.fullName
    ? currentUser.fullName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AD";

  const filteredRequests = (dashboard?.requests ?? []).filter((request) =>
    `${request.id} ${request.student} ${request.campus} ${request.institution ?? ""} ${request.transcriptType ?? ""} ${request.status}`
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!isSupportOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSupportOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSupportOpen]);

  const renderSection = () => {
    switch (activeSection) {
      case "Requests":
        return (
          <div className="mt-6">
            {/* Mobile card view (visible on xs/sm screens) */}
            <div className="space-y-3 md:hidden">
              {filteredRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900">#{request.id}</span>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDate(request.createdAt)}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                        request.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : request.status === "processing"
                            ? "bg-amber-100 text-amber-700"
                            : request.status === "cancelled"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <p>
                      <strong className="text-slate-700">Student:</strong> {request.student}
                    </p>
                    <p>
                      <strong className="text-slate-700">Campus:</strong> {request.campus}
                      {request.institution ? ` · ${request.institution}` : ""}
                    </p>
                    <p>
                      <strong className="text-slate-700">Service:</strong> {request.transcriptType ?? "Unknown service"}
                    </p>
                    <p>
                      <strong className="text-slate-700">Payment:</strong>{" "}
                      <span className="capitalize">{request.paymentStatus}</span>
                    </p>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs font-medium text-slate-500">Update status:</span>
                    <select
                      aria-label={`Update request ${request.id} status`}
                      disabled={!hasAccess("requests.update") || updatingRequest === request.id}
                      value={request.status}
                      onChange={(event) => void updateRequestStatus(request, event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs disabled:opacity-50"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
              {!filteredRequests.length && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  {dashboardError || "No transcript requests match this search."}
                </div>
              )}
            </div>

            {/* Desktop / tablet table view */}
            <div className="hidden overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Request</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Campus / recipient</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Update status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        #{request.id}
                        <span className="mt-1 block text-xs font-normal text-slate-500">
                          {formatDate(request.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{request.student}</td>
                      <td className="px-4 py-3">
                        {request.campus}
                        <span className="mt-1 block text-xs text-slate-500">{request.institution}</span>
                      </td>
                      <td className="px-4 py-3">{request.transcriptType ?? "Unknown service"}</td>
                      <td className="px-4 py-3 capitalize">{request.paymentStatus}</td>
                      <td className="px-4 py-3 capitalize">{request.status}</td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Update request ${request.id} status`}
                          disabled={!hasAccess("requests.update") || updatingRequest === request.id}
                          value={request.status}
                          onChange={(event) => void updateRequestStatus(request, event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {!filteredRequests.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        {dashboardError || "No transcript requests match this search."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "Students":
        return (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredRequests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900">{request.student}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {request.campus} · Graduated {request.yearOfGraduation ?? "—"}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Request #{request.id} · <span className="capitalize">{request.status}</span>
                </p>
              </article>
            ))}
            {!filteredRequests.length && (
              <p className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No applicant records match this search.
              </p>
            )}
          </div>
        );

      case "Institutions":
        return (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {Array.from(
              new Set(
                filteredRequests.map((request) => request.institution).filter((value): value is string => Boolean(value)),
              ),
            ).map((institution) => (
              <article key={institution} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900">{institution}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {filteredRequests.filter((request) => request.institution === institution).length} transcript request(s)
                </p>
              </article>
            ))}
            {!dashboard?.requests.some((request) => request.institution) && (
              <p className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Recipient institutions from submitted requests will appear here.
              </p>
            )}
          </div>
        );

      case "Payments": {
        const filteredPayments = (dashboard?.payments ?? []).filter((payment) =>
          `${payment.reference} ${payment.payer} ${payment.status}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        );

        return (
          <div className="mt-6">
            {/* Mobile cards view */}
            <div className="space-y-3 md:hidden">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{payment.payer}</p>
                      <p className="font-mono text-xs text-slate-500">{payment.reference}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                        payment.status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : payment.status === "processing"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">Method: <strong className="capitalize text-slate-700">{payment.method}</strong></span>
                    <span className="text-sm font-bold text-slate-900">{formatNaira(payment.amount)}</span>
                  </div>
                </div>
              ))}
              {!filteredPayments.length && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No payment records found.
                </div>
              )}
            </div>

            {/* Desktop / tablet table view */}
            <div className="hidden overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Payer</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{payment.reference}</td>
                      <td className="px-4 py-3">{payment.payer}</td>
                      <td className="px-4 py-3">{formatNaira(payment.amount)}</td>
                      <td className="px-4 py-3 capitalize">{payment.method}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            payment.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : payment.status === "processing"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          <span className="capitalize">{payment.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!filteredPayments.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                        No payment records have been recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case "Users":
        return (
          <div className="mt-6 space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">User directory &amp; access control</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Create administrator accounts with immediate sign-in credentials, or manage registered users.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateAccountNotice("");
                      setCreateAccountError("");
                      setIsCreateAccountOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-slate-800"
                  >
                    + Create Admin / User
                  </button>
                  <Link
                    href="/admin/users"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Manage Users Table →
                  </Link>
                </div>
              </div>

              {/* Mobile card preview */}
              <div className="mt-6 space-y-3 sm:hidden">
                {usersList.slice(0, 8).map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.fullName} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                          {u.fullName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">{u.fullName}</p>
                        <p className="truncate text-[11px] text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        u.role === "super_admin"
                          ? "bg-purple-100 text-purple-700"
                          : u.role === "admin"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {u.role.replaceAll("_", " ")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Desktop / tablet user table preview */}
              <div className="mt-6 hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Photo</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.slice(0, 10).map((u) => (
                      <tr key={u.id}>
                        <td className="px-4 py-3">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.fullName} className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                              {u.fullName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{u.fullName}</td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              u.role === "super_admin"
                                ? "bg-purple-100 text-purple-700"
                                : u.role === "admin"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {u.role.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${u.isActive ? "text-emerald-700" : "text-rose-700"}`}>
                            {u.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {!usersLoading && usersList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No users loaded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        );

      case "Reports":
        return (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Total requests",
                value: dashboard?.stats.totalRequests ?? 0,
                detail: "All requests currently stored",
              },
              {
                title: "Completed",
                value: dashboard?.stats.completedRequests ?? 0,
                detail: "Requests marked complete",
              },
              {
                title: "Paid revenue",
                value: formatNaira(dashboard?.stats.paidRevenue ?? 0),
                detail: "Sum of verified paid services",
              },
            ].map((report) => (
              <div key={report.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{report.title}</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{report.value}</h3>
                <p className="mt-2 text-sm text-slate-500">{report.detail}</p>
              </div>
            ))}
          </div>
        );

      case "Settings":
        return (
          <div className="mt-6 space-y-6">
            {/* Administrator Profile Card */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {currentUser?.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      className="h-16 w-16 rounded-full border-2 border-slate-200 object-cover shadow"
                    />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-bold text-white shadow">
                      {initials}
                    </span>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{currentUser?.fullName || "Administrator"}</h3>
                    <p className="text-sm text-slate-500">{currentUser?.email}</p>
                    <span className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-800 capitalize">
                      {currentRole.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileNotice("");
                      setProfileError("");
                      setPasswordNotice("");
                      setPasswordError("");
                      setIsProfileModalOpen(true);
                    }}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-slate-800"
                  >
                    Edit Profile &amp; Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileNotice("");
                      setProfileError("");
                      setPasswordNotice("");
                      setPasswordError("");
                      setIsProfileModalOpen(true);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </section>

            {/* Platform Settings Grid */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h3 className="text-lg font-semibold text-slate-900">Platform status &amp; controls</h3>
              <p className="mt-1 text-sm text-slate-500">Operational configuration for TranscriptPoint.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">System Status</p>
                  <p className="mt-2 font-bold text-emerald-700">Online &amp; Operational</p>
                  <p className="mt-1 text-xs text-slate-500">Database connected &amp; synced</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">User Provisioning</p>
                  <p className="mt-2 font-bold text-slate-900">Direct Admin Sign-in Enabled</p>
                  <p className="mt-1 text-xs text-slate-500">New admins get instant dashboard access</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Password Reset</p>
                  <p className="mt-2 font-bold text-slate-900">Email Recovery Active</p>
                  <p className="mt-1 text-xs text-slate-500">Users can reset forgotten passwords</p>
                </div>
              </div>
            </section>
          </div>
        );

      case "Overview":
      default:
        return (
          <>
            {dashboardError && (
              <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {dashboardError}
              </p>
            )}
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total requests",
                  value: dashboard?.stats.totalRequests ?? "—",
                  detail: "All-time requests",
                  tone: "bg-blue-600",
                },
                {
                  label: "Pending review",
                  value: dashboard?.stats.pendingRequests ?? "—",
                  detail: "Awaiting processing",
                  tone: "bg-amber-500",
                },
                {
                  label: "Completed",
                  value: dashboard?.stats.completedRequests ?? "—",
                  detail: "Completed requests",
                  tone: "bg-emerald-500",
                },
                {
                  label: "Paid revenue",
                  value: dashboard ? formatNaira(dashboard.stats.paidRevenue) : "—",
                  detail: "Verified payments",
                  tone: "bg-violet-500",
                },
              ].map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{stat.detail}</p>
                    </div>
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone} text-sm font-semibold text-white`}
                    >
                      TP
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_1fr]">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Request volume</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">Monthly throughput</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshDashboard()}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-6 flex h-52 items-end gap-3">
                  {(dashboard?.monthly ?? []).map((item) => (
                    <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-40 w-full items-end justify-center rounded-t-2xl bg-slate-200/80 p-1">
                        <div
                          className="w-full rounded-t-2xl bg-gradient-to-t from-blue-600 via-blue-500 to-cyan-400"
                          style={{
                            height: `${Math.max(
                              4,
                              (item.count / Math.max(1, ...(dashboard?.monthly.map((month) => month.count) ?? []))) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-center text-[10px] font-medium text-slate-500">
                        {item.month}
                        <br />
                        {item.count}
                      </span>
                    </div>
                  ))}
                  {!dashboard?.monthly.length && (
                    <p className="m-auto text-sm text-slate-500">Request volume will appear here.</p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Service mix</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">Request types</h3>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {(dashboard?.services ?? []).map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600">
                          {item.label} · {item.count}
                        </span>
                        <span className="font-semibold text-slate-900">{formatNaira(item.revenue)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{
                            width: `${Math.max(
                              3,
                              (item.count / Math.max(1, ...(dashboard?.services.map((service) => service.count) ?? []))) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Operations</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">Recent transcript requests</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("Requests")}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View all
                  </button>
                </div>

                {/* Mobile view for recent requests */}
                <div className="mt-4 space-y-2.5 sm:hidden">
                  {(dashboard?.requests ?? []).slice(0, 5).map((request) => (
                    <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">#{request.id}</span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            request.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : request.status === "processing"
                                ? "bg-amber-100 text-amber-700"
                                : request.status === "cancelled"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-slate-800">{request.student}</p>
                      <p className="text-[11px] text-slate-500">
                        {request.campus} · {request.transcriptType ?? "Transcript"}
                      </p>
                    </div>
                  ))}
                  {!dashboard?.requests.length && (
                    <p className="p-4 text-center text-xs text-slate-500">No transcript requests yet.</p>
                  )}
                </div>

                {/* Tablet / Desktop table view */}
                <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Request ID</th>
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Campus</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {(dashboard?.requests ?? []).slice(0, 8).map((request) => (
                        <tr key={request.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">#{request.id}</td>
                          <td className="px-4 py-3 text-slate-700">{request.student}</td>
                          <td className="px-4 py-3 text-slate-600">{request.campus}</td>
                          <td className="px-4 py-3 text-slate-600">{request.transcriptType ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                request.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : request.status === "processing"
                                    ? "bg-amber-100 text-amber-700"
                                    : request.status === "cancelled"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-sky-100 text-sky-700"
                              }`}
                            >
                              <span className="capitalize">{request.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatDate(request.createdAt)}</td>
                        </tr>
                      ))}
                      {!dashboard?.requests.length && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                            No transcript requests yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Tasks</p>
                      <h3 className="mt-1 text-xl font-semibold text-slate-900">Quick actions</h3>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => setActiveSection("Requests")}
                      className="flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-blue-50"
                    >
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                      <span>
                        <span className="block font-medium text-slate-800">Requests awaiting review</span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {dashboard?.stats.pendingRequests ?? 0} request(s)
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection("Payments")}
                      className="flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-blue-50"
                    >
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-600" />
                      <span>
                        <span className="block font-medium text-slate-800">Payment reconciliation</span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {dashboard?.payments.length ?? 0} payment record(s)
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateAccountNotice("");
                        setCreateAccountError("");
                        setIsCreateAccountOpen(true);
                      }}
                      className="flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-blue-50"
                    >
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-600" />
                      <span>
                        <span className="block font-medium text-slate-800">+ Provision New Administrator</span>
                        <span className="mt-1 block text-sm text-slate-500">Create an admin account with immediate login</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileNotice("");
                        setProfileError("");
                        setPasswordNotice("");
                        setPasswordError("");
                        setIsProfileModalOpen(true);
                      }}
                      className="flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-blue-50"
                    >
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-600" />
                      <span>
                        <span className="block font-medium text-slate-800">Edit Profile &amp; Photo</span>
                        <span className="mt-1 block text-sm text-slate-500">Upload profile picture or change password</span>
                      </span>
                    </button>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
                  <p className="text-sm font-medium text-slate-300">Performance</p>
                  <h3 className="mt-1 text-xl font-semibold">Request completion</h3>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-semibold">
                        {dashboard?.stats.totalRequests
                          ? Math.round((dashboard.stats.completedRequests / dashboard.stats.totalRequests) * 100)
                          : 0}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">% completed</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      Live
                    </span>
                  </div>

                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                      style={{
                        width: `${
                          dashboard?.stats.totalRequests
                            ? (dashboard.stats.completedRequests / dashboard.stats.totalRequests) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </section>
              </aside>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
        {/* Mobile Navigation bar with sticky scrolling and support button */}
        <div className="flex items-center gap-2 lg:hidden">
          <nav
            aria-label="Admin dashboard navigation"
            className="flex flex-1 items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-800 bg-[#0f172a] p-1.5 scrollbar-none shadow-md"
          >
            {visibleNavigationItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveSection(item)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  activeSection === item ? "bg-white/20 text-white shadow" : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            aria-label="Support"
            className="shrink-0 rounded-2xl border border-slate-800 bg-[#0f172a] p-2.5 text-cyan-300 shadow-md transition hover:bg-slate-800"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.75c-1.1 1.08-1.9 1.5-1.9 3.05M12 17.25v.1" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <aside className="hidden w-[280px] shrink-0 rounded-[28px] border border-slate-200 bg-[#0f172a] p-5 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.18)] lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-slate-700 pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-bold text-white">
              TP
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">TranscriptPoint</p>
              <h1 className="text-lg font-semibold">Admin</h1>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {visibleNavigationItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveSection(item)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition ${
                  activeSection === item
                    ? "bg-white/10 font-semibold text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{item}</span>
                {item === "Overview" ? (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-200">
                    Live
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            aria-haspopup="dialog"
            className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-cyan-300" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M9.6 9a2.5 2.5 0 1 1 4.3 1.75c-1.1 1.08-1.9 1.5-1.9 3.05M12 17.25v.1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Support
          </button>

          {/* Admin Profile Area in Sidebar */}
          <div className="mt-auto rounded-3xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="flex items-center gap-3">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="h-10 w-10 rounded-full border border-slate-600 object-cover shadow"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow">
                  {initials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{currentUser?.fullName || "Administrator"}</p>
                <p className="truncate text-[10px] text-slate-400">{currentUser?.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2.5">
              <button
                type="button"
                onClick={() => {
                  setProfileNotice("");
                  setProfileError("");
                  setPasswordNotice("");
                  setPasswordError("");
                  setIsProfileModalOpen(true);
                }}
                className="text-[11px] font-medium text-cyan-300 transition hover:text-cyan-200"
              >
                Edit Photo &amp; Password
              </button>
              <Link href="/sign-in" className="text-[11px] text-slate-400 hover:text-white">
                Switch
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex-1 rounded-[28px] border border-slate-200 bg-white/70 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {sectionMeta[activeSection].subheading}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                {sectionMeta[activeSection].heading}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current">
                  <circle cx="11" cy="11" r="6" strokeWidth="1.8" />
                  <path d="M16 16L21 21" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span className="sr-only">Search dashboard data</span>
                <input
                  aria-label="Search dashboard data"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search requests, people…"
                  className="w-32 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500 sm:w-44"
                />
              </label>

              {/* Profile Avatar / Settings Button */}
              <button
                type="button"
                onClick={() => {
                  setProfileNotice("");
                  setProfileError("");
                  setPasswordNotice("");
                  setPasswordError("");
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[9px] text-white">
                    {initials}
                  </span>
                )}
                <span>Profile &amp; Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateAccountNotice("");
                  setCreateAccountError("");
                  setIsCreateAccountOpen(true);
                }}
                className="rounded-2xl bg-slate-900 px-3.5 py-2.5 text-center text-xs font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
              >
                + Sign up admin
              </button>

              <Link
                href="/sign-in?next=%2Fadmin"
                className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-center text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
          </header>

          {createAccountNotice && (
            <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {createAccountNotice}
            </p>
          )}

          {renderSection()}
        </main>
      </div>

      {/* Profile, Photo Upload & Change Password Modal */}
      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsProfileModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white p-7 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 id="profile-modal-title" className="text-xl font-bold text-slate-900">
                  Administrator Profile &amp; Security
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Upload your profile picture and manage your account password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Profile Picture Upload Section */}
            <div className="mt-6 border-b border-slate-100 pb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Profile Picture</h4>
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-20 w-20 rounded-full border-2 border-slate-200 object-cover shadow-md"
                    />
                  ) : (
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-2xl font-bold text-white shadow-md">
                      {initials}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow transition hover:bg-slate-800">
                      Choose Photo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                    </label>

                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleSaveAvatar}
                        disabled={savingProfile}
                        className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingProfile ? "Saving…" : "Save Photo"}
                      </button>
                    )}

                    {currentUser?.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={savingProfile}
                        className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">JPG, PNG, or WebP. Automatically optimized.</p>
                </div>
              </div>

              {profileNotice && (
                <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                  {profileNotice}
                </p>
              )}
              {profileError && (
                <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {profileError}
                </p>
              )}
            </div>

            {/* Change Password Section */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Change Password</h4>
              <p className="mt-1 text-xs text-slate-500">Update your account password with at least 9 characters.</p>

              <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                <label className="block text-xs font-medium text-slate-700">
                  Current Password
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="form-input mt-1"
                    placeholder="•••••••••"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700">
                    New Password (min 9)
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={9}
                      maxLength={200}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="form-input mt-1"
                      placeholder="•••••••••"
                    />
                  </label>

                  <label className="block text-xs font-medium text-slate-700">
                    Confirm Password
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={9}
                      maxLength={200}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="form-input mt-1"
                      placeholder="•••••••••"
                    />
                  </label>
                </div>

                {passwordNotice && (
                  <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                    {passwordNotice}
                  </p>
                )}
                {passwordError && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    {passwordError}
                  </p>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="rounded-xl bg-[#173c5c] px-4 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-[#12314a] disabled:opacity-50"
                  >
                    {savingPassword ? "Updating…" : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* Create Account Modal */}
      {isCreateAccountOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsCreateAccountOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-create-account-title"
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 id="dashboard-create-account-title" className="text-xl font-bold text-slate-900">
                  Create Administrator Account
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Provision an account with immediate sign-in access. An email notification will be sent.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateAccountOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {createAccountError && (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {createAccountError}
              </p>
            )}

            <form onSubmit={handleCreateAccountSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">Role</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAccountRole("admin")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                      newAccountRole === "admin"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Administrator
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAccountRole("user")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                      newAccountRole === "user"
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Standard User
                  </button>
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Full Name
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(event) => setNewAccountName(event.target.value)}
                  className="form-input mt-1.5"
                  required
                  placeholder="e.g. Jane Smith"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Email Address
                <input
                  type="email"
                  value={newAccountEmail}
                  onChange={(event) => setNewAccountEmail(event.target.value)}
                  className="form-input mt-1.5"
                  required
                  placeholder="admin@example.com"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Initial Password (min. 9 characters)
                <input
                  type="password"
                  value={newAccountPassword}
                  onChange={(event) => setNewAccountPassword(event.target.value)}
                  className="form-input mt-1.5"
                  minLength={9}
                  maxLength={200}
                  required
                  placeholder="•••••••••"
                />
              </label>

              <p className="text-xs text-slate-500">
                Once created, the admin receives a confirmation email and can immediately sign in.
              </p>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAccountOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAccount}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {creatingAccount ? "Creating…" : "Create & Authorize"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Support Dialog */}
      {isSupportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsSupportOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-support-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,.28)]"
          >
            <div className="relative overflow-hidden bg-[#0f172a] px-6 py-7 text-white sm:px-8">
              <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
              <div className="relative flex items-start justify-between gap-5">
                <div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-200" aria-hidden="true">
                    ?
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[.2em] text-cyan-200">TranscriptPoint admin</p>
                  <h2 id="admin-support-title" className="mt-2 text-2xl font-semibold tracking-tight">How can we help?</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">Find a dashboard workflow or get guidance from the TranscriptPoint assistant.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSupportOpen(false)}
                  aria-label="Close support dialog"
                  className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Quick links</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {([
                    { label: "Request queue", detail: "Review requests", section: "Requests" },
                    { label: "Payments", detail: "Check transactions", section: "Payments" },
                    { label: "Institutions", detail: "View partners", section: "Institutions" },
                  ] as const).map((item) => (
                    <button
                      key={item.section}
                      type="button"
                      onClick={() => {
                        setActiveSection(item.section);
                        setIsSupportOpen(false);
                      }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/60"
                    >
                      <span className="block text-sm font-semibold text-slate-800">{item.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{item.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-slate-900">Ask the AI assistant</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">Get help with transcript services, delivery options, and the request process.</p>
                <Link
                  href="/assistant"
                  onClick={() => setIsSupportOpen(false)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Open assistant <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
