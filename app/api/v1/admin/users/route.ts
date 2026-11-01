import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = Record<string, never>;
/** GET /api/v1/admin/users?search=&page=&limit= — ADMIN only. Never returns passwordHash/reset tokens. */
export const GET = adminRoute<P>("GET admin/users", ADMIN_ROLE, async ({ request }) => {
  const sp = request.nextUrl.searchParams;
  const p = I.pageParams(sp);
  const { items, total } = await S.listUsers({ ...p, search: sp.get("search")?.slice(0, 100) || undefined });
  return { data: items, meta: { total, page: p.page, limit: p.limit } };
});
