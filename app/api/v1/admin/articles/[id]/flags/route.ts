import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = { id: string };
/** PATCH { isFeatured?, isTrending?, trendingRank? } (EDITOR+). */
export const PATCH = adminRoute<P>("PATCH admin/articles/[id]/flags", STAFF_ROLE, async ({ params, body }) => ({ data: await S.setFlags(I.idParam(params.id), body) }), { hasBody: true });
