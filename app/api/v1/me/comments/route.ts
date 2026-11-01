import { apiSuccess, handleApiError } from "@/lib/api/response";
import prisma from "@/lib/db";
import { requireUser } from "@/lib/api/auth-guard";

export const dynamic = "force-dynamic";

/** GET /api/v1/me/comments — the signed-in user's own comments in ALL moderation states. */
export async function GET() {
  try {
    const user = await requireUser();
    const comments = await prisma.comment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        body: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        article: { select: { slug: true, title: true, category: { select: { slug: true } } } },
      },
    });
    return apiSuccess(comments, { count: comments.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/v1/me/comments");
  }
}
