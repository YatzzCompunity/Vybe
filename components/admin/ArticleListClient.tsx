"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ArticleItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  state: string;
  isFeatured: boolean;
  isTrending: boolean;
  trendingRank: number | null;
  publishedAt: string | null;
  updatedAt: string;
  category: { id: string; slug: string; name: string };
  author: { id: string; penName: string };
}

interface Props {
  initialArticles: ArticleItem[];
  total: number;
  currentPage: number;
  currentStatus?: string;
  currentSearch?: string;
  userRole: string;
}

export function ArticleListClient({
  initialArticles,
  total,
  currentPage,
  currentStatus = "",
  currentSearch = "",
  userRole,
}: Props) {
  const router = useRouter();
  const [articles, setArticles] = useState(initialArticles);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [search, setSearch] = useState(currentSearch);

  const handleFilter = (statusVal: string) => {
    const params = new URLSearchParams();
    if (statusVal) params.set("status", statusVal);
    if (search) params.set("search", search);
    router.push(`/admin/articles?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (currentStatus) params.set("status", currentStatus);
    if (search) params.set("search", search);
    router.push(`/admin/articles?${params.toString()}`);
  };

  const handlePublish = async (id: string) => {
    if (!confirm("Publish this article now? It will become publicly visible immediately.")) return;
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/articles/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ kind: "ok", text: `Article published successfully.` });
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "PUBLISHED", state: "PUBLISHED" } : a))
        );
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Failed to publish article." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setBusyId(null);
    }
  };

  const handleUnpublish = async (id: string) => {
    if (!confirm("Unpublish this article? It will be moved to DRAFT and hidden from the public.")) return;
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/articles/${id}/unpublish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ kind: "ok", text: `Article unpublished to DRAFT.` });
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "DRAFT", state: "DRAFT", publishedAt: null } : a))
        );
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Failed to unpublish article." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article? If it is published, unpublish it first.")) return;
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/articles/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ kind: "ok", text: "Article deleted." });
        setArticles((prev) => prev.filter((a) => a.id !== id));
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Failed to delete article." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setBusyId(null);
    }
  };

  const stateBadge = (state: string) => {
    switch (state) {
      case "PUBLISHED":
        return <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Live</span>;
      case "SCHEDULED":
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Scheduled</span>;
      case "DRAFT":
        return <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-300">Draft</span>;
      case "IN_REVIEW":
        return <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">In Review</span>;
      case "APPROVED":
        return <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">Approved</span>;
      case "ARCHIVED":
        return <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-400">Archived</span>;
      default:
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-400">{state}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notification */}
      {msg && (
        <div
          role="status"
          className={`rounded-md p-3 text-sm ${
            msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or slug..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="status-filter" className="font-medium text-slate-600 dark:text-slate-400">
            Status:
          </label>
          <select
            id="status-filter"
            value={currentStatus}
            onChange={(e) => handleFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published (Live)</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Title &amp; Slug</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Author</th>
              <th className="px-3 py-3">State</th>
              <th className="px-3 py-3">Flags</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {articles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No articles found matching criteria.
                </td>
              </tr>
            ) : (
              articles.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 max-w-xs sm:max-w-md">
                    <Link
                      href={`/admin/articles/${a.id}`}
                      className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                    >
                      {a.title}
                    </Link>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                      /{a.slug}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    {a.category.name}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    {a.author.penName}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {stateBadge(a.state)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      {a.isFeatured && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                          Featured
                        </span>
                      )}
                      {a.isTrending && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          Trending {a.trendingRank ? `#${a.trendingRank}` : ""}
                        </span>
                      )}
                      {!a.isFeatured && !a.isTrending && (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/articles/${a.id}`}
                        className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Edit / SEO
                      </Link>

                      {a.state !== "PUBLISHED" ? (
                        <button
                          onClick={() => handlePublish(a.id)}
                          disabled={busyId === a.id}
                          className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Publish
                        </button>
                      ) : (
                        <>
                          <Link
                            href={`/${a.category.slug}/${a.slug}`}
                            target="_blank"
                            className="rounded border border-indigo-200 px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleUnpublish(a.id)}
                            disabled={busyId === a.id}
                            className="rounded bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                          >
                            Unpublish
                          </button>
                        </>
                      )}

                      {userRole === "ADMIN" && a.state !== "PUBLISHED" && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={busyId === a.id}
                          className="rounded bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
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

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing {articles.length} of {total} articles
        </div>
      </div>
    </div>
  );
}
