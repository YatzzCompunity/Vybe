/**
 * ============================================================================
 * VYBE Media Platform — AI Content Pipeline Hard Guardrails
 * ============================================================================
 *
 * HARD GUARDRAIL: AI Auto-Publish Protection
 *
 * Shipped default configuration:
 *   AI_AUTO_PUBLISH="false"
 *   AI_AUTO_PUBLISH_ENABLED_BY_ADMIN="false"
 *
 * Architectural Rules:
 * 1. AI-generated or AI-assisted content can NEVER become PUBLISHED directly
 *    from generation. Every AI draft is created in status DRAFT or IN_REVIEW.
 * 2. Public API visibility is strictly gated: only articles with status=PUBLISHED
 *    and publishedAt <= now are visible on public feeds.
 * 3. Even if AI_AUTO_PUBLISH is set to "true" in the environment, automated
 *    publishing is BLOCKED by code unless a secondary, explicit admin override
 *    flag `AI_AUTO_PUBLISH_ENABLED_BY_ADMIN="true"` is ALSO set.
 * 4. In all normal operation, publication of an AI-assisted article requires
 *    an authenticated EDITOR or ADMIN explicitly clicking "Publish" in the
 *    admin interface after reviewing factual accuracy and quality checks.
 *
 * ============================================================================
 */

import { Role } from "@prisma/client";

export class AiGuardrailViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiGuardrailViolationError";
  }
}

/**
 * Checks whether the environment configuration permits any form of automated publishing.
 * Default is strictly FALSE.
 * Requires BOTH AI_AUTO_PUBLISH=true AND AI_AUTO_PUBLISH_ENABLED_BY_ADMIN=true.
 */
export function isAutoPublishPermitted(): boolean {
  const primaryFlag = process.env.AI_AUTO_PUBLISH?.trim().toLowerCase() === "true";
  const secondaryAdminOverride =
    process.env.AI_AUTO_PUBLISH_ENABLED_BY_ADMIN?.trim().toLowerCase() === "true";

  return primaryFlag && secondaryAdminOverride;
}

/**
 * Asserts that a publication action on an article satisfies guardrails:
 * - If the article is AI-assisted (`isAiAssisted: true`), human approval
 *   by an EDITOR or ADMIN is mandatory.
 */
export function assertCanPublishAiArticle(
  article: { isAiAssisted: boolean },
  actorRole?: Role | string
): void {
  if (!article.isAiAssisted) {
    return;
  }

  // Publication must be performed by a human EDITOR or ADMIN
  if (actorRole !== "ADMIN" && actorRole !== "EDITOR") {
    throw new AiGuardrailViolationError(
      "HARD GUARDRAIL VIOLATION: AI-assisted content cannot be published without explicit approval by an EDITOR or ADMIN."
    );
  }
}
