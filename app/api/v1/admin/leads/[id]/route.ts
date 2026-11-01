import { adminRoute, STAFF_ROLE } from "@/lib/api/admin-route";
import * as LeadService from "@/lib/ai/lead-service";

export const dynamic = "force-dynamic";

type P = { id: string };

/**
 * GET /api/v1/admin/leads/:id
 * (EDITOR+)
 */
export const GET = adminRoute<P>("GET admin/leads/:id", STAFF_ROLE, async ({ params }) => {
  const lead = await LeadService.getLead(params.id);
  return { data: lead };
});

/**
 * PATCH /api/v1/admin/leads/:id
 * (EDITOR+)
 */
export const PATCH = adminRoute<P>(
  "PATCH admin/leads/:id",
  STAFF_ROLE,
  async ({ params, body }) => {
    const updated = await LeadService.updateLead(params.id, body);
    return { data: updated };
  },
  { hasBody: true }
);

/**
 * DELETE /api/v1/admin/leads/:id
 * (EDITOR+)
 */
export const DELETE = adminRoute<P>("DELETE admin/leads/:id", STAFF_ROLE, async ({ params }) => {
  const res = await LeadService.deleteLead(params.id);
  return { data: res };
});
