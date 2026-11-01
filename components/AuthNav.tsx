"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

/** Header auth state via /api/auth/session (client-side so public pages stay statically rendered). */
export function AuthNav() {
  const [name, setName] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: { user?: { name?: string | null; email?: string | null } }) => setName(s?.user ? s.user.name || s.user.email || "Account" : null))
      .catch(() => setName(null));
  }, []);
  const cls = "rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300";
  if (name === undefined) {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-[26px] w-[54px] rounded-full border border-transparent bg-slate-200/50 dark:bg-slate-800/50"
      />
    );
  }
  return name ? (
    <Link href="/profile" className={cls}>{name}</Link>
  ) : (
    <Link href="/login" className={cls}>Log in</Link>
  );
}
