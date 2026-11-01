/**
 * Core TypeScript definitions for the VYBE Media Platform (Phase 1 Scaffold).
 * Mirrors the entity architecture documented in `docs/ARCHITECTURE.md`.
 */

export type CategorySlug =
  | "music"
  | "celebrity"
  | "artists"
  | "albums"
  | "singles"
  | "pop-culture"
  | "trending"
  | "interviews"
  | "reviews";

export type ArticleStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type UserRole = "READER" | "AUTHOR" | "EDITOR" | "ADMIN";

export interface CategoryInfo {
  slug: CategorySlug;
  name: string;
  description: string;
  accentColor: string;
}

export interface SampleAuthor {
  id: string;
  slug: string;
  penName: string;
  roleTitle: string;
  bio: string;
}

export interface ArticleSeoMetadata {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  twitterCardType?: "summary" | "summary_large_image";
  noIndex?: boolean;
  noFollow?: boolean;
  structuredDataJson?: string;
}

export interface SampleArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  /**
   * Structured paragraphs of original sample/placeholder text for layout testing.
   * No copied articles or fabricated real-world facts.
   */
  bodyParagraphs: string[];
  categorySlug: CategorySlug;
  author: SampleAuthor;
  tags: string[];
  readingTimeMinutes: number;
  publishedAtIso: string;
  publishedDisplay: string;
  isFeatured: boolean;
  isTrending: boolean;
  trendingRank?: number;
  /**
   * Pure CSS Tailwind gradient class used in place of external/copyrighted photography
   * during Phase 1 layout testing.
   */
  coverGradient: string;
  coverLabel: string;
  /**
   * Explicit marker that this record is sample placeholder content for layout testing only.
   */
  isSamplePlaceholder: true;
  /**
   * Optional custom SEO metadata from Phase 6 SEOMetadata model.
   */
  seoMetadata?: ArticleSeoMetadata;
  /**
   * Record update timestamp (ISO string) for sitemap and structured data modifiedTime.
   */
  updatedAtIso?: string;
}
