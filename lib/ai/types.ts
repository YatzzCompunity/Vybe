/**
 * ============================================================================
 * VYBE Media Platform — AI Pipeline Types & Interfaces
 * ============================================================================
 */

import type { SourceType, LeadStatus } from "@prisma/client";

export interface QualityCheckIssue {
  type: string;
  message: string;
  snippet?: string;
}

export interface FactualAccuracyReport {
  sourcesCited: string[];
  confidenceLevel: number; // 0.0 to 1.0
  unverifiedClaims: string[];
  hasVerifiedSource: boolean;
  flags: string[];
}

export interface GrammarReport {
  passed: boolean;
  issues: QualityCheckIssue[];
}

export interface SimilarArticleMatch {
  id: string;
  slug: string;
  title: string;
  similarity: number; // 0.0 to 1.0
}

export interface DuplicateRiskReport {
  passed: boolean;
  isExactDuplicate: boolean;
  highestSimilarity: number;
  similarArticles: SimilarArticleMatch[];
  flags: string[];
}

export interface SeoCompletenessReport {
  passed: boolean;
  metaTitleLength: number;
  metaDescriptionLength: number;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  issues: string[];
}

export interface HeadingItem {
  level: number;
  text: string;
}

export interface HeadingHierarchyReport {
  passed: boolean;
  headingsFound: HeadingItem[];
  issues: string[];
}

export interface InternalLinkSuggestion {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  relevanceReason: string;
}

export interface FullQualityReport {
  passed: boolean;
  score: number; // 0 to 100
  needsReview: boolean;
  factualAccuracy: FactualAccuracyReport;
  grammarSpelling: GrammarReport;
  duplicateRisk: DuplicateRiskReport;
  seoCompleteness: SeoCompletenessReport;
  headingHierarchy: HeadingHierarchyReport;
  internalLinks: {
    suggestions: InternalLinkSuggestion[];
  };
  checkedAt: string;
}

export interface GeneratedDraftOutput {
  title: string;
  slugSuggestion: string;
  subtitle?: string;
  excerpt: string;
  bodyMarkdown: string;
  categorySlug?: string;
  tags: string[];
  seoSuggestion: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
  };
  imagePrompt: string; // Art direction prompt only (no generated image)
  unverifiedClaims: string[];
  sourcesCited: string[];
  confidenceScore: number;
  modelUsed: string;
}

export interface DraftGenerationInput {
  leadId?: string;
  leadTitle?: string;
  leadUrl?: string;
  sourceName?: string;
  sourceDomain?: string;
  summary?: string;
  verifiedFacts?: string;
  targetCategorySlug?: string;
  editorialPrompt?: string;
}

export interface StoredAiMetadata {
  modelUsed: string;
  generatedAt: string;
  leadId?: string;
  leadUrl?: string;
  sourceName?: string;
  imagePrompt?: string;
  sourcesCited: string[];
  unverifiedClaims: string[];
  qualityReport?: FullQualityReport;
}
