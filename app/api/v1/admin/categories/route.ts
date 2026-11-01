import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = Record<string, never>;
/** GET list (EDITOR+). POST create (EDITOR+). */
export const GET = adminRoute<P>("GET admin/categories", STAFF_ROLE, async () => { const data = await S.listCategories(); return { data, meta: { count: data.length } }; });
export const POST = adminRoute<P>("POST admin/categories", STAFF_ROLE, async ({ body }) => ({ data: await S.createCategory(body), status: 201 }), { hasBody: true });
