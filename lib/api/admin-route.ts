import type { NextRequest, NextResponse } from "next/server";
import type { Role, User } from "@prisma/client";
import { apiError, apiSuccess, handleApiError, ApiValidationError } from "@/lib/api/response";
import { requireRole, assertSameOrigin } from "@/lib/api/auth-guard";
import { parseJsonBody } from "@/lib/api/validation";
import type { Raw } from "@/lib/admin/input";

export const ADMIN_ROLE: Role = "ADMIN";
export const STAFF_ROLE: Role = "EDITOR"; // EDITOR and ADMIN

interface Ctx<P> {
  user: User;
  request: NextRequest;
  params: P;
  /** Parsed JSON body (only for non-GET/DELETE methods). */
  body: Raw;
}

/**
 * Wrap an admin API handler: same-origin check on mutations, requireRole(minRole)
 * (401 logged-out / 403 insufficient role, re-checked against the DB), JSON body parsing,
 * uniform error handling, `Cache-Control: no-store`.
 */
export function adminRoute<P = Record<string, string>>(
  label: string,
  minRole: Role,
  handler: (c: Ctx<P>) => Promise<{ data: unknown; meta?: Record<string, unknown>; status?: number }>,
  opts: { hasBody?: boolean } = {}
) {
  return async (request: NextRequest, context: { params: P }): Promise<NextResponse> => {
    try {
      if (request.method !== "GET") {
        assertSameOrigin(request);
      }
      const user = await requireRole(minRole);
      const body = opts.hasBody ? await parseJsonBody(request) : {};
      const r = await handler({ user, request, params: context.params, body });
      return apiSuccess(r.data, r.meta ?? {}, { status: r.status ?? 200, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof ApiValidationError) return handleApiError(error, label);
      return handleApiError(error, label);
    }
  };
}
