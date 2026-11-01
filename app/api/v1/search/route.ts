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
 * GET /api/v1/search?q=...
 *
 * Searches PUBLISHED articles across title, subtitle, excerpt, body content,
 * author penName, category, and tags.
 * Returns the same pagination envelope `{ data, meta }` as `GET /api/v1/articles`.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const q = validateSearchQuery(searchParams.get("q"), true);
    const category = validateSlugParam(
      searchParams.get("category"),
      "category",
      false
    );
    const tag = validateSlugParam(searchParams.get("tag"), "tag", false);
    const { page, limit, skip } = parsePaginationParams(searchParams, 12);

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
        query: q,
        filters: {
          category: category ?? null,
          tag: tag ?? null,
          q,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    return handleApiError(error, "GET /api/v1/search");
  }
}
