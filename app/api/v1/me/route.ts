import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { WRITE_RATE_LIMIT_MAX, WRITE_RATE_LIMIT_WINDOW_MS } from "@/lib/api/rate-limit";
import { enforceRateLimit, requireUser } from "@/lib/api/auth-guard";
import { parseJsonBody, validateAvatarUrl, validateDisplayName } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const PROFILE_SELECT = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  emailVerifiedAt: true,
  createdAt: true,
} as const;

const NO_STORE = { "Cache-Control": "no-store" };

/** GET /api/v1/me — the signed-in user's own profile (never includes hashes/tokens). */
export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: PROFILE_SELECT });
    return apiSuccess(profile, {}, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, "GET /api/v1/me");
  }
}

/**
 * PATCH /api/v1/me — { displayName?, avatarUrl? }. Only these fields are accepted;
 * role/email/isActive in the body are ignored (no mass-assignment). Target is ALWAYS the session user.
 */
export async function PATCH(request: NextRequest) {
  try {
    enforceRateLimit(request, "me:update", WRITE_RATE_LIMIT_MAX, WRITE_RATE_LIMIT_WINDOW_MS);
    const user = await requireUser();
    const body = await parseJsonBody(request);
    const data: { displayName?: string; avatarUrl?: string | null } = {};
    if ("displayName" in body) data.displayName = validateDisplayName(body.displayName);
    if ("avatarUrl" in body) data.avatarUrl = validateAvatarUrl(body.avatarUrl);
    const updated = await prisma.user.update({ where: { id: user.id }, data, select: PROFILE_SELECT });
    return apiSuccess(updated, {}, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, "PATCH /api/v1/me");
  }
}
