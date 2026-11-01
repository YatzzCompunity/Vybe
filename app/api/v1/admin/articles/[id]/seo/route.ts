import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = { id: string };
export const GET = adminRoute<P>("GET admin/articles/[id]/seo", STAFF_ROLE, async ({ params }) => ({ data: await S.getSeo(I.idParam(params.id)) }));
/** PUT { slug?, metaTitle?, metaDescription?, canonicalUrl?, ogTitle?, ogDescription?, ogImageUrl?, twitterCardType?, noIndex?, noFollow? } (EDITOR+). */
export const PUT = adminRoute<P>("PUT admin/articles/[id]/seo", STAFF_ROLE, async ({ params, body }) => ({ data: await S.updateSeo(I.idParam(params.id), body) }), { hasBody: true });
