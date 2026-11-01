import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = { id: string };
/** POST — back to DRAFT, clears publishedAt (EDITOR+). */
export const POST = adminRoute<P>("POST admin/articles/[id]/unpublish", STAFF_ROLE, async ({ params }) => ({ data: await S.unpublishArticle(I.idParam(params.id)) }));
