import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } from "@/lib/api/rate-limit";
import { enforceRateLimit } from "@/lib/api/auth-guard";
import { parseJsonBody, validateDisplayName, validateEmail, validatePassword } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/register — { email, password, displayName }.
 * Creates a READER (role is never client-supplied). Stores only a bcrypt hash (cost 12).
 *
 * Security & Anti-Enumeration Hardening (Phase 10):
 * - Duplicate email no longer returns 409 (which revealed registration status).
 * - Instead, a generic success response (HTTP 201) is returned in both cases.
 * - When an email already exists, dummy bcrypt hashing is performed to equalise CPU timing.
 * - Rate limited to 6 requests/minute/IP with origin verification.
 */
export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "auth:register", AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS);
    const body = await parseJsonBody(request);
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);
    const displayName = validateDisplayName(body.displayName);

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      // Timing equalizer: run bcrypt hash so response latency is indistinguishable
      await bcrypt.hash(password, 12);
      return apiSuccess(
        {
          message: "If this email is not already registered, your account has been created. Please sign in.",
          email,
        },
        {},
        { status: 201, headers: { "Cache-Control": "no-store" } }
      );
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, passwordHash, displayName }, // role defaults to READER
    });
    return apiSuccess(
      {
        message: "If this email is not already registered, your account has been created. Please sign in.",
        email,
      },
      {},
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return handleApiError(error, "POST /api/v1/auth/register");
  }
}
