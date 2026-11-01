import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = { id: string };

export const GET = adminRoute<P>("GET admin/articles/[id]", STAFF_ROLE, async ({ params }) => ({ data: await S.getArticle(I.idParam(params.id)) }));

/** PATCH — edit content fields (never status/publishedAt). (EDITOR+) */
export const PATCH = adminRoute<P>("PATCH admin/articles/[id]", STAFF_ROLE, async ({ params, body }) => ({ data: await S.updateArticle(I.idParam(params.id), body) }), { hasBody: true });

/** DELETE — ADMIN only; 409 while the article is PUBLISHED/scheduled (unpublish first). */
export const DELETE = adminRoute<P>("DELETE admin/articles/[id]", ADMIN_ROLE, async ({ params }) => ({ data: await S.deleteArticle(I.idParam(params.id)) }));
