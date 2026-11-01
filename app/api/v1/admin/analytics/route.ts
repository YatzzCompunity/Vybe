import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = Record<string, never>;
/** GET — real DB counts only; pageviews are not tracked (EDITOR+). */
export const GET = adminRoute<P>("GET admin/analytics", STAFF_ROLE, async () => ({ data: await S.getAnalytics() }));
