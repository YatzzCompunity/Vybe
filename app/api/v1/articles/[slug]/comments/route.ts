import { publicArticleWhere } from "@/lib/publication";
import { ArticleStatus, CommentStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { WRITE_RATE_LIMIT_MAX, WRITE_RATE_LIMIT_WINDOW_MS } from "@/lib/api/rate-limit";
import { enforceRateLimit, requireUser } from "@/lib/api/auth-guard";
import { parseJsonBody, validateCommentBody, validateSlugParam } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { slug: string };
}

/** GET /api/v1/articles/[slug]/comments — PUBLIC; APPROVED comments on PUBLISHED articles only. */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const slug = validateSlugParam(context.params?.slug, "slug", true);
    const article = await prisma.article.findFirst({
      where: { slug, ...publicArticleWhere() },
      select: { id: true },
    });
    if (!article) return apiError("NOT_FOUND", "Article not found.", 404);
    const comments = await prisma.comment.findMany({
      where: { articleId: article.id, status: CommentStatus.APPROVED },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: { id: true, body: true, createdAt: true, user: { select: { displayName: true, avatarUrl: true } } },
    });
    return apiSuccess(
      comments,
      { count: comments.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    return handleApiError(error, "GET /api/v1/articles/[slug]/comments");
  }
}

/** POST /api/v1/articles/[slug]/comments — { body }. Session required; created as PENDING. */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    enforceRateLimit(request, "comments:write", WRITE_RATE_LIMIT_MAX, WRITE_RATE_LIMIT_WINDOW_MS);
    const user = await requireUser();
    const slug = validateSlugParam(context.params?.slug, "slug", true);
    const body = validateCommentBody((await parseJsonBody(request)).body);
    const article = await prisma.article.findFirst({
      where: { slug, ...publicArticleWhere() },
      select: { id: true },
    });
    if (!article) return apiError("NOT_FOUND", "Article not found.", 404);
    const comment = await prisma.comment.create({
      data: { articleId: article.id, userId: user.id, body, status: CommentStatus.PENDING },
      select: { id: true, body: true, status: true, createdAt: true },
    });
    return apiSuccess(
      comment,
      { note: "Comment is pending moderation and not publicly visible until approved." },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return handleApiError(error, "POST /api/v1/articles/[slug]/comments");
  }
}
