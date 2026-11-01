/**
 * ============================================================================
 * VYBE Media Platform — AI Draft Generation & Editorial Pipeline Service
 * ============================================================================
 *
 * Orchestrates:
 * Approved Lead + Verified Facts -> LLM Provider -> Quality Checks -> Saved Draft
 *
 * HARD GUARDRAIL:
 * Created articles are ALWAYS saved with status: "DRAFT" (or "IN_REVIEW") and
 * publishedAt: null. They are NEVER directly published.
 * ============================================================================
 */

import prisma from "@/lib/db";
import * as I from "@/lib/admin/input";
import type { Raw } from "@/lib/admin/input";
import { callLlmDraftGeneration } from "./provider";
import { runQualityCheck } from "./quality-check";
import type { StoredAiMetadata } from "./types";
import { getLead } from "./lead-service";

export interface GenerateDraftOptions {
  leadId?: string;
  authorId?: string;
  categoryId?: string;
  editorialPrompt?: string;
  verifiedFacts?: string;
}

export async function generateAiDraft(opts: GenerateDraftOptions, actorId: string) {
  let leadTitle = "";
  let leadUrl = "";
  let summary = "";
  let verifiedFacts = opts.verifiedFacts || "";
  let sourceName = "";
  let sourceDomain = "";
  let sourceId: string | undefined = undefined;
  let targetCategorySlug = "music";

  // 1. If leadId is provided, pull and validate lead
  if (opts.leadId) {
    const lead = await getLead(opts.leadId);
    leadTitle = lead.title;
    leadUrl = lead.url;
    summary = lead.summary;
    verifiedFacts = opts.verifiedFacts || lead.verifiedFacts || summary;
    sourceName = lead.source.name;
    sourceDomain = lead.source.domain;
    sourceId = lead.source.id;
  }

  // 2. Resolve Category
  let categoryId = opts.categoryId;
  if (!categoryId) {
    const defaultCat = await prisma.category.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    if (!defaultCat) throw I.bad("No active categories found in database.");
    categoryId = defaultCat.id;
    targetCategorySlug = defaultCat.slug;
  } else {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw I.bad("Specified categoryId does not exist.");
    targetCategorySlug = cat.slug;
  }

  // 3. Resolve Author
  let authorId = opts.authorId;
  if (!authorId) {
    // Default to the actor's author profile or the first staff author
    const author = await prisma.author.findFirst({
      where: { isStaff: true },
    });
    if (!author) throw I.bad("No author profile found in database.");
    authorId = author.id;
  } else {
    const author = await prisma.author.findUnique({ where: { id: authorId } });
    if (!author) throw I.bad("Specified authorId does not exist.");
  }

  // 4. Call LLM Provider (Fails honestly with AiConfigurationError if no API key is set)
  const generated = await callLlmDraftGeneration({
    leadId: opts.leadId,
    leadTitle,
    leadUrl,
    sourceName,
    sourceDomain,
    summary,
    verifiedFacts,
    targetCategorySlug,
    editorialPrompt: opts.editorialPrompt,
  });

  // 5. Run Quality Checks
  const qualityReport = await runQualityCheck({
    title: generated.title,
    excerpt: generated.excerpt,
    bodyMarkdown: generated.bodyMarkdown,
    tags: generated.tags,
    categoryId,
    categorySlug: targetCategorySlug,
    sourcesCited: generated.sourcesCited,
    confidenceScore: generated.confidenceScore,
    unverifiedClaims: generated.unverifiedClaims,
    seoMetadata: {
      metaTitle: generated.seoSuggestion.metaTitle,
      metaDescription: generated.seoSuggestion.metaDescription,
      ogTitle: generated.seoSuggestion.ogTitle,
      ogDescription: generated.seoSuggestion.ogDescription,
    },
  });

  // 6. Ensure slug uniqueness
  let slug = I.slugify(generated.slugSuggestion || generated.title);
  const existingWithSlug = await prisma.article.findUnique({ where: { slug } });
  if (existingWithSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // 7. Resolve or create tags
  const tagIds: string[] = [];
  if (generated.tags && generated.tags.length > 0) {
    for (const rawTag of generated.tags) {
      const tagSlug = I.slugify(rawTag);
      if (!tagSlug) continue;
      const tag = await prisma.tag.upsert({
        where: { slug: tagSlug },
        update: {},
        create: {
          slug: tagSlug,
          name: rawTag.slice(0, 40),
        },
      });
      tagIds.push(tag.id);
    }
  }

  // 8. Prepare metadata payload
  const aiMetadata: StoredAiMetadata = {
    modelUsed: generated.modelUsed,
    generatedAt: new Date().toISOString(),
    leadId: opts.leadId,
    leadUrl,
    sourceName,
    imagePrompt: generated.imagePrompt,
    sourcesCited: generated.sourcesCited,
    unverifiedClaims: generated.unverifiedClaims,
    qualityReport,
  };

  // 9. HARD GUARDRAIL: Status is NEVER PUBLISHED. Low confidence goes to IN_REVIEW, otherwise DRAFT.
  const articleStatus = qualityReport.needsReview ? "IN_REVIEW" : "DRAFT";

  // Reading time estimate
  const readingTime = Math.max(
    1,
    Math.round(generated.bodyMarkdown.split(/\s+/).filter(Boolean).length / 220)
  );

  // 10. Create SEOMetadata and Article in transaction
  const article = await prisma.$transaction(async (tx) => {
    const seo = await tx.sEOMetadata.create({
      data: {
        metaTitle: generated.seoSuggestion.metaTitle,
        metaDescription: generated.seoSuggestion.metaDescription,
        ogTitle: generated.seoSuggestion.ogTitle,
        ogDescription: generated.seoSuggestion.ogDescription,
        twitterCardType: "summary_large_image",
      },
    });

    const newArticle = await tx.article.create({
      data: {
        slug,
        title: generated.title,
        subtitle: generated.subtitle ?? null,
        excerpt: generated.excerpt,
        bodyMarkdown: generated.bodyMarkdown,
        status: articleStatus,
        isAiAssisted: true,
        publishedAt: null, // HARD GUARDRAIL: Never published on generation
        readingTimeMinutes: readingTime,
        categoryId: categoryId!,
        authorId: authorId!,
        sourceId: sourceId ?? null,
        seoMetadataId: seo.id,
        editorialNote: `AI-assisted draft generated via ${generated.modelUsed}. Source cited: ${
          sourceName || "Editor facts"
        }. Review before publication.`,
        aiMetadataJson: JSON.stringify(aiMetadata),
        articleTags: {
          create: tagIds.map((tId) => ({ tagId: tId })),
        },
      },
      include: {
        category: { select: { id: true, slug: true, name: true } },
        author: { select: { id: true, penName: true } },
        articleTags: { select: { tag: { select: { slug: true } } } },
        seoMetadata: true,
        source: { select: { id: true, name: true, domain: true, trustTier: true } },
      },
    });

    // If converted from a lead, mark the lead as CONVERTED
    if (opts.leadId) {
      await tx.lead.update({
        where: { id: opts.leadId },
        data: {
          status: "CONVERTED",
          convertedArticleId: newArticle.id,
        },
      });
    }

    return newArticle;
  });

  return {
    article,
    qualityReport,
    generatedMetadata: aiMetadata,
  };
}
