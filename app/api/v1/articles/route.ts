import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import {
  buildPublishedArticleWhere,
  PUBLIC_ARTICLE_LIST_INCLUDE,
  serializeArticleSummary,
} from "@/lib/api/serializers";
import {
  parsePaginationParams,
  validateSearchQuery,
  validateSlugParam,
} from "@/lib/api/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/articles
 *
 * Returns a paginated list of PUBLISHED articles sorted newest-first.
 * Supports optional query parameters:
 * - `category`: category slug filter (e.g. `music`, `albums`)
 * - `tag`: tag slug filter (e.g. `album-rollout`)
 * - `q`: search query across title, subtitle, excerpt, body, author, category, and tags
 * - `page`: 1-based page number (default: 1)
 * - `limit`: page size (default: 12, capped at max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const { page, limit, skip } = parsePaginationParams(searchParams, 12);
    const category = validateSlugParam(
      searchParams.get("category"),
      "category",
      false
    );
    const tag = validateSlugParam(searchParams.get("tag"), "tag", false);
    const q = validateSearchQuery(searchParams.get("q"), false);

    const where = buildPublishedArticleWhere({ category, tag, q });

    const [total, rows] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        include: PUBLIC_ARTICLE_LIST_INCLUDE,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return apiSuccess(
      rows.map(serializeArticleSummary),
      {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
        filters: {
          category: category ?? null,
          tag: tag ?? null,
          q: q ?? null,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    return handleApiError(error, "GET /api/v1/articles");
  }
}
