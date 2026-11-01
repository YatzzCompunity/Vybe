import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = { id: string };
/** PATCH edit (EDITOR+). DELETE is ADMIN only and returns 409 while the record is still in use. */
export const PATCH = adminRoute<P>("PATCH admin/tags/[id]", STAFF_ROLE, async ({ params, body }) => ({ data: await S.updateTag(I.idParam(params.id), body) }), { hasBody: true });
export const DELETE = adminRoute<P>("DELETE admin/tags/[id]", ADMIN_ROLE, async ({ params, request }) => ({ data: await S.deleteTag(I.idParam(params.id), request.nextUrl.searchParams.get("force") === "true") }));
