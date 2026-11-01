import { SubscriberStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { hashConfirmationToken } from "@/lib/api/newsletter-token";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { validateConfirmationToken } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const TOKEN_MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * GET /api/v1/newsletter/confirm?token=...
 *
 * Verifies a newsletter confirmation token by comparing its SHA-256 hash
 * against `NewsletterSubscriber.confirmTokenHash`.
 * - Marks the subscriber `SUBSCRIBED`, records `confirmedAt`, and clears
 *   `confirmTokenHash` (single-use token).
 * - Returns a generic 400 error for invalid, already-used, or expired tokens.
 */
export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "newsletter:confirm");
  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many confirmation attempts from this IP. Please try again later.",
      429,
      { headers: rateLimit.headers }
    );
  }

  try {
    const rawToken = validateConfirmationToken(
      request.nextUrl.searchParams.get("token")
    );
    const tokenHash = hashConfirmationToken(rawToken);

    const subscriber = await prisma.newsletterSubscriber.findFirst({
      where: {
        confirmTokenHash: tokenHash,
      },
    });

    if (
      !subscriber ||
      subscriber.status !== SubscriberStatus.PENDING_CONFIRMATION
    ) {
      return apiError(
        "INVALID_OR_EXPIRED_TOKEN",
        "The confirmation token is invalid or has expired.",
        400,
        { headers: rateLimit.headers }
      );
    }

    const ageMs = Date.now() - subscriber.createdAt.getTime();
    if (ageMs > TOKEN_MAX_AGE_MS) {
      return apiError(
        "INVALID_OR_EXPIRED_TOKEN",
        "The confirmation token is invalid or has expired.",
        400,
        { headers: rateLimit.headers }
      );
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: SubscriberStatus.SUBSCRIBED,
        confirmedAt: new Date(),
        unsubscribedAt: null,
        confirmTokenHash: null,
      },
    });

    return apiSuccess(
      {
        message: "Your newsletter subscription has been confirmed.",
        status: SubscriberStatus.SUBSCRIBED,
      },
      {
        confirmed: true,
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
      "GET /api/v1/newsletter/confirm",
      rateLimit.headers
    );
  }
}
