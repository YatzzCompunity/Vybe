"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavProps {
  user: {
    displayName: string;
    email: string;
    role: string;
  };
}

export function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/admin", exact: true },
    { label: "Articles", href: "/admin/articles", exact: false },
    { label: "Leads", href: "/admin/leads", exact: false },
    { label: "Sources", href: "/admin/sources", exact: false },
    { label: "Categories", href: "/admin/categories", exact: false },
    { label: "Tags", href: "/admin/tags", exact: false },
    { label: "Authors", href: "/admin/authors", exact: false },
    { label: "Comments", href: "/admin/comments", exact: false },
    { label: "Trending", href: "/admin/trending", exact: false },
    ...(user.role === "ADMIN"
      ? [{ label: "Users", href: "/admin/users", exact: false }]
      : []),
  ];

  return (
    <div className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="font-serif text-xl font-black tracking-tight text-slate-900 dark:text-white">
                VYBE
              </span>
              <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                Admin
              </span>
            </Link>
            <span className="text-xs text-slate-400 dark:text-slate-500">|</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium">{user.displayName}</span>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {user.role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/"
              className="text-slate-600 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              ← Back to Site
            </Link>
            <Link
              href="/profile"
              className="text-slate-600 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              Your Profile
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="-mb-px flex space-x-1 overflow-x-auto pb-1 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-t-md px-3.5 py-2 transition ${
                  isActive
                    ? "border-b-2 border-indigo-600 bg-white font-semibold text-indigo-600 shadow-sm dark:border-indigo-400 dark:bg-slate-900 dark:text-indigo-400"
                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
