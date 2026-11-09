"use client";

import { useCallback, useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import AccountControls from "./account-controls";
import UniversalNavbar from "./universal-navbar";

const permissionOptions = [
  { id: "dashboard.read", label: "Dashboard" },
  { id: "requests.read", label: "View requests" },
  { id: "requests.update", label: "Update request status" },
  { id: "payments.read", label: "View payments" },
  { id: "users.read", label: "View users" },
  { id: "users.update", label: "Manage user accounts" },
] as const;
type Role = "user" | "admin" | "super_admin";
type PortalUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  permissions: string[];
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  lastActivityAt: string | null;
};
type PaymentRequestRecord = {
  id: string;
  campus: string;
  transcriptFormat: string;
  transcriptFormatLabel: string | null;
  transcriptCategory: string | null;
  modeOfAdmission: string;
  levelOfStudy: string;
  matriculationNumber: string;
  documentType: string;
  firstName: string;
  otherName: string | null;
  surname: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  monthOfGraduation: string;
  yearOfGraduation: number;
  recipientInstitution: string;
  recipientAddress: string;
  deliveryMethod: "email" | "dhl";
  dhlContinent: string | null;
  dhlCountry: string | null;
  dhlCountryCode: string | null;
  dhlState: string | null;
  dhlDeliveryPriceKobo: number | null;
  referenceNumber: string | null;
  receiverEmail: string;
  status: string;
  paymentStatus: "paid" | "pending" | "failed";
  paymentReference: string | null;
  amount: number;
  transcriptAmount: number;
  createdAt: string;
  updatedAt: string;
};

type SuperAdminData = {
  stats: {
    total: number;
    users: number;
    admins: number;
    superAdmins: number;
    suspended: number;
    totalRequests: number;
    pending: number;
    completed: number;
    paidCount: number;
    paidValue: number;
    totalProducts: number;
    activeProducts: number;
  };
  products: Array<{ value: string; label: string; category: string; amount: number; isActive: boolean; requiresDhl: boolean }>;
  activity: Array<{ id: number; action: string; details: Record<string, unknown>; createdAt: string; actorName: string; actorEmail: string }>;
  paymentRequests?: PaymentRequestRecord[];
};

const defaultAdminPermissions = ["dashboard.read", "requests.read", "requests.update", "payments.read", "users.read", "users.update"];

type Props = {
  fullName: string;
  currentUserId: string;
  initialAvatarUrl?: string | null;
  userEmail?: string;
};

export default function SuperAdminDashboard({
  fullName,
  currentUserId,
  initialAvatarUrl,
  userEmail,
}: Props) {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [monitoring, setMonitoring] = useState<SuperAdminData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("admin");
  const [creating, setCreating] = useState(false);

  // Super Admin profile picture state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState("");
  const [avatarError, setAvatarError] = useState("");

  // Payment requests & detail view state
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "pending">("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<PaymentRequestRecord | null>(null);

  const loadUsers = useCallback(async () => {
    setError("");
    const response = await fetch("/api/super-admin/users", { cache: "no-store" });
    const result = (await response.json()) as { users?: PortalUser[]; error?: string };
    if (!response.ok || !result.users) throw new Error(result.error || "Unable to load accounts");
    setUsers(result.users);

    // Keep current user avatar in sync
    const current = result.users.find((u) => u.id === currentUserId);
    if (current && current.avatarUrl !== undefined) {
      setAvatarUrl(current.avatarUrl);
    }
  }, [currentUserId]);

  const loadMonitoring = useCallback(async () => {
    const response = await fetch("/api/super-admin/dashboard", { cache: "no-store" });
    const result = (await response.json()) as SuperAdminData & { error?: string };
    if (!response.ok || !result.stats) throw new Error(result.error || "Unable to load monitoring data");
    setMonitoring(result);
  }, []);

  useEffect(() => {
    Promise.all([loadUsers(), loadMonitoring()])
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load accounts"))
      .finally(() => setLoading(false));
  }, [loadMonitoring, loadUsers]);

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setAvatarError("Please select an image smaller than 8MB.");
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
        setAvatarError("");
        setAvatarNotice("Photo preview ready. Click 'Save Photo' to apply.");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    setUploadingAvatar(true);
    setAvatarNotice("");
    setAvatarError("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: avatarPreview }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save profile photo");

      setAvatarUrl(avatarPreview);
      setAvatarNotice("Super Admin profile picture updated successfully!");
      await loadUsers();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Unable to save profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    setAvatarNotice("");
    setAvatarError("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to remove profile photo");

      setAvatarPreview(null);
      setAvatarUrl(null);
      setAvatarNotice("Profile picture removed.");
      await loadUsers();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Unable to remove profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const createAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName: name,
          password: password || undefined,
          role: newRole,
          permissions: newRole === "admin" ? defaultAdminPermissions : [],
        }),
      });
      const result = (await response.json()) as { error?: string; message?: string; user?: { invited?: boolean } };
      if (!response.ok) throw new Error(result.error || "Unable to create account");
      setEmail("");
      setName("");
      setPassword("");
      const wasInvited = result.user?.invited;
      setNotice(
        result.message ||
          (wasInvited
            ? `An account setup invitation was sent to ${email}.`
            : `The ${newRole.replace("_", " ")} account was created with immediate login access.`),
      );
      await loadUsers();
      await loadMonitoring();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create account");
    } finally {
      setCreating(false);
    }
  };

  const saveUser = async (
    user: PortalUser,
    changes: Partial<Pick<PortalUser, "role" | "permissions" | "isActive">>,
  ) => {
    setSavingId(user.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...changes }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update user");
      setNotice(`Access updated for ${user.email}.`);
      await loadUsers();
      await loadMonitoring();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update access");
    } finally {
      setSavingId("");
    }
  };

  const filteredUsers = users.filter((user) =>
    `${user.fullName} ${user.email} ${user.role}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const filteredPaymentRequests = (monitoring?.paymentRequests ?? []).filter((req) => {
    if (paymentFilter !== "all" && req.paymentStatus !== paymentFilter) return false;
    if (!paymentSearch.trim()) return true;
    const q = paymentSearch.toLowerCase();
    return (
      req.fullName.toLowerCase().includes(q) ||
      req.email.toLowerCase().includes(q) ||
      req.matriculationNumber.toLowerCase().includes(q) ||
      (req.paymentReference && req.paymentReference.toLowerCase().includes(q)) ||
      (req.referenceNumber && req.referenceNumber.toLowerCase().includes(q)) ||
      req.campus.toLowerCase().includes(q)
    );
  });
  const counts = monitoring?.stats ?? {
    total: users.length,
    admins: users.filter((user) => user.role === "admin").length,
    suspended: users.filter((user) => !user.isActive).length,
  };
  const overviewCards = [
    { title: "Total accounts", value: counts.total },
    { title: "Administrators", value: counts.admins },
    { title: "Suspended accounts", value: counts.suspended },
    { title: "Total transcript requests", value: monitoring?.stats.totalRequests ?? 0 },
  ];

  const initials = fullName
    ? fullName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SA";

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      <UniversalNavbar
        pageTitle="System Control"
        badge="Super Admin"
        theme="slate"
        extraLinks={[
          { label: "Admin Console", href: "/admin" },
          { label: "User Directory", href: "/admin/users" },
        ]}
      />
      <main className="flex-1 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* System control Header with Profile Picture */}
        <header className="flex flex-col gap-4 rounded-2xl sm:rounded-3xl bg-slate-950 p-4 sm:p-6 lg:p-8 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setAvatarPreview(avatarUrl);
                setAvatarNotice("");
                setAvatarError("");
                setIsAvatarModalOpen(true);
              }}
              className="group relative flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-cyan-400/40 bg-slate-900 shadow-lg transition hover:scale-105 hover:border-cyan-400"
              title="Click to upload/change Super Admin profile picture"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-base font-bold text-white sm:text-xl">{initials}</span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 sm:h-6 sm:w-6 stroke-current text-white" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
              </div>
            </button>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">System control</p>
              <h1 className="mt-0.5 text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight">Super Admin</h1>
              <p className="mt-0.5 truncate text-xs text-slate-300">
                {fullName} {userEmail ? `· ${userEmail}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setAvatarPreview(avatarUrl);
                setAvatarNotice("");
                setAvatarError("");
                setIsAvatarModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400 hover:bg-slate-800 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
              <span>Photo</span>
            </button>
            <AccountControls fullName={fullName} role="super_admin" dashboardHref="/super-admin" avatarUrl={avatarUrl} />
          </div>
        </header>

        <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 text-xs sm:gap-2 sm:text-sm scrollbar-none">
          <a href="#overview" className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 font-medium text-white sm:px-4">
            Overview
          </a>
          <a href="#payments" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Payment Requests
          </a>
          <a href="#create" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Create account
          </a>
          <a href="#users" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Users &amp; permissions
          </a>
          <a href="#products" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Products
          </a>
          <a href="#activity" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Activity
          </a>
          <a href="/admin" className="shrink-0 rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-4">
            Admin dashboard
          </a>
        </nav>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        <section id="overview" className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {overviewCards.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-xs sm:text-sm text-slate-500 font-medium">{item.title}</p>
              <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold tracking-tight">{loading ? "—" : item.value}</p>
            </article>
          ))}
        </section>

        {/* Payments Section */}
        <section id="payments" className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3.5 border-b border-slate-200 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-sm font-bold">
                  💳
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Student &amp; Alumni Payment Requests</h2>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Complete list of alumni and students that made payment requests with amounts, date, time, and full form details.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full lg:w-auto">
              <div className="flex w-full sm:w-auto overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs font-semibold scrollbar-none">
                <button
                  type="button"
                  onClick={() => setPaymentFilter("all")}
                  className={`flex-1 sm:flex-initial text-center rounded-lg px-2.5 sm:px-3 py-1.5 transition whitespace-nowrap ${
                    paymentFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({monitoring?.paymentRequests?.length ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter("paid")}
                  className={`flex-1 sm:flex-initial text-center rounded-lg px-2.5 sm:px-3 py-1.5 transition whitespace-nowrap ${
                    paymentFilter === "paid" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Paid ({monitoring?.paymentRequests?.filter((r) => r.paymentStatus === "paid").length ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter("pending")}
                  className={`flex-1 sm:flex-initial text-center rounded-lg px-2.5 sm:px-3 py-1.5 transition whitespace-nowrap ${
                    paymentFilter === "pending" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pending ({monitoring?.paymentRequests?.filter((r) => r.paymentStatus === "pending").length ?? 0})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  aria-label="Search alumni payment requests"
                  placeholder="Search student, matric, email..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="form-input text-xs sm:text-sm py-2 sm:py-1.5 w-full pr-8"
                />
                {paymentSearch && (
                  <button
                    type="button"
                    onClick={() => setPaymentSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm table-auto">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Student / Alumni</th>
                  <th className="px-3 py-3.5">Matric No.</th>
                  <th className="px-4 py-3.5">Transcript Service</th>
                  <th className="px-3 py-3.5">Amount</th>
                  <th className="px-3 py-3.5">Payment Status</th>
                  <th className="px-3 py-3.5">Date &amp; Time</th>
                  <th className="px-3 py-3.5 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPaymentRequests.map((req) => {
                  const dateObj = new Date(req.createdAt);
                  const formattedDate = dateObj.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <tr key={req.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 leading-tight">{req.fullName}</div>
                        <div className="text-xs text-slate-500">{req.email}</div>
                        <div className="text-xs text-slate-400">{req.phoneNumber}</div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {req.matriculationNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800 leading-snug">
                          {req.transcriptFormatLabel || req.transcriptFormat}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {req.deliveryMethod === "dhl" ? (
                            <span className="text-amber-700 font-medium">📦 Courier (DHL)</span>
                          ) : (
                            <span className="text-blue-700 font-medium">✉️ Electronic (Email)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900">
                          ₦{Number(req.amount).toLocaleString("en-NG")}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            req.paymentStatus === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : req.paymentStatus === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              req.paymentStatus === "paid"
                                ? "bg-emerald-600"
                                : req.paymentStatus === "pending"
                                ? "bg-amber-600"
                                : "bg-rose-600"
                            }`}
                          />
                          {req.paymentStatus}
                        </span>
                        {req.paymentReference && (
                          <div className="mt-0.5 font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                            {req.paymentReference}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap text-xs text-slate-600">
                        <div className="font-medium text-slate-900">{formattedDate}</div>
                        <div className="text-slate-400 text-[11px]">{formattedTime}</div>
                      </td>
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentRequest(req)}
                          title="View Full Student Form"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#173c5c] hover:bg-blue-50 hover:text-[#173c5c]"
                        >
                          {/* Toggle Eye Icon */}
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.75"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredPaymentRequests.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      No payment requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="divide-y divide-slate-100 lg:hidden">
            {filteredPaymentRequests.map((req) => {
              const dateObj = new Date(req.createdAt);
              const formattedDate = dateObj.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const formattedTime = dateObj.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={req.id} className="p-3.5 sm:p-5 transition hover:bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{req.fullName}</h3>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{req.email}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {req.matriculationNumber}
                        </span>
                        <span className="text-[11px] text-slate-500">·</span>
                        <span className="text-[11px] text-slate-600 truncate max-w-[160px] sm:max-w-none">
                          {req.transcriptFormatLabel || req.transcriptFormat}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 sm:px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        req.paymentStatus === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : req.paymentStatus === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          req.paymentStatus === "paid"
                            ? "bg-emerald-600"
                            : req.paymentStatus === "pending"
                            ? "bg-amber-600"
                            : "bg-rose-600"
                        }`}
                      />
                      {req.paymentStatus}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">
                        ₦{Number(req.amount).toLocaleString("en-NG")}
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500">
                        {formattedDate} · {formattedTime}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentRequest(req)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#173c5c] shadow-sm transition hover:bg-blue-50 hover:border-[#173c5c]"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      <span>View Form</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {!filteredPaymentRequests.length && (
              <p className="p-6 text-center text-sm text-slate-500">No payment requests found.</p>
            )}
          </div>
        </section>

        <section id="create" className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[.16em] text-blue-700">Provision access</p>
            <h2 className="mt-1 sm:mt-2 text-lg sm:text-xl font-bold text-slate-900">Create a user or administrator</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Provide an initial password for immediate sign-in, or leave blank to send an email invitation.
            </p>
          </div>
          <form onSubmit={createAccount} className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs sm:text-sm font-medium text-slate-700">
              Full name
              <input className="form-input mt-1.5 w-full text-xs sm:text-sm" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
            </label>
            <label className="text-xs sm:text-sm font-medium text-slate-700">
              Email
              <input className="form-input mt-1.5 w-full text-xs sm:text-sm" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="text-xs sm:text-sm font-medium text-slate-700">
              Password (optional, min 9 chars)
              <input
                className="form-input mt-1.5 w-full text-xs sm:text-sm"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={9}
                maxLength={200}
                placeholder="Direct login password"
              />
            </label>
            <label className="text-xs sm:text-sm font-medium text-slate-700">
              Role
              <select className="form-input mt-1.5 w-full text-xs sm:text-sm" value={newRole} onChange={(event) => setNewRole(event.target.value as Role)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <div className="col-span-full flex justify-end pt-2">
              <button disabled={creating} className="w-full sm:w-auto rounded-xl bg-blue-700 px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50">
                {creating ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        </section>

        <section id="products" className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Transcript products</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">Current catalog records from the transcript options database.</p>
          </div>

          {/* Mobile view for products */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {monitoring?.products.map((product) => (
              <div key={product.value} className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-xs">{product.label}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{product.category}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      product.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                  <span className="font-bold text-slate-900">₦{Number(product.amount).toLocaleString("en-NG")}</span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    {product.requiresDhl ? "📦 Courier (DHL)" : "✉️ Electronic"}
                  </span>
                </div>
              </div>
            ))}
            {!monitoring?.products?.length && (
              <p className="p-6 text-center text-xs text-slate-500">No products configured.</p>
            )}
          </div>

          {/* Desktop/Tablet table view for products */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Delivery</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monitoring?.products.map((product) => (
                  <tr key={product.value}>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{product.label}</td>
                    <td className="px-5 py-3.5 text-slate-600 capitalize">{product.category}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">₦{Number(product.amount).toLocaleString("en-NG")}</td>
                    <td className="px-5 py-3.5 text-slate-600">{product.requiresDhl ? "DHL Courier" : "Email"}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          product.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="activity" className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent website activity</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">Latest recorded account and administrator events.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {monitoring?.activity.map((event) => (
              <article key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 p-3.5 sm:px-6 sm:py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-slate-900 capitalize">{event.action.replaceAll("_", " ")}</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    {event.actorName} · {event.actorEmail}
                  </p>
                </div>
                <time className="text-[10px] sm:text-xs text-slate-400 shrink-0">{new Date(event.createdAt).toLocaleString()}</time>
              </article>
            ))}
            {!monitoring?.activity.length && <p className="p-6 text-center text-xs sm:text-sm text-slate-500">No activity has been recorded.</p>}
          </div>
        </section>

        <section id="users" className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3.5 border-b border-slate-200 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Users, roles &amp; permissions</h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">Changes take effect immediately. Suspended accounts lose all active sessions.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                aria-label="Search accounts"
                placeholder="Search name, email, role..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="form-input text-xs sm:text-sm py-2 sm:py-1.5 flex-1 sm:w-64"
              />
              <button
                type="button"
                onClick={() =>
                  void Promise.all([loadUsers(), loadMonitoring()]).catch((e: unknown) =>
                    setError(e instanceof Error ? e.message : "Unable to refresh"),
                  )
                }
                className="shrink-0 rounded-xl border border-slate-300 px-3.5 py-2 sm:py-1.5 text-xs sm:text-sm font-semibold hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Mobile User Cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredUsers.map((user) => (
              <div key={user.id} className={`p-3.5 sm:p-4 ${!user.isActive ? "bg-slate-50/80 text-slate-500" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-full border border-slate-200 object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {user.fullName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 text-xs sm:text-sm">
                        {user.fullName}
                        {user.id === currentUserId ? " · You" : ""}
                      </p>
                      <p className="truncate text-[11px] sm:text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={savingId === user.id || user.role === "super_admin"}
                    onClick={() => void saveUser(user, { isActive: !user.isActive })}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold transition ${
                      user.isActive ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {user.isActive ? "Active" : "Suspended"}
                  </button>
                </div>

                <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Role:</span>
                    <select
                      aria-label={`Role for ${user.email}`}
                      disabled={savingId === user.id || user.role === "super_admin"}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
                      value={user.role}
                      onChange={(event) => void saveUser(user, { role: event.target.value as Role })}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  {user.role === "admin" && (
                    <div className="mt-2 rounded-xl bg-slate-50 p-2.5 sm:p-3">
                      <p className="mb-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">Admin Permissions</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {permissionOptions.map((permission) => (
                          <label key={permission.id} className="flex items-center gap-1.5 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              disabled={savingId === user.id}
                              checked={user.permissions.includes(permission.id)}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...user.permissions, permission.id]
                                  : user.permissions.filter((val) => val !== permission.id);
                                void saveUser(user, { permissions: next });
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            {permission.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-1">
                    <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                    <span>{savingId === user.id ? "Saving…" : "Auto-saved"}</span>
                  </div>
                </div>
              </div>
            ))}
            {!loading && !filteredUsers.length && (
              <p className="p-6 text-center text-xs sm:text-sm text-slate-500">No accounts found.</p>
            )}
            {loading && (
              <p className="p-6 text-center text-xs sm:text-sm text-slate-500">Loading accounts…</p>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Admin permissions</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={!user.isActive ? "bg-slate-50 text-slate-500" : ""}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.fullName} className="h-8 w-8 rounded-full border border-slate-200 object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                            {user.fullName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">
                            {user.fullName}
                            {user.id === currentUserId ? " · You" : ""}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        aria-label={`Role for ${user.email}`}
                        disabled={savingId === user.id || user.role === "super_admin"}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                        value={user.role}
                        onChange={(event) => void saveUser(user, { role: event.target.value as Role })}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {permissionOptions.map((permission) => (
                          <label key={permission.id} className={`flex items-center gap-2 text-xs ${user.role !== "admin" ? "opacity-50" : ""}`}>
                            <input
                              type="checkbox"
                              disabled={savingId === user.id || user.role !== "admin"}
                              checked={user.permissions.includes(permission.id)}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...user.permissions, permission.id]
                                  : user.permissions.filter((val) => val !== permission.id);
                                void saveUser(user, { permissions: next });
                              }}
                            />
                            {permission.label}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        disabled={savingId === user.id || user.role === "super_admin"}
                        onClick={() => void saveUser(user, { isActive: !user.isActive })}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Suspended"}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{savingId === user.id ? "Saving…" : "Saved"}</td>
                  </tr>
                ))}
                {!loading && !filteredUsers.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      No accounts found.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      Loading accounts…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Super Admin Profile Photo Modal */}
      {isAvatarModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsAvatarModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="super-admin-avatar-title"
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-7 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 id="super-admin-avatar-title" className="text-xl font-bold text-slate-900">
                  Super Admin Profile Picture
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Upload or update your profile photo for System Control.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="h-28 w-28 rounded-full border-4 border-slate-100 object-cover shadow-lg"
                  />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-950 text-3xl font-bold text-white shadow-lg">
                    {initials}
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                <label className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-slate-800">
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
                    disabled={uploadingAvatar}
                    className="rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {uploadingAvatar ? "Saving…" : "Save Photo"}
                  </button>
                )}

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>

              <p className="mt-3 text-[11px] text-slate-500">Supports JPG, PNG, and WebP (auto-optimized).</p>

              {avatarNotice && (
                <p role="status" className="mt-4 w-full rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs text-emerald-800">
                  {avatarNotice}
                </p>
              )}

              {avatarError && (
                <p role="alert" className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs text-red-700">
                  {avatarError}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
      {/* Full Transcript Application Form Detail Modal with Eye View */}
      {selectedPaymentRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2.5 sm:p-4 md:p-6 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedPaymentRequest(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-form-modal-title"
            className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-6 pb-3 sm:pb-4 shrink-0">
              <div className="min-w-0 pr-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5">
                  <span>📄</span> Application Details · Request #{selectedPaymentRequest.id}
                </span>
                <h3 id="student-form-modal-title" className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
                  {selectedPaymentRequest.fullName}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
                  Matriculation No: <span className="font-mono font-bold text-slate-800">{selectedPaymentRequest.matriculationNumber}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPaymentRequest(null)}
                className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1">
              {/* Payment Status Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 sm:p-4">
                <div>
                  <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-semibold">Payment Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                        selectedPaymentRequest.paymentStatus === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedPaymentRequest.paymentStatus === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${
                          selectedPaymentRequest.paymentStatus === "paid"
                            ? "bg-emerald-600"
                            : selectedPaymentRequest.paymentStatus === "pending"
                            ? "bg-amber-600"
                            : "bg-rose-600"
                        }`}
                      />
                      {selectedPaymentRequest.paymentStatus}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      ₦{Number(selectedPaymentRequest.amount).toLocaleString("en-NG")}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] sm:text-xs text-slate-500 sm:text-right">
                  <div>
                    <strong>Date &amp; Time:</strong>{" "}
                    {new Date(selectedPaymentRequest.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                  {selectedPaymentRequest.paymentReference && (
                    <div className="font-mono text-slate-700 mt-1 break-all sm:break-normal">
                      <strong>Reference:</strong> {selectedPaymentRequest.paymentReference}
                    </div>
                  )}
                </div>
              </div>

              {/* 01: Student & Academic Details */}
              <div className="rounded-2xl border border-slate-200 p-3.5 sm:p-5">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3 sm:mb-4">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">1</span>
                  Student &amp; Academic Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">First Name</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.firstName}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Other Name</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.otherName || "—"}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Surname</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.surname}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Phone Number</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.phoneNumber}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Email Address</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.email}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Campus</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.campus}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Mode of Admission</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.modeOfAdmission}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Level of Study</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.levelOfStudy}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Document Type</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.documentType}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Graduation Period</span>
                    <span className="font-semibold text-slate-900">
                      {selectedPaymentRequest.monthOfGraduation} {selectedPaymentRequest.yearOfGraduation}
                    </span>
                  </div>
                </div>
              </div>

              {/* 02: Delivery & Destination Details */}
              <div className="rounded-2xl border border-slate-200 p-3.5 sm:p-5">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3 sm:mb-4">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">2</span>
                  Delivery &amp; Destination Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="break-words sm:col-span-2">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Recipient Institution / Organization</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.recipientInstitution}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Receiver Email</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.receiverEmail}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Delivery Method</span>
                    <span className="font-semibold text-slate-900">
                      {selectedPaymentRequest.deliveryMethod === "dhl" ? "DHL Courier (Physical)" : "Email (Electronic)"}
                    </span>
                  </div>
                  <div className="break-words sm:col-span-2">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Recipient Address</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.recipientAddress}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-slate-500 block text-[11px] sm:text-xs">Reference Number</span>
                    <span className="font-semibold text-slate-900">{selectedPaymentRequest.referenceNumber || "NILL"}</span>
                  </div>

                  {selectedPaymentRequest.deliveryMethod === "dhl" && (
                    <>
                      <div className="break-words">
                        <span className="text-slate-500 block text-[11px] sm:text-xs">Destination Country</span>
                        <span className="font-semibold text-slate-900">
                          {selectedPaymentRequest.dhlCountry} ({selectedPaymentRequest.dhlCountryCode})
                        </span>
                      </div>
                      <div className="break-words">
                        <span className="text-slate-500 block text-[11px] sm:text-xs">State / Region</span>
                        <span className="font-semibold text-slate-900">{selectedPaymentRequest.dhlState}</span>
                      </div>
                      <div className="break-words">
                        <span className="text-slate-500 block text-[11px] sm:text-xs">Continent</span>
                        <span className="font-semibold text-slate-900">{selectedPaymentRequest.dhlContinent}</span>
                      </div>
                      <div className="break-words">
                        <span className="text-slate-500 block text-[11px] sm:text-xs">Courier Fee</span>
                        <span className="font-semibold text-slate-900">
                          ₦{((selectedPaymentRequest.dhlDeliveryPriceKobo ?? 0) / 100).toLocaleString("en-NG")}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-100 p-3.5 sm:p-5 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setSelectedPaymentRequest(null)}
                className="w-full sm:w-auto rounded-xl bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow transition hover:bg-slate-800"
              >
                Close Details
              </button>
            </div>
          </section>
        </div>
      )}
      </main>
    </div>
  );
}
