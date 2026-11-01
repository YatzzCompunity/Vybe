import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = { id: string };
/** POST — publish now (EDITOR+). */
export const POST = adminRoute<P>("POST admin/articles/[id]/publish", STAFF_ROLE, async ({ params, user }) => ({ data: await S.publishArticle(I.idParam(params.id), user) }));
