import React from "react";
import Link from "next/link";
import { getAnalytics } from "@/lib/admin/service";
import { requireAdminSession } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdminSession("EDITOR");
  const data = await getAnalytics();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Overview Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time counts and operational metrics directly from the database.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/admin/articles/new"
            className="rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + New Article
          </Link>
          <Link
            href="/admin/comments"
            className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Moderate Comments ({data.comments.byStatus.PENDING})
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Articles KPI */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Articles
            </span>
            <Link
              href="/admin/articles"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View all →
            </Link>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight">{data.articles.total}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {data.articles.published}
              </span>{" "}
              Live
            </div>
            <div>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {data.articles.scheduled}
              </span>{" "}
              Scheduled
            </div>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {data.articles.drafts}
              </span>{" "}
              Drafts
            </div>
            <div>
              <span className="font-semibold text-sky-600 dark:text-sky-400">
                {data.articles.inReviewOrApproved}
              </span>{" "}
              Review
            </div>
          </div>
        </div>

        {/* Users KPI */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Users
            </span>
            <Link
              href="/admin/users"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Manage →
            </Link>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight">{data.users}</p>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
            Registered accounts across all roles (Admin, Editor, Author, Reader).
          </p>
        </div>

        {/* Comments KPI */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Comments
            </span>
            <Link
              href="/admin/comments"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Queue →
            </Link>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight">{data.comments.total}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {data.comments.byStatus.PENDING} Pending
            </span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {data.comments.byStatus.APPROVED} Approved
            </span>
            <span className="rounded bg-rose-100 px-1.5 py-0.5 font-medium text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              {data.comments.byStatus.REJECTED} Rejected
            </span>
          </div>
        </div>

        {/* Bookmarks KPI */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bookmarks
            </span>
            <span className="text-xs text-slate-400">Engagement</span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight">{data.bookmarks}</p>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
            Articles saved to user profile reading lists.
          </p>
        </div>
      </div>

      {/* Transparent Analytics Disclosure */}
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Honest Metrics Notice:
        </span>{" "}
        {data.pageviews.note} VYBE displays only verified database counts (articles, users, comments, bookmarks).
      </div>

      {/* Two Column Section: Popular Categories & Most Bookmarked Articles */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Popular Categories */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-serif text-lg font-bold">Categories by Engagement</h2>
            <Link
              href="/admin/categories"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Manage categories →
            </Link>
          </div>
          {data.popularCategories.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">No categories found.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
              {data.popularCategories.map((c) => (
                <div key={c.slug} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {c.name}
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-slate-400">
                      /{c.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                    <span>{c.publishedArticles} articles</span>
                    <span>·</span>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      {c.bookmarks} bookmarks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Bookmarked Articles */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-serif text-lg font-bold">Most Bookmarked Articles</h2>
            <Link
              href="/admin/articles"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              All articles →
            </Link>
          </div>
          {data.mostBookmarkedArticles.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              No bookmarks recorded yet. As readers bookmark stories, top articles will appear here.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
              {data.mostBookmarkedArticles.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 pr-4">
                    <Link
                      href={`/admin/articles/${a.id}`}
                      className="truncate font-medium text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400 block"
                    >
                      {a.title}
                    </Link>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {a.status}
                    </span>
                  </div>
                  <div className="shrink-0 font-semibold text-indigo-600 dark:text-indigo-400">
                    ★ {a.bookmarks}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
