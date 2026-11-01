"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CommentItem {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
  article: {
    id: string;
    slug: string;
    title: string;
  };
}

export function CommentModeration({
  initialComments,
  total,
  currentStatus,
}: {
  initialComments: CommentItem[];
  total: number;
  currentStatus: string;
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleFilter = (statusVal: string) => {
    router.push(`/admin/comments?status=${statusVal}`);
  };

  const handleModerate = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          kind: "ok",
          text: `Comment ${action === "approve" ? "approved and made public" : "rejected"}.`,
        });
        setComments((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, status: action === "approve" ? "APPROVED" : "REJECTED" } : c
          )
        );
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Moderation failed." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this comment?")) return;
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/comments/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ kind: "ok", text: "Comment deleted." });
        setComments((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Failed to delete comment." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div
          role="status"
          className={`rounded-md p-3 text-sm border ${
            msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((st) => (
            <button
              key={st}
              onClick={() => handleFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                currentStatus === st
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {st === "ALL" ? "All Comments" : st}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          Showing {comments.length} of {total} in queue
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No comments in this view.
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {c.user.displayName}
                  </span>
                  <span className="text-slate-400">({c.user.email})</span>
                  <span>·</span>
                  <span className="text-slate-500">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      c.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : c.status === "PENDING"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                {c.body}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                <div className="text-slate-500">
                  On article:{" "}
                  <Link
                    href={`/admin/articles/${c.article.id}`}
                    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {c.article.title}
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  {c.status !== "APPROVED" && (
                    <button
                      onClick={() => handleModerate(c.id, "approve")}
                      disabled={busyId === c.id}
                      className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {c.status !== "REJECTED" && (
                    <button
                      onClick={() => handleModerate(c.id, "reject")}
                      disabled={busyId === c.id}
                      className="rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={busyId === c.id}
                    className="rounded bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
