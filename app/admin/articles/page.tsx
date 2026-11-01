import React from "react";
import Link from "next/link";
import { listArticles } from "@/lib/admin/service";
import { requireAdminSession } from "@/lib/admin/guard";
import { ArticleListClient } from "@/components/admin/ArticleListClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    status?: string;
    search?: string;
    page?: string;
  };
}

export default async function AdminArticlesPage({ searchParams }: PageProps) {
  const user = await requireAdminSession("EDITOR");
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const limit = 50;
  const skip = (page - 1) * limit;

  const result = await listArticles({
    status: searchParams.status,
    search: searchParams.search,
    page,
    limit,
    skip,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Articles Management</h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Create, edit, review, and control publication lifecycle for all editorial content.
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          + New Article
        </Link>
      </div>

      <ArticleListClient
        initialArticles={result.items.map((a) => ({
          ...a,
          publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
          updatedAt: a.updatedAt.toISOString(),
        }))}
        total={result.total}
        currentPage={page}
        currentStatus={searchParams.status}
        currentSearch={searchParams.search}
        userRole={user.role}
      />
    </div>
  );
}
