import { CommentStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { WRITE_RATE_LIMIT_MAX, WRITE_RATE_LIMIT_WINDOW_MS } from "@/lib/api/rate-limit";
import { enforceRateLimit, requireUser } from "@/lib/api/auth-guard";
import { parseJsonBody, validateCommentBody, validateIdOrSlug } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

/*
 * Ownership rule: a user may edit/delete ONLY their own comment, and ONLY while it is PENDING
 * (once moderated, the public record is stable). Someone else's comment id => 404 (no existence leak);
 * own but already moderated => 409 CONFLICT. Both checks live in the WHERE clause (atomic).
 */

/** PATCH /api/v1/comments/[id] — { body }. Stays PENDING. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    enforceRateLimit(request, "comments:write", WRITE_RATE_LIMIT_MAX, WRITE_RATE_LIMIT_WINDOW_MS);
    const user = await requireUser();
    const id = validateIdOrSlug(context.params?.id, "id");
    const body = validateCommentBody((await parseJsonBody(request)).body);
    const res = await prisma.comment.updateMany({
      where: { id, userId: user.id, status: CommentStatus.PENDING },
      data: { body },
    });
    if (res.count === 0) return notFoundOrLocked(id, user.id);
    return apiSuccess({ id, body, status: CommentStatus.PENDING }, {}, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "PATCH /api/v1/comments/[id]");
  }
}

/** DELETE /api/v1/comments/[id] */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    enforceRateLimit(request, "comments:write", WRITE_RATE_LIMIT_MAX, WRITE_RATE_LIMIT_WINDOW_MS);
    const user = await requireUser();
    const id = validateIdOrSlug(context.params?.id, "id");
    const res = await prisma.comment.deleteMany({
      where: { id, userId: user.id, status: CommentStatus.PENDING },
    });
    if (res.count === 0) return notFoundOrLocked(id, user.id);
    return apiSuccess({ deleted: true }, {}, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "DELETE /api/v1/comments/[id]");
  }
}

async function notFoundOrLocked(id: string, userId: string) {
  const own = await prisma.comment.findFirst({ where: { id, userId }, select: { id: true } });
  return own
    ? apiError("CONFLICT", "Only pending comments can be edited or deleted.", 409)
    : apiError("NOT_FOUND", "Comment not found.", 404);
}
