import React from "react";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-2/3 max-w-md animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  );
}
