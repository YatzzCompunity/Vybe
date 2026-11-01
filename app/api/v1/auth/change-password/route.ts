import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } from "@/lib/api/rate-limit";
import { enforceRateLimit, requireUser } from "@/lib/api/auth-guard";
import { parseJsonBody, validatePassword } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

/** POST /api/v1/auth/change-password — { currentPassword, newPassword }. Session required. */
export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "auth:change", AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS);
    const user = await requireUser();
    const body = await parseJsonBody(request);
    const current = validatePassword(body.currentPassword, "currentPassword");
    const next = validatePassword(body.newPassword, "newPassword");
    if (!user.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) {
      return apiError("FORBIDDEN", "Current password is incorrect.", 403);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(next, 12), resetTokenHash: null, resetTokenExpiresAt: null },
    });
    return apiSuccess({ message: "Password changed." }, {}, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "POST /api/v1/auth/change-password");
  }
}
