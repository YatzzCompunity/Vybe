import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = Record<string, never>;

/** GET /api/v1/admin/articles?status=DRAFT|IN_REVIEW|APPROVED|PUBLISHED|SCHEDULED|ARCHIVED&search=&page=&limit= (EDITOR+) */
export const GET = adminRoute<P>("GET admin/articles", STAFF_ROLE, async ({ request }) => {
  const sp = request.nextUrl.searchParams;
  const p = I.pageParams(sp);
  const { items, total } = await S.listArticles({ ...p, status: sp.get("status") ?? undefined, search: sp.get("search")?.slice(0, 100) || undefined });
  return { data: items, meta: { total, page: p.page, limit: p.limit } };
});

/** POST — create. Always DRAFT (status cannot be supplied). (EDITOR+) */
export const POST = adminRoute<P>("POST admin/articles", STAFF_ROLE, async ({ body }) => ({ data: await S.createArticle(body), status: 201 }), { hasBody: true });
