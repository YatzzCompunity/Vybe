import { SubscriberStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { generateConfirmationTokenPair } from "@/lib/api/newsletter-token";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { assertSameOrigin } from "@/lib/api/auth-guard";
import {
  apiError,
  apiSuccess,
  ApiValidationError,
  handleApiError,
} from "@/lib/api/response";
import {
  validateEmail,
  validateNewsletterFrequency,
} from "@/lib/api/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/newsletter/subscribe
 *
 * Initiates a double-opt-in newsletter subscription:
 * - Rate-limited per client IP (10 requests / 60 seconds).
 * - Validates `email` format and optional `frequencyPreference` (`DAILY` | `WEEKLY` | `BREAKING_ONLY`).
 * - Generates a random 32-byte token and stores ONLY its SHA-256 hash (`confirmTokenHash`)
 *   with `status = PENDING_CONFIRMATION`.
 * - Never returns or logs the raw confirmation token.
 * - Returns an identical generic success message regardless of whether the email already existed.
 * - TODO (Phase 4+): Integrate transactional email provider to send confirmation emails.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch (err) {
    if (err instanceof ApiValidationError) return handleApiError(err, "POST /api/v1/newsletter/subscribe");
    throw err;
  }
  const rateLimit = checkRateLimit(request, "newsletter:subscribe");
  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many subscription requests from this IP. Please try again later.",
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
    const frequencyPreference = validateNewsletterFrequency(
      body.frequencyPreference
    );

    // Generate cryptographically random token; store ONLY its SHA-256 hash.
    // Raw token is intentionally discarded until an email provider is configured in a later phase.
    const { tokenHash } = generateConfirmationTokenPair();

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        status: SubscriberStatus.PENDING_CONFIRMATION,
        frequencyPreference,
        confirmTokenHash: tokenHash,
      },
      update: {
        status: SubscriberStatus.PENDING_CONFIRMATION,
        frequencyPreference,
        confirmTokenHash: tokenHash,
        unsubscribedAt: null,
      },
    });

    return apiSuccess(
      {
        message:
          "Subscription request received. If this email address is eligible, a confirmation link will be sent once transactional email delivery is enabled.",
        status: SubscriberStatus.PENDING_CONFIRMATION,
      },
      {
        doubleOptIn: true,
        emailDelivery: "TODO_LATER_PHASE",
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
      "POST /api/v1/newsletter/subscribe",
      rateLimit.headers
    );
  }
}
