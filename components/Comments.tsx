"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface PublicComment {
  id: string;
  body: string;
  createdAt: string;
  user: { displayName: string };
}

type AuthState = "loading" | "anon" | "authed";
const MAX = 2000;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Approved comments (public API only) + comment form. New comments are PENDING until moderated. */
export function Comments({ slug, returnPath }: { slug: string; returnPath: string }) {
  const [comments, setComments] = useState<PublicComment[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [auth, setAuth] = useState<AuthState>("loading");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/articles/${encodeURIComponent(slug)}/comments`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const json = (await res.json()) as { data?: PublicComment[] };
      setComments(json.data ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
      setComments([]);
    }
  }, [slug]);

  useEffect(() => {
    void load();
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: { user?: unknown }) => setAuth(s && s.user ? "authed" : "anon"))
      .catch(() => setAuth("anon"));
  }, [load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/articles/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.status === 401) {
        setAuth("anon");
      } else if (res.ok) {
        setText("");
        setMsg({ kind: "ok", text: "Thanks! Your comment was submitted and is awaiting moderation. It will appear here once approved." });
      } else {
        const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setMsg({ kind: "err", text: j?.error?.message ?? "Could not submit your comment." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="comments-heading" className="mt-8 rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <h2 id="comments-heading" className="font-serif text-xl font-bold text-slate-900 dark:text-white">
        Reader Discussion{comments ? ` (${comments.length})` : ""}
      </h2>

      {comments === null ? (
        <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-400">Loading comments…</p>
      ) : loadError ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">Comments could not be loaded right now.</p>
      ) : comments.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">No comments yet. Be the first to share your thoughts.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong className="font-semibold text-slate-900 dark:text-slate-100">{c.user.displayName}</strong>
                {" · "}
                <time dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-200">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Leave a comment</h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          All comments are moderated: new comments are held as pending and are not public until approved.
        </p>
        {auth === "loading" ? null : auth === "anon" ? (
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
            <Link href={`/login?callbackUrl=${encodeURIComponent(returnPath)}`} className="font-semibold text-indigo-600 underline dark:text-indigo-400">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/register" className="font-semibold text-indigo-600 underline dark:text-indigo-400">
              create an account
            </Link>{" "}
            to comment.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-3 space-y-2">
            <label htmlFor="comment-body" className="sr-only">Your comment</label>
            <textarea
              id="comment-body"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              minLength={2}
              maxLength={MAX}
              rows={4}
              placeholder="Share your thoughts respectfully…"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-600 dark:text-slate-400">{text.length}/{MAX}</span>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Submit for moderation"}
              </button>
            </div>
          </form>
        )}
        {msg && (
          <p role="status" className={`mt-2 text-sm ${msg.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}
