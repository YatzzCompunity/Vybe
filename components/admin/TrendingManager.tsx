"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CategoryOption {
  id: string;
  name: string;
}

interface TrendingItem {
  id: string;
  slug: string;
  label: string;
  score: number;
  velocity: number;
  isPinned: boolean;
  expiresAt: string | null;
  categoryId: string | null;
  category: { slug: string; name: string } | null;
}

interface ArticleFlagItem {
  id: string;
  title: string;
  slug: string;
  isFeatured: boolean;
  isTrending: boolean;
  trendingRank: number | null;
  category: { slug: string; name: string };
}

export function TrendingManager({
  initialTopics,
  categories,
  featuredArticles,
  trendingArticles,
  userRole,
}: {
  initialTopics: TrendingItem[];
  categories: CategoryOption[];
  featuredArticles: ArticleFlagItem[];
  trendingArticles: ArticleFlagItem[];
  userRole: string;
}) {
  const router = useRouter();
  const [topics, setTopics] = useState(initialTopics);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [score, setScore] = useState("100");
  const [velocity, setVelocity] = useState("1");
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const startEdit = (t: TrendingItem) => {
    setEditingId(t.id);
    setLabel(t.label);
    setSlug(t.slug);
    setCategoryId(t.categoryId ?? "");
    setScore(String(t.score));
    setVelocity(String(t.velocity));
    setIsPinned(t.isPinned);
    setExpiresAt(t.expiresAt ? t.expiresAt.slice(0, 16) : "");
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLabel("");
    setSlug("");
    setCategoryId("");
    setScore("100");
    setVelocity("1");
    setIsPinned(false);
    setExpiresAt("");
    setMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const payload: Record<string, unknown> = {
      label,
      slug: slug || undefined,
      categoryId: categoryId || undefined,
      score: parseFloat(score) || 0,
      velocity: parseFloat(velocity) || 0,
      isPinned,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    };

    try {
      const url = editingId
        ? `/api/v1/admin/trending-topics/${editingId}`
        : "/api/v1/admin/trending-topics";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({
          kind: "ok",
          text: editingId ? "Trending topic updated." : "Trending topic created.",
        });
        cancelEdit();
        const refreshRes = await fetch("/api/v1/admin/trending-topics");
        if (refreshRes.ok) {
          const fresh = await refreshRes.json();
          setTopics(fresh.data);
        }
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Operation failed." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: TrendingItem) => {
    if (!confirm(`Delete trending topic "${t.label}"?`)) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/trending-topics/${t.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ kind: "ok", text: "Topic deleted." });
        setTopics((prev) => prev.filter((item) => item.id !== t.id));
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Failed to delete topic." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
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

      {/* Trending Topic Form */}
      <form
        onSubmit={handleSave}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
          <h2 className="font-serif text-base font-bold">
            {editingId ? "Edit Trending Topic" : "Add Trending Topic"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Coachella 2027"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-derived if blank"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">(None / Global)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Score (0 - 1,000,000)
            </label>
            <input
              type="number"
              min={0}
              max={1000000}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Velocity
            </label>
            <input
              type="number"
              value={velocity}
              onChange={(e) => setVelocity(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expires At
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Pin to Top of Trending
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update Topic" : "Create Topic"}
          </button>
        </div>
      </form>

      {/* Trending Topics List */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-slate-100">
            Active Trending Topics ({topics.length})
          </h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Topic</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Velocity</th>
              <th className="px-3 py-3">Pinned</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {topics.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No trending topics configured.
                </td>
              </tr>
            ) : (
              topics.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {t.label}
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-slate-400">
                      #{t.slug}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {t.category ? t.category.name : "Global"}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {t.score}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{t.velocity}</td>
                  <td className="px-3 py-3">
                    {t.isPinned && (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        PINNED
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(t)}
                        className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Edit
                      </button>
                      {userRole === "ADMIN" && (
                        <button
                          onClick={() => handleDelete(t)}
                          className="rounded bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Featured & Trending Articles Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Featured Carousel Articles */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-serif text-sm font-bold">Featured Articles ({featuredArticles.length})</h3>
            <span className="text-[10px] text-slate-400">Hero Carousel</span>
          </div>
          <div className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
            {featuredArticles.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2">
                <Link
                  href={`/admin/articles/${a.id}`}
                  className="truncate font-medium text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400 max-w-xs"
                >
                  {a.title}
                </Link>
                <Link
                  href={`/admin/articles/${a.id}`}
                  className="text-[11px] text-indigo-600 hover:underline shrink-0 ml-2"
                >
                  Edit flags →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Flag Articles */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-serif text-sm font-bold">Trending Flag Articles ({trendingArticles.length})</h3>
            <span className="text-[10px] text-slate-400">Feed Badges</span>
          </div>
          <div className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
            {trendingArticles.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2">
                <div className="truncate max-w-xs">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="font-medium text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                  >
                    {a.title}
                  </Link>
                  {a.trendingRank && (
                    <span className="ml-2 font-mono text-[10px] text-rose-600 font-bold">
                      #{a.trendingRank}
                    </span>
                  )}
                </div>
                <Link
                  href={`/admin/articles/${a.id}`}
                  className="text-[11px] text-indigo-600 hover:underline shrink-0 ml-2"
                >
                  Edit flags →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
