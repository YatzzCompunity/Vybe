import { adminRoute, STAFF_ROLE } from "@/lib/api/admin-route";
import * as SourceService from "@/lib/ai/source-service";

export const dynamic = "force-dynamic";

type P = { id: string };

/**
 * GET /api/v1/admin/sources/:id
 * (EDITOR+)
 */
export const GET = adminRoute<P>("GET admin/sources/:id", STAFF_ROLE, async ({ params }) => {
  const item = await SourceService.getSource(params.id);
  return { data: item };
});

/**
 * PATCH /api/v1/admin/sources/:id
 * (EDITOR+)
 */
export const PATCH = adminRoute<P>(
  "PATCH admin/sources/:id",
  STAFF_ROLE,
  async ({ params, body }) => {
    const updated = await SourceService.updateSource(params.id, body);
    return { data: updated };
  },
  { hasBody: true }
);

/**
 * DELETE /api/v1/admin/sources/:id
 * (EDITOR+)
 */
export const DELETE = adminRoute<P>("DELETE admin/sources/:id", STAFF_ROLE, async ({ params }) => {
  const res = await SourceService.deleteSource(params.id);
  return { data: res };
});
