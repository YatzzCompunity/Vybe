import { adminRoute, STAFF_ROLE } from "@/lib/api/admin-route";
import * as SourceService from "@/lib/ai/source-service";

export const dynamic = "force-dynamic";

type P = Record<string, never>;

/**
 * GET /api/v1/admin/sources
 * Query params: ?isEnabled=true|false&search=
 * (EDITOR+)
 */
export const GET = adminRoute<P>("GET admin/sources", STAFF_ROLE, async ({ request }) => {
  const sp = request.nextUrl.searchParams;
  const isEnabledParam = sp.get("isEnabled");
  const isEnabled = isEnabledParam !== null ? isEnabledParam === "true" : undefined;
  const search = sp.get("search")?.slice(0, 100) || undefined;

  const items = await SourceService.listSources({ isEnabled, search });
  return { data: items, meta: { total: items.length } };
});

/**
 * POST /api/v1/admin/sources
 * Create a new news source on the allowlist
 * (EDITOR+)
 */
export const POST = adminRoute<P>(
  "POST admin/sources",
  STAFF_ROLE,
  async ({ body }) => {
    const created = await SourceService.createSource(body);
    return { data: created, status: 201 };
  },
  { hasBody: true }
);
