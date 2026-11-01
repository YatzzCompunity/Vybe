"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type State = "loading" | "anon" | "saved" | "unsaved";

/** Real bookmark toggle backed by /api/v1/bookmarks. Anonymous users get a login prompt only. */
export function BookmarkButton({ slug, returnPath }: { slug: string; returnPath: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/bookmarks?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) return setState("anon");
        const json = (await res.json()) as { data?: unknown[] };
        setState(json.data && json.data.length > 0 ? "saved" : "unsaved");
      } catch {
        if (!cancelled) setState("anon");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const cls = "rounded-full border border-slate-300 px-3 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300";

  if (state === "loading") return <span className={cls}>Bookmark</span>;
  if (state === "anon") {
    return (
      <Link href={`/login?callbackUrl=${encodeURIComponent(returnPath)}`} className={cls}>
        Log in to bookmark
      </Link>
    );
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = state === "saved";
      const res = saved
        ? await fetch(`/api/v1/bookmarks?slug=${encodeURIComponent(slug)}`, { method: "DELETE" })
        : await fetch("/api/v1/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
      if (res.status === 401) setState("anon");
      else if (res.ok || res.status === 409 || res.status === 404) setState(saved ? "unsaved" : "saved");
      else setError("Could not update bookmark.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={state === "saved"} className={cls}>
        {state === "saved" ? "★ Saved" : "☆ Bookmark"}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
