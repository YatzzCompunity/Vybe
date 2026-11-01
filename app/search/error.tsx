"use client";

import React from "react";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-serif text-3xl font-black text-slate-900 dark:text-white">Something went wrong</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">An unexpected error occurred while loading this page. Please try again.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
          Try again
        </button>
        <Link href="/" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
