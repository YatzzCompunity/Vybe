import { adminRoute, STAFF_ROLE } from "@/lib/api/admin-route";
import { scanAllowlistedSources } from "@/lib/ai/scanner";

export const dynamic = "force-dynamic";

type P = Record<string, never>;

/**
 * POST /api/v1/admin/ai/scan
 * Manually trigger allowlisted sources inspection and pending leads audit.
 * (EDITOR+)
 */
export const POST = adminRoute<P>("POST admin/ai/scan", STAFF_ROLE, async ({ user }) => {
  const result = await scanAllowlistedSources(`admin-${user.displayName}`);
  return { data: result };
});
