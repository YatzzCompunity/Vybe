import { publicArticleWhere } from "@/lib/publication";
import { ArticleStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import {
  PUBLIC_ARTICLE_DETAIL_INCLUDE,
  serializeArticleDetail,
} from "@/lib/api/serializers";
import { validateSlugParam } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: {
    slug: string;
  };
}

/**
 * GET /api/v1/articles/[slug]
 *
 * Returns a single PUBLISHED article by slug with its author, category, tags,
 * heroMedia, and seoMetadata relations.
 * Returns HTTP 404 JSON if the slug does not exist or if the article status is
 * DRAFT, IN_REVIEW, APPROVED, or ARCHIVED.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const slug = validateSlugParam(context.params?.slug, "slug", true);

    const article = await prisma.article.findFirst({
      where: {
        slug,
        ...publicArticleWhere(),
      },
      include: PUBLIC_ARTICLE_DETAIL_INCLUDE,
    });

    if (!article) {
      return apiError(
        "NOT_FOUND",
        `Published article with slug '${slug}' was not found.`,
        404
      );
    }

    return apiSuccess(
      serializeArticleDetail(article),
      {
        slug: article.slug,
        categorySlug: article.category.slug,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error: unknown) {
    return handleApiError(error, "GET /api/v1/articles/[slug]");
  }
}
