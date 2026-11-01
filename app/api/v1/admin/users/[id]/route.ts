import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = { id: string };
/** PATCH { role } — ADMIN only; cannot demote the last active admin. */
export const PATCH = adminRoute<P>("PATCH admin/users/[id]", ADMIN_ROLE, async ({ params, body }) => ({ data: await S.changeUserRole(I.idParam(params.id), body) }), { hasBody: true });
