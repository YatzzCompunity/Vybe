/**
 * ============================================================================
 * VYBE Media Platform — AI Quality Check Engine
 * ============================================================================
 *
 * Implements rigorous pre-review quality validation:
 * 1. Factual accuracy checklist (sources cited, confidence level, unverified claims)
 * 2. Grammar & spelling heuristics pass
 * 3. Duplicate / plagiarism-risk check against existing articles in database
 * 4. SEO metadata completeness
 * 5. Heading hierarchy validation (H2 before H3, no H1 in body)
 * 6. Internal-link recommendations from published articles
 * ============================================================================
 */

import prisma from "@/lib/db";
import type {
  FullQualityReport,
  FactualAccuracyReport,
  GrammarReport,
  DuplicateRiskReport,
  SeoCompletenessReport,
  HeadingHierarchyReport,
  InternalLinkSuggestion,
  QualityCheckIssue,
  SimilarArticleMatch,
} from "./types";

export interface QualityCheckInput {
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  tags?: string[];
  categoryId?: string;
  categorySlug?: string;
  sourcesCited?: string[];
  confidenceScore?: number;
  unverifiedClaims?: string[];
  seoMetadata?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
  } | null;
  currentArticleId?: string;
}

/**
 * 1. Factual Accuracy Check
 */
function checkFactualAccuracy(input: QualityCheckInput): FactualAccuracyReport {
  const sources = input.sourcesCited?.map((s) => s.trim()).filter(Boolean) || [];
  const unverified = input.unverifiedClaims?.map((c) => c.trim()).filter(Boolean) || [];
  const confidence =
    typeof input.confidenceScore === "number"
      ? Math.max(0, Math.min(1, input.confidenceScore))
      : sources.length > 0
      ? 0.85
      : 0.5;

  const flags: string[] = [];
  if (sources.length === 0) {
    flags.push("No external sources cited. Journalism standards require citing at least one verifiable source.");
  }
  if (unverified.length > 0) {
    flags.push(`${unverified.length} unverified claim(s) flagged. Editor must verify before publishing.`);
  }
  if (confidence < 0.7) {
    flags.push(`Low confidence score (${Math.round(confidence * 100)}%). Manual editorial verification required.`);
  }

  return {
    sourcesCited: sources,
    confidenceLevel: confidence,
    unverifiedClaims: unverified,
    hasVerifiedSource: sources.length > 0,
    flags,
  };
}

/**
 * 2. Grammar & Spelling Pass (Heuristic rules)
 */
function checkGrammarAndSpelling(text: string): GrammarReport {
  const issues: QualityCheckIssue[] = [];

  // Repeated adjacent words (e.g. "the the", "and and")
  const repeatedWordsRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
  let match: RegExpExecArray | null;
  while ((match = repeatedWordsRegex.exec(text)) !== null) {
    issues.push({
      type: "REPEATED_WORD",
      message: `Duplicated word detected: "${match[0]}".`,
      snippet: match[0],
    });
  }

  // Excessive exclamation or question marks
  const excessivePunct = /([!?]{2,}|\.{4,})/;
  const punctMatch = text.match(excessivePunct);
  if (punctMatch) {
    issues.push({
      type: "EXCESSIVE_PUNCTUATION",
      message: `Informal excessive punctuation detected: "${punctMatch[0]}".`,
      snippet: punctMatch[0],
    });
  }

  // Unmatched quotes in markdown text
  const doubleQuotes = (text.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    issues.push({
      type: "UNMATCHED_QUOTES",
      message: "Unmatched double quotation mark found in text.",
    });
  }

  // Unmatched parentheses
  const openParen = (text.match(/\(/g) || []).length;
  const closeParen = (text.match(/\)/g) || []).length;
  if (openParen !== closeParen) {
    issues.push({
      type: "UNMATCHED_PARENTHESES",
      message: `Unmatched parentheses count (${openParen} open vs ${closeParen} closed).`,
    });
  }

  // Very long run-on sentences (> 60 words without sentence-ending punctuation)
  const sentences = text
    .replace(/```[\s\S]*?```/g, "") // ignore code blocks
    .split(/[\n\r.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const s of sentences) {
    const wordCount = s.split(/\s+/).length;
    if (wordCount > 65) {
      issues.push({
        type: "RUN_ON_SENTENCE",
        message: `Run-on sentence detected (${wordCount} words). Consider splitting for editorial clarity.`,
        snippet: s.slice(0, 80) + "...",
      });
      break;
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Tokenize string into a set of lowercased words
 */
function wordSet(str: string): Set<string> {
  const words = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

/**
 * Jaccard similarity between two word sets
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach((item) => {
    if (b.has(item)) intersection++;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * 3. Duplicate / Plagiarism Risk Check
 */
async function checkDuplicateRisk(
  title: string,
  excerpt: string,
  currentArticleId?: string
): Promise<DuplicateRiskReport> {
  const candidates = await prisma.article.findMany({
    where: {
      id: currentArticleId ? { not: currentArticleId } : undefined,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
    },
    take: 50,
  });

  const titleWords = wordSet(title);
  const excerptWords = wordSet(excerpt);

  const similarArticles: SimilarArticleMatch[] = [];
  let highestSimilarity = 0;
  let isExactDuplicate = false;

  for (const item of candidates) {
    // Check exact title match
    if (item.title.trim().toLowerCase() === title.trim().toLowerCase()) {
      isExactDuplicate = true;
      highestSimilarity = 1.0;
      similarArticles.push({
        id: item.id,
        slug: item.slug,
        title: item.title,
        similarity: 1.0,
      });
      continue;
    }

    const otherTitleWords = wordSet(item.title);
    const otherExcerptWords = wordSet(item.excerpt);

    const titleSim = jaccardSimilarity(titleWords, otherTitleWords);
    const excerptSim = jaccardSimilarity(excerptWords, otherExcerptWords);
    const combinedSim = titleSim * 0.7 + excerptSim * 0.3;

    if (combinedSim > highestSimilarity) {
      highestSimilarity = combinedSim;
    }

    if (combinedSim >= 0.35) {
      similarArticles.push({
        id: item.id,
        slug: item.slug,
        title: item.title,
        similarity: Math.round(combinedSim * 100) / 100,
      });
    }
  }

  similarArticles.sort((a, b) => b.similarity - a.similarity);

  const flags: string[] = [];
  if (isExactDuplicate) {
    flags.push("CRITICAL: Exact duplicate title already exists in the database. Cannot be published.");
  } else if (highestSimilarity >= 0.5) {
    flags.push(
      `High similarity (${Math.round(
        highestSimilarity * 100
      )}%) detected with existing content. Review for overlap or duplicate topic reporting.`
    );
  } else if (highestSimilarity >= 0.35) {
    flags.push("Moderate similarity detected with existing published article.");
  }

  return {
    passed: !isExactDuplicate && highestSimilarity < 0.6,
    isExactDuplicate,
    highestSimilarity: Math.round(highestSimilarity * 100) / 100,
    similarArticles: similarArticles.slice(0, 5),
    flags,
  };
}

/**
 * 4. SEO Metadata Completeness Check
 */
function checkSeoCompleteness(
  title: string,
  excerpt: string,
  seo?: QualityCheckInput["seoMetadata"]
): SeoCompletenessReport {
  const metaTitle = seo?.metaTitle || title;
  const metaDescription = seo?.metaDescription || excerpt;
  const ogTitle = seo?.ogTitle;
  const ogDescription = seo?.ogDescription;

  const issues: string[] = [];

  const titleLen = metaTitle.trim().length;
  if (titleLen < 30) {
    issues.push(`Meta title is too short (${titleLen} chars; recommended 40-65 chars).`);
  } else if (titleLen > 70) {
    issues.push(`Meta title is too long (${titleLen} chars; recommended max 65 chars to avoid search truncation).`);
  }

  const descLen = metaDescription.trim().length;
  if (descLen < 80) {
    issues.push(`Meta description is too short (${descLen} chars; recommended 120-160 chars).`);
  } else if (descLen > 200) {
    issues.push(`Meta description exceeds recommended limit (${descLen} chars; max 160 recommended).`);
  }

  const hasOgTitle = Boolean(ogTitle?.trim());
  const hasOgDescription = Boolean(ogDescription?.trim());

  if (!hasOgTitle) {
    issues.push("Open Graph title (ogTitle) is not explicitly set; will fall back to metaTitle.");
  }

  return {
    passed: issues.filter((i) => !i.includes("fall back")).length === 0,
    metaTitleLength: titleLen,
    metaDescriptionLength: descLen,
    hasOgTitle,
    hasOgDescription,
    issues,
  };
}

/**
 * 5. Heading Hierarchy Validation
 */
function checkHeadingHierarchy(bodyMarkdown: string): HeadingHierarchyReport {
  const issues: string[] = [];
  const headingsFound: { level: number; text: string }[] = [];

  const lines = bodyMarkdown.split(/\r?\n/);
  let sawH2 = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (!headingMatch) continue;

    const level = headingMatch[1].length;
    const text = headingMatch[2].trim();
    headingsFound.push({ level, text });

    if (level === 1) {
      issues.push("H1 (#) found in article body. H1 is reserved for the article title. Use H2 (##) instead.");
    } else if (level === 2) {
      sawH2 = true;
    } else if (level === 3 && !sawH2) {
      issues.push(`H3 (### "${text}") appears before any H2 heading in the body. Headings must follow hierarchy.`);
    } else if (level >= 4) {
      issues.push(`Deep heading H${level} ("${text}") used. Journalism articles should keep hierarchy to H2 and H3.`);
    }
  }

  if (!sawH2 && bodyMarkdown.length > 300) {
    issues.push("No H2 (##) section headings found. Long-form articles require structured section headings.");
  }

  return {
    passed: issues.length === 0,
    headingsFound,
    issues,
  };
}

/**
 * 6. Internal Link Recommendations
 */
async function suggestInternalLinks(
  categoryId?: string,
  categorySlug?: string,
  tags?: string[],
  currentArticleId?: string
): Promise<InternalLinkSuggestion[]> {
  const suggestions: InternalLinkSuggestion[] = [];

  // Query published articles matching category or tags
  const published = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      id: currentArticleId ? { not: currentArticleId } : undefined,
      OR: [
        ...(categoryId ? [{ categoryId }] : []),
        ...(categorySlug ? [{ category: { slug: categorySlug } }] : []),
        ...(tags && tags.length > 0
          ? [{ articleTags: { some: { tag: { slug: { in: tags } } } } }]
          : []),
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      category: { select: { slug: true } },
    },
    take: 5,
  });

  for (const a of published) {
    suggestions.push({
      id: a.id,
      slug: a.slug,
      title: a.title,
      categorySlug: a.category.slug,
      relevanceReason: `Related article in ${a.category.slug}`,
    });
  }

  return suggestions;
}

/**
 * Runs full pre-review quality validation checklist.
 */
export async function runQualityCheck(input: QualityCheckInput): Promise<FullQualityReport> {
  const factual = checkFactualAccuracy(input);
  const grammar = checkGrammarAndSpelling(input.bodyMarkdown);
  const duplicate = await checkDuplicateRisk(input.title, input.excerpt, input.currentArticleId);
  const seo = checkSeoCompleteness(input.title, input.excerpt, input.seoMetadata);
  const headings = checkHeadingHierarchy(input.bodyMarkdown);
  const internalLinks = await suggestInternalLinks(
    input.categoryId,
    input.categorySlug,
    input.tags,
    input.currentArticleId
  );

  // Score calculation (0 to 100)
  let score = 100;
  if (factual.flags.length > 0) score -= factual.flags.length * 15;
  if (!factual.hasVerifiedSource) score -= 20;
  if (grammar.issues.length > 0) score -= Math.min(20, grammar.issues.length * 5);
  if (duplicate.highestSimilarity > 0.4) score -= Math.round(duplicate.highestSimilarity * 30);
  if (duplicate.isExactDuplicate) score = 0;
  if (headings.issues.length > 0) score -= headings.issues.length * 5;
  if (seo.issues.length > 0) score -= seo.issues.length * 5;
  score = Math.max(0, Math.min(100, score));

  // Determine if draft needs review / low confidence
  const needsReview =
    factual.confidenceLevel < 0.7 ||
    factual.unverifiedClaims.length > 0 ||
    !factual.hasVerifiedSource ||
    duplicate.highestSimilarity >= 0.35 ||
    duplicate.isExactDuplicate ||
    headings.issues.length > 0 ||
    score < 75;

  const passed = !duplicate.isExactDuplicate && score >= 50;

  return {
    passed,
    score,
    needsReview,
    factualAccuracy: factual,
    grammarSpelling: grammar,
    duplicateRisk: duplicate,
    seoCompleteness: seo,
    headingHierarchy: headings,
    internalLinks: {
      suggestions: internalLinks,
    },
    checkedAt: new Date().toISOString(),
  };
}
