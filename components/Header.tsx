import React from "react";
import Link from "next/link";
import { CATEGORIES, SITE_NAME } from "@/lib/config";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { AuthNav } from "./AuthNav";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      {/* Top editorial notice bar */}
      <div className="border-b border-slate-200/80 bg-slate-100 px-4 py-1.5 text-center text-[11px] font-medium text-slate-600 dark:border-slate-800/80 dark:bg-slate-900 dark:text-slate-400">
        <span>
          <strong className="font-semibold text-indigo-600 dark:text-indigo-400">
            PHASE 1 SCAFFOLD:
          </strong>{" "}
          Displaying original sample placeholder articles for layout &amp; routing verification.
        </span>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main masthead row */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5 sm:py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex items-baseline gap-2 rounded"
            >
              <span className="font-serif text-2xl font-black tracking-tight text-slate-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 sm:text-3xl">
                {SITE_NAME}
              </span>
              <span className="hidden rounded bg-indigo-600/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300 md:inline-block">
                TODO: Logo &amp; Tagline Placeholder
              </span>
            </Link>
          </div>

          {/* Search + Theme toggle + Phase 2 Auth Skeleton label */}
          <div className="flex flex-1 items-center justify-end gap-2.5 sm:gap-3 md:max-w-md lg:max-w-lg">
            <div className="hidden w-full max-w-xs sm:block">
              <SearchBar compact placeholder="Search sample stories..." />
            </div>
            <ThemeToggle />
            <AuthNav />
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="pb-3 sm:hidden">
          <SearchBar compact placeholder="Search sample stories..." />
        </div>

        {/* Category Navigation Bar (horizontally scrollable on mobile, full bar on desktop) */}
        <nav
          aria-label="Primary categories"
          className="-mx-4 flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 text-xs font-semibold tracking-wide sm:mx-0 sm:px-0 sm:text-sm dark:border-slate-800/80"
        >
          <Link
            href="/"
            className="shrink-0 rounded-md px-2.5 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-indigo-400"
          >
            Home
          </Link>
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/${category.slug}`}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-indigo-400"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Header;
