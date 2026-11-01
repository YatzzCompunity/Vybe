import { SubscriberStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { assertSameOrigin } from "@/lib/api/auth-guard";
import {
  apiError,
  apiSuccess,
  ApiValidationError,
  handleApiError,
} from "@/lib/api/response";
import { validateEmail } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/newsletter/unsubscribe
 *
 * Marks a newsletter subscriber as `UNSUBSCRIBED` and clears any pending
 * confirmation token hash.
 * - Rate-limited per client IP (10 requests / 60 seconds).
 * - Validates `email` format in JSON body `{ "email": "..." }`.
 * - Returns a generic success response without disclosing whether the email
 *   was previously subscribed.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch (err) {
    if (err instanceof ApiValidationError) return handleApiError(err, "POST /api/v1/newsletter/unsubscribe");
    throw err;
  }
  const rateLimit = checkRateLimit(request, "newsletter:unsubscribe");
  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many unsubscribe requests from this IP. Please try again later.",
      429,
      { headers: rateLimit.headers }
    );
  }

  try {
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Body is not a JSON object");
      }
      body = parsed as Record<string, unknown>;
    } catch {
      throw new ApiValidationError(
        "Request body must be a valid JSON object.",
        { code: "BAD_REQUEST", status: 400 }
      );
    }

    const email = validateEmail(body.email);

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          status: SubscriberStatus.UNSUBSCRIBED,
          unsubscribedAt: new Date(),
          confirmTokenHash: null,
        },
      });
    }

    return apiSuccess(
      {
        message:
          "If this email address was subscribed, it has been unsubscribed from the newsletter.",
        status: SubscriberStatus.UNSUBSCRIBED,
      },
      {
        unsubscribed: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          ...rateLimit.headers,
        },
      }
    );
  } catch (error: unknown) {
    return handleApiError(
      error,
      "POST /api/v1/newsletter/unsubscribe",
      rateLimit.headers
    );
  }
}
