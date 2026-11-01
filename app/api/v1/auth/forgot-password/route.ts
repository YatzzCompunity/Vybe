import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } from "@/lib/api/rate-limit";
import { enforceRateLimit } from "@/lib/api/auth-guard";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/api/auth-token";
import { parseJsonBody, validateEmail } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const GENERIC = "If an account exists for that email, password reset instructions will be sent.";

/**
 * POST /api/v1/auth/forgot-password — { email }.
 * Stores sha256(token) + 1h expiry. Identical response whether or not the email exists.
 * TODO (Phase 5): send the raw token by email via a transactional provider. NOT sent today;
 * the raw token is discarded (never stored or logged).
 */
export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "auth:forgot", AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS);
    const body = await parseJsonBody(request);
    const email = validateEmail(body.email);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
    if (user?.isActive) {
      const { tokenHash } = generateResetToken();
      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: tokenHash, resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
      });
    }
    return apiSuccess({ message: GENERIC }, {}, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "POST /api/v1/auth/forgot-password");
  }
}
