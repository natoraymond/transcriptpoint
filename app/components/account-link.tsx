"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Account = { fullName: string; role: "user" | "admin" | "super_admin" };

export default function AccountLink() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { user?: Account | null }) => setAccount(result.user ?? null))
      .catch(() => setAccount(null))
      .finally(() => setLoaded(true));
  }, []);
  if (!loaded) return null;
  if (!account) return <Link href="/sign-in" className="text-xs font-semibold text-[#173c5c] transition hover:text-[#12314a]">Sign in</Link>;
  const href = account.role === "super_admin" ? "/super-admin" : account.role === "admin" ? "/admin" : "/dashboard";
  return <Link href={href} className="max-w-36 truncate text-xs font-semibold text-[#173c5c] transition hover:text-[#12314a]">{account.fullName || "My dashboard"}</Link>;
}
