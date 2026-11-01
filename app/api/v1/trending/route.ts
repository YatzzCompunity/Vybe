import { publicArticleWhere } from "@/lib/publication";
import { ArticleStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import {
  PUBLIC_ARTICLE_LIST_INCLUDE,
  serializeArticleSummary,
} from "@/lib/api/serializers";
import { parsePaginationParams } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/trending
 *
 * Returns curated/scored trending topics (`TrendingTopic`) together with
 * trending (`isTrending = true`) and featured (`isFeatured = true`) PUBLISHED articles.
 * Supports optional `limit` query parameter (default: 10, max: 50).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { limit } = parsePaginationParams(searchParams, 10);
    const now = new Date();

    const [topics, trendingArticles, featuredArticles] = await Promise.all([
      prisma.trendingTopic.findMany({
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        include: {
          category: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
        orderBy: [{ isPinned: "desc" }, { score: "desc" }],
        take: limit,
      }),
      prisma.article.findMany({
        where: {
          ...publicArticleWhere(),
          isTrending: true,
        },
        include: PUBLIC_ARTICLE_LIST_INCLUDE,
        orderBy: [{ trendingRank: "asc" }, { publishedAt: "desc" }],
        take: limit,
      }),
      prisma.article.findMany({
        where: {
          ...publicArticleWhere(),
          isFeatured: true,
        },
        include: PUBLIC_ARTICLE_LIST_INCLUDE,
        orderBy: [{ trendingRank: "asc" }, { publishedAt: "desc" }],
        take: limit,
      }),
    ]);

    const serializedTopics = topics.map((t) => ({
      id: t.id,
      slug: t.slug,
      label: t.label,
      score: t.score,
      velocity: t.velocity,
      isPinned: t.isPinned,
      expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
      updatedAt: t.updatedAt.toISOString(),
      category: t.category
        ? {
            id: t.category.id,
            slug: t.category.slug,
            name: t.category.name,
          }
        : null,
    }));

    const serializedTrending = trendingArticles.map(serializeArticleSummary);
    const serializedFeatured = featuredArticles.map(serializeArticleSummary);

    return apiSuccess(
      {
        topics: serializedTopics,
        articles: serializedTrending,
        featured: serializedFeatured,
      },
      {
        topicCount: serializedTopics.length,
        trendingArticleCount: serializedTrending.length,
        featuredArticleCount: serializedFeatured.length,
        limit,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    return handleApiError(error, "GET /api/v1/trending");
  }
}
