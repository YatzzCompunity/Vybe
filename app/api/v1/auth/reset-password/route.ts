import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } from "@/lib/api/rate-limit";
import { enforceRateLimit } from "@/lib/api/auth-guard";
import { hashToken } from "@/lib/api/auth-token";
import { parseJsonBody, validatePassword } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

/** POST /api/v1/auth/reset-password — { token, password }. Single-use, expiring token (hash compared). */
export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "auth:reset", AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS);
    const body = await parseJsonBody(request);
    const password = validatePassword(body.password);
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return apiError("INVALID_OR_EXPIRED_TOKEN", "Invalid or expired reset token.", 400);
    }
    const user = await prisma.user.findFirst({
      where: { resetTokenHash: hashToken(token), resetTokenExpiresAt: { gt: new Date() }, isActive: true },
      select: { id: true },
    });
    if (!user) {
      return apiError("INVALID_OR_EXPIRED_TOKEN", "Invalid or expired reset token.", 400);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 12), resetTokenHash: null, resetTokenExpiresAt: null },
    });
    return apiSuccess({ message: "Password updated. You can now log in." }, {}, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "POST /api/v1/auth/reset-password");
  }
}
