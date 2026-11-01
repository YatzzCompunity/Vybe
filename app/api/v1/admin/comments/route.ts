import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = Record<string, never>;
/** GET /api/v1/admin/comments?status=PENDING(default)|APPROVED|REJECTED|FLAGGED|ALL (EDITOR+). */
export const GET = adminRoute<P>("GET admin/comments", STAFF_ROLE, async ({ request }) => {
  const sp = request.nextUrl.searchParams;
  const p = I.pageParams(sp);
  const { items, total } = await S.listComments({ ...p, status: sp.get("status") ?? undefined });
  return { data: items, meta: { total, page: p.page, limit: p.limit } };
});
