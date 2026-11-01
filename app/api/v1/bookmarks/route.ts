import { publicArticleWhere } from "@/lib/publication";
import { ArticleStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { WRITE_RATE_LIMIT_MAX, WRITE_RATE_LIMIT_WINDOW_MS } from "@/lib/api/rate-limit";
import { enforceRateLimit, requireUser } from "@/lib/api/auth-guard";
import { parseJsonBody, validateIdOrSlug } from "@/lib/api/validation";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

const BOOKMARK_SELECT = {
  id: true,
  createdAt: true,
  article: {
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      status: true,
      publishedAt: true,
      category: { select: { slug: true, name: true } },
    },
  },
} as const;

/**
 * GET /api/v1/bookmarks[?slug=...] — own bookmarks only, published articles only.
 * With `slug`, returns only that article's bookmark (used by the article-page button).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const slugParam = request.nextUrl.searchParams.get("slug");
    const slug = slugParam ? validateIdOrSlug(slugParam, "slug") : null;
    const rows = await prisma.bookmark.findMany({
      where: {
        userId: user.id,
        article: { ...publicArticleWhere(), ...(slug ? { slug } : {}) },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: BOOKMARK_SELECT,
    });
    return apiSuccess(rows, { count: rows.length }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, "GET /api/v1/bookmarks");
  }
}

/** POST /api/v1/bookmarks — { slug } or { articleId }. Published only; duplicate => 409. */
export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "bookmarks:write", WRITE_RATE_LIMIT_MAX * 3, WRITE_RATE_LIMIT_WINDOW_MS);
    const user = await requireUser();
    const body = await parseJsonBody(request);
    const where = body.slug !== undefined
      ? { slug: validateIdOrSlug(body.slug, "slug") }
      : { id: validateIdOrSlug(body.articleId, "articleId") };
    const article = await prisma.article.findFirst({
      where: { ...where, ...publicArticleWhere() },
      select: { id: true },
    });
    if (!article) return apiError("NOT_FOUND", "Article not found.", 404);

    const existing = await prisma.bookmark.findUnique({
      where: { userId_articleId: { userId: user.id, articleId: article.id } },
      select: { id: true },
    });
    if (existing) return apiError("CONFLICT", "Article is already bookmarked.", 409);

    const created = await prisma.bookmark.create({
      data: { userId: user.id, articleId: article.id },
      select: BOOKMARK_SELECT,
    });
    return apiSuccess(created, {}, { status: 201, headers: NO_STORE });
  } catch (error) {
    // Race between check and create hits the unique index.
    if ((error as { code?: string })?.code === "P2002") {
      return apiError("CONFLICT", "Article is already bookmarked.", 409);
    }
    return handleApiError(error, "POST /api/v1/bookmarks");
  }
}

/**
 * DELETE /api/v1/bookmarks?id=<bookmarkId> or ?slug=<articleSlug>.
 * Scoped by userId: another user's bookmark id yields 404 (indistinguishable from nonexistent).
 */
export async function DELETE(request: NextRequest) {
  try {
    enforceRateLimit(request, "bookmarks:write", WRITE_RATE_LIMIT_MAX * 3, WRITE_RATE_LIMIT_WINDOW_MS);
    const user = await requireUser();
    const id = request.nextUrl.searchParams.get("id");
    const slug = request.nextUrl.searchParams.get("slug");
    if (!id && !slug) {
      return apiError("VALIDATION_ERROR", "Provide 'id' or 'slug' query parameter.", 400);
    }
    const result = await prisma.bookmark.deleteMany({
      where: id
        ? { id: validateIdOrSlug(id, "id"), userId: user.id }
        : { userId: user.id, article: { slug: validateIdOrSlug(slug, "slug") } },
    });
    if (result.count === 0) return apiError("NOT_FOUND", "Bookmark not found.", 404);
    return apiSuccess({ deleted: true }, {}, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, "DELETE /api/v1/bookmarks");
  }
}
