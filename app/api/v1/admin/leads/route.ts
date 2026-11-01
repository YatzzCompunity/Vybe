import { adminRoute, STAFF_ROLE } from "@/lib/api/admin-route";
import * as LeadService from "@/lib/ai/lead-service";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = Record<string, never>;

/**
 * GET /api/v1/admin/leads
 * Query params: ?status=NEW|APPROVED|REJECTED|CONVERTED&sourceId=&search=&page=&limit=
 * (EDITOR+)
 */
export const GET = adminRoute<P>("GET admin/leads", STAFF_ROLE, async ({ request }) => {
  const sp = request.nextUrl.searchParams;
  const p = I.pageParams(sp);
  const status = sp.get("status") || undefined;
  const sourceId = sp.get("sourceId") || undefined;
  const search = sp.get("search")?.slice(0, 100) || undefined;

  const { items, total } = await LeadService.listLeads({
    ...p,
    status,
    sourceId,
    search,
  });

  return { data: items, meta: { total, page: p.page, limit: p.limit } };
});

/**
 * POST /api/v1/admin/leads
 * Ingest or record an editorial lead (URL domain must be on the Source allowlist)
 * (EDITOR+)
 */
export const POST = adminRoute<P>(
  "POST admin/leads",
  STAFF_ROLE,
  async ({ body }) => {
    const created = await LeadService.createLead(body);
    return { data: created, status: 201 };
  },
  { hasBody: true }
);
