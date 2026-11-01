import { adminRoute, STAFF_ROLE } from "@/lib/api/admin-route";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiError, ApiValidationError } from "@/lib/api/response";
import { generateAiDraft } from "@/lib/ai/draft-service";
import { AiConfigurationError, AiGenerationError } from "@/lib/ai/provider";
import * as I from "@/lib/admin/input";

export const dynamic = "force-dynamic";

type P = Record<string, never>;

/**
 * POST /api/v1/admin/ai/drafts
 * Generates an AI-assisted draft from an approved lead or editorial input.
 * Rate-limited: 10 requests per minute per admin IP to prevent cost runaway.
 * HARD GUARDRAIL: Result is ALWAYS status: "DRAFT" or "IN_REVIEW", never "PUBLISHED".
 * (EDITOR+)
 */
export const POST = adminRoute<P>(
  "POST admin/ai/drafts",
  STAFF_ROLE,
  async ({ request, user, body }) => {
    // 1. Enforce rate limiting
    const rl = checkRateLimit(request, "admin_ai_drafts", 10, 60_000);
    if (!rl.allowed) {
      throw new ApiValidationError(
        `AI draft generation rate limit exceeded. Retry in ${rl.retryAfterSeconds} seconds.`,
        { status: 429, code: "RATE_LIMITED" }
      );
    }

    // 2. Parse request options
    const leadId = I.str(body, "leadId", { max: 100 });
    const categoryId = I.str(body, "categoryId", { max: 100 });
    const authorId = I.str(body, "authorId", { max: 100 });
    const editorialPrompt = I.str(body, "editorialPrompt", { max: 2000, multiline: true });
    const verifiedFacts = I.str(body, "verifiedFacts", { max: 5000, multiline: true });

    try {
      const result = await generateAiDraft(
        {
          leadId: leadId || undefined,
          categoryId: categoryId || undefined,
          authorId: authorId || undefined,
          editorialPrompt: editorialPrompt || undefined,
          verifiedFacts: verifiedFacts || undefined,
        },
        user.id
      );

      return {
        data: {
          article: result.article,
          qualityReport: result.qualityReport,
          generatedMetadata: result.generatedMetadata,
        },
        status: 201,
      };
    } catch (err: unknown) {
      if (err instanceof AiConfigurationError) {
        throw new ApiValidationError(err.message, {
          status: 503,
          code: "AI_PROVIDER_NOT_CONFIGURED" as unknown as "VALIDATION_ERROR",
        });
      }
      if (err instanceof AiGenerationError) {
        throw new ApiValidationError(err.message, {
          status: err.statusCode || 502,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
      throw err;
    }
  },
  { hasBody: true }
);
