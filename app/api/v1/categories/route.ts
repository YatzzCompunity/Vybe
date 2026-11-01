import { publicArticleWhere } from "@/lib/publication";
import { ArticleStatus } from "@prisma/client";
import prisma from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/categories
 *
 * Returns all active categories ordered by `sortOrder` ascending, along with
 * the count of PUBLISHED articles in each category (DRAFT/IN_REVIEW/APPROVED/ARCHIVED
 * articles are excluded from counts).
 */
export async function GET() {
  try {
    const [categories, publishedCounts] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.article.groupBy({
        by: ["categoryId"],
        where: { ...publicArticleWhere() },
        _count: { _all: true },
      }),
    ]);

    const countByCategoryId = new Map<string, number>();
    let totalPublishedArticles = 0;
    for (const row of publishedCounts) {
      countByCategoryId.set(row.categoryId, row._count._all);
      totalPublishedArticles += row._count._all;
    }

    const data = categories.map((cat) => {
      const count = countByCategoryId.get(cat.id) ?? 0;
      return {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        accentColor: cat.accentColor,
        sortOrder: cat.sortOrder,
        publishedArticleCount: count,
        articleCount: count,
      };
    });

    return apiSuccess(
      data,
      {
        total: data.length,
        totalPublishedArticles,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error: unknown) {
    return handleApiError(error, "GET /api/v1/categories");
  }
}
