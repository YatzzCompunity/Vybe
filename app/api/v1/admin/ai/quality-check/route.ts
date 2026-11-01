import { adminRoute, STAFF_ROLE } from "@/lib/api/admin-route";
import { runQualityCheck } from "@/lib/ai/quality-check";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = Record<string, never>;

function parseStringList(raw: Record<string, unknown>, key: string): string[] {
  const v = raw[key];
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) {
    return v.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof v === "string") {
    return v.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

/**
 * POST /api/v1/admin/ai/quality-check
 * Evaluates draft text against editorial standards:
 * - Factual accuracy & source citations
 * - Grammar & spelling heuristic pass
 * - Database duplicate / plagiarism similarity check
 * - SEO metadata completeness
 * - Heading hierarchy
 * - Contextual internal link suggestions
 * (EDITOR+)
 */
export const POST = adminRoute<P>(
  "POST admin/ai/quality-check",
  STAFF_ROLE,
  async ({ body }) => {
    const title = I.reqStr(body, "title", { max: 250 }, false);
    const excerpt = I.reqStr(body, "excerpt", { max: 1000, multiline: true }, false);
    const bodyMarkdown = I.reqStr(body, "bodyMarkdown", { max: 100000, multiline: true }, false);
    const currentArticleId = I.str(body, "currentArticleId", { max: 100 });
    const categoryId = I.str(body, "categoryId", { max: 100 });
    const categorySlug = I.str(body, "categorySlug", { max: 100 });
    const tags = I.slugList(body, "tags");
    const sourcesCited = parseStringList(body, "sourcesCited");
    const unverifiedClaims = parseStringList(body, "unverifiedClaims");
    const confidenceScore = I.num(body, "confidenceScore", 0, 1);

    const seoMetadata =
      typeof body.seoMetadata === "object" && body.seoMetadata !== null
        ? {
            metaTitle: I.str(body.seoMetadata as Record<string, unknown>, "metaTitle", { max: 100 }),
            metaDescription: I.str(body.seoMetadata as Record<string, unknown>, "metaDescription", { max: 300, multiline: true }),
            ogTitle: I.str(body.seoMetadata as Record<string, unknown>, "ogTitle", { max: 100 }),
            ogDescription: I.str(body.seoMetadata as Record<string, unknown>, "ogDescription", { max: 300, multiline: true }),
          }
        : undefined;

    const report = await runQualityCheck({
      title: title!,
      excerpt: excerpt!,
      bodyMarkdown: bodyMarkdown!,
      currentArticleId: currentArticleId || undefined,
      categoryId: categoryId || undefined,
      categorySlug: categorySlug || undefined,
      tags,
      sourcesCited,
      unverifiedClaims,
      confidenceScore,
      seoMetadata,
    });

    return {
      data: report,
    };
  },
  { hasBody: true }
);
