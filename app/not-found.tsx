import React from "react";
import Link from "next/link";
import { CATEGORIES, SITE_NAME } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        404 • Page Not Found
      </p>
      <h1 className="mt-3 font-serif text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        We couldn&apos;t find that page on {SITE_NAME}
      </h1>
      <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
        The category or sample article slug you requested does not exist in the
        Phase 1 local dataset.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Return to Homepage
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Search Sample Articles
        </Link>
      </div>

      <div className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Browse Valid Editorial Categories
        </h2>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/${category.slug}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
