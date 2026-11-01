import { adminRoute, ADMIN_ROLE, STAFF_ROLE } from "@/lib/api/admin-route";
import * as S from "@/lib/admin/service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = { id: string };
/** PATCH { action: "approve" | "reject" } (EDITOR+). */
export const PATCH = adminRoute<P>("PATCH admin/comments/[id]", STAFF_ROLE, async ({ params, body, user }) => {
  const action = I.oneOf(body, "action", ["approve", "reject"] as const);
  if (!action) throw I.bad("'action' must be approve or reject.");
  return { data: await S.moderateComment(I.idParam(params.id), action, user) };
}, { hasBody: true });
/** DELETE (EDITOR+). */
export const DELETE = adminRoute<P>("DELETE admin/comments/[id]", STAFF_ROLE, async ({ params }) => ({ data: await S.deleteComment(I.idParam(params.id)) }));
