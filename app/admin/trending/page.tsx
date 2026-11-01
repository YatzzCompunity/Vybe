import React from "react";
import prisma from "@/lib/db";
import { listTrendingTopics, listCategories } from "@/lib/admin/service";
import { requireAdminSession } from "@/lib/admin/guard";
import { TrendingManager } from "@/components/admin/TrendingManager";

export const dynamic = "force-dynamic";

export default async function AdminTrendingPage() {
  const user = await requireAdminSession("EDITOR");

  const [topics, categories, featuredArticles, trendingArticles] = await Promise.all([
    listTrendingTopics(),
    listCategories(),
    prisma.article.findMany({
      where: { isFeatured: true },
      select: {
        id: true,
        title: true,
        slug: true,
        isFeatured: true,
        isTrending: true,
        trendingRank: true,
        category: { select: { slug: true, name: true } },
      },
      take: 20,
    }),
    prisma.article.findMany({
      where: { isTrending: true },
      select: {
        id: true,
        title: true,
        slug: true,
        isFeatured: true,
        isTrending: true,
        trendingRank: true,
        category: { select: { slug: true, name: true } },
      },
      orderBy: { trendingRank: "asc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Trending &amp; Curation</h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Manage viral topic keywords, pinning priorities, and featured article positions.
        </p>
      </div>

      <TrendingManager
        initialTopics={topics.map((t) => ({
          ...t,
          expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        featuredArticles={featuredArticles}
        trendingArticles={trendingArticles}
        userRole={user.role}
      />
    </div>
  );
}
