import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = { id: string };
/** POST { publishedAt: ISO future date } — scheduled; hidden publicly until that time (EDITOR+). */
export const POST = adminRoute<P>("POST admin/articles/[id]/schedule", STAFF_ROLE, async ({ params, body, user }) => ({ data: await S.scheduleArticle(I.idParam(params.id), body, user) }), { hasBody: true });
