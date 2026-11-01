/**
 * ============================================================================
 * VYBE Media Platform — Prisma Read Repository (`lib/articles.ts`)
 * ============================================================================
 * Primary data-access layer for public read routes (`/`, `/[category]`,
 * `/category/[slug]`, `/[category]/[slug]`, and `/search`).
 *
 * Strategy:
 * 1. Queries the Prisma database (`Article`, `Category`, `Author`, `Tag`,
 *    `ArticleTag`, `TrendingTopic`) when the database is available and seeded.
 * 2. Falls back to `lib/sample-articles.ts` ONLY when the SQLite database file
 *    does not exist yet or is empty (so unseeded CI/build environments never
 *    crash).
 * ============================================================================
 */

import { publicArticleWhere } from "@/lib/publication";
import { ArticleStatus, type Prisma } from "@prisma/client";
import { CATEGORIES, CATEGORY_MAP } from "./config";
import prisma from "./db";
import {
  getAllSampleArticles,
  getCategoryBySlug as getFallbackCategoryBySlug,
  getFeaturedSampleArticles,
  getSampleArticleBySlug,
  getSampleArticlesByCategory,
  getTrendingSampleArticles,
  searchSampleArticles,
} from "./sample-articles";
import type { CategoryInfo, CategorySlug, SampleArticle } from "./types";

type ArticleWithRelations = Prisma.ArticleGetPayload<{
  include: {
    author: true;
    category: true;
    seoMetadata: true;
    articleTags: {
      include: {
        tag: true;
      };
      orderBy: {
        assignedAt: "asc";
      };
    };
  };
}>;

const ARTICLE_INCLUDE = {
  author: true,
  category: true,
  seoMetadata: true,
  articleTags: {
    include: {
      tag: true,
    },
    orderBy: {
      assignedAt: "asc" as const,
    },
  },
} satisfies Prisma.ArticleInclude;

function isValidCategorySlug(slug: string): slug is CategorySlug {
  return slug in CATEGORY_MAP;
}

/**
 * Map a Prisma `Article` record (with `author`, `category`, `articleTags`)
 * into the UI view-model (`SampleArticle`).
 */
function mapPrismaArticleToViewModel(
  record: ArticleWithRelations
): SampleArticle {
  const categorySlug: CategorySlug = isValidCategorySlug(record.category.slug)
    ? record.category.slug
    : "music";
  const categoryDefault = CATEGORY_MAP[categorySlug];

  const bodyParagraphs = record.bodyMarkdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const publishedAtDate = record.publishedAt ?? record.createdAt;

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    subtitle: record.subtitle ?? "",
    excerpt: record.excerpt,
    bodyParagraphs,
    categorySlug,
    author: {
      id: record.author.id,
      slug: record.author.slug,
      penName: record.author.penName,
      roleTitle: record.author.roleTitle,
      bio: record.author.bio,
    },
    tags: record.articleTags.map((at) => at.tag.slug),
    readingTimeMinutes: record.readingTimeMinutes,
    publishedAtIso: publishedAtDate.toISOString(),
    publishedDisplay:
      record.publishedDisplay ??
      (record.isSampleContent
        ? "Sample Fixture • Layout Test"
        : publishedAtDate.toISOString().slice(0, 10)),
    isFeatured: record.isFeatured,
    isTrending: record.isTrending,
    trendingRank: record.trendingRank ?? undefined,
    coverGradient: record.coverGradient ?? categoryDefault.accentColor,
    coverLabel:
      record.coverLabel ??
      `SAMPLE ${categoryDefault.name.toUpperCase()} • PLACEHOLDER`,
    isSamplePlaceholder: true,
    seoMetadata: record.seoMetadata
      ? {
          metaTitle: record.seoMetadata.metaTitle ?? undefined,
          metaDescription: record.seoMetadata.metaDescription ?? undefined,
          canonicalUrl: record.seoMetadata.canonicalUrl ?? undefined,
          ogTitle: record.seoMetadata.ogTitle ?? undefined,
          ogDescription: record.seoMetadata.ogDescription ?? undefined,
          ogImageUrl: record.seoMetadata.ogImageUrl ?? undefined,
          twitterCardType:
            (record.seoMetadata.twitterCardType as
              | "summary"
              | "summary_large_image") ?? "summary_large_image",
          noIndex: record.seoMetadata.noIndex,
          noFollow: record.seoMetadata.noFollow,
          structuredDataJson: record.seoMetadata.structuredDataJson ?? undefined,
        }
      : undefined,
    updatedAtIso: record.updatedAt.toISOString(),
  };
}

/**
 * Fetch all active categories from Prisma ordered by `sortOrder`, falling back
 * to `CATEGORIES` if the database is not yet initialized.
 */
export async function getAllCategories(): Promise<CategoryInfo[]> {
  try {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    if (rows.length === 0) {
      return [...CATEGORIES];
    }
    return rows
      .filter((row): row is typeof row & { slug: CategorySlug } =>
        isValidCategorySlug(row.slug)
      )
      .map((row) => ({
        slug: row.slug,
        name: row.name,
        description: row.description,
        accentColor:
          row.accentColor || CATEGORY_MAP[row.slug].accentColor,
      }));
  } catch {
    return [...CATEGORIES];
  }
}

/**
 * Look up a single active category by slug from Prisma, with build-time
 * fallback to `lib/sample-articles.ts` when the DB is unavailable.
 */
export async function getCategoryBySlug(
  slug: string
): Promise<CategoryInfo | undefined> {
  const normalized = slug.trim().toLowerCase();
  if (!isValidCategorySlug(normalized)) {
    return undefined;
  }

  try {
    const row = await prisma.category.findUnique({
      where: { slug: normalized },
    });
    if (row && row.isActive) {
      return {
        slug: normalized,
        name: row.name,
        description: row.description,
        accentColor:
          row.accentColor || CATEGORY_MAP[normalized].accentColor,
      };
    }
  } catch {
    // Fallback to static category config if DB file is absent during build
  }

  return getFallbackCategoryBySlug(normalized);
}

/**
 * Fetch all published articles from Prisma ordered newest-first.
 */
export async function getAllArticles(): Promise<SampleArticle[]> {
  try {
    const rows = await prisma.article.findMany({
      where: { ...publicArticleWhere() },
      include: ARTICLE_INCLUDE,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
    if (rows.length > 0) {
      return rows.map(mapPrismaArticleToViewModel);
    }
  } catch {
    // Fallback when SQLite DB is not yet created
  }
  return getAllSampleArticles();
}

/**
 * Fetch featured articles (lead + secondary) from Prisma for the homepage hero.
 */
export async function getFeaturedArticles(): Promise<{
  lead: SampleArticle;
  secondary: SampleArticle[];
}> {
  try {
    const rows = await prisma.article.findMany({
      where: {
        ...publicArticleWhere(),
        isFeatured: true,
      },
      include: ARTICLE_INCLUDE,
      orderBy: [{ trendingRank: "asc" }, { publishedAt: "desc" }],
      take: 3,
    });

    if (rows.length > 0) {
      const mapped = rows.map(mapPrismaArticleToViewModel);
      return {
        lead: mapped[0],
        secondary: mapped.slice(1, 3),
      };
    }
  } catch {
    // Fallback when SQLite DB is not yet created
  }
  return getFeaturedSampleArticles();
}

/**
 * Fetch trending articles from Prisma ordered by `trendingRank`.
 */
export async function getTrendingArticles(): Promise<SampleArticle[]> {
  try {
    const rows = await prisma.article.findMany({
      where: {
        ...publicArticleWhere(),
        isTrending: true,
      },
      include: ARTICLE_INCLUDE,
      orderBy: [{ trendingRank: "asc" }, { publishedAt: "desc" }],
    });

    if (rows.length > 0) {
      return rows.map(mapPrismaArticleToViewModel);
    }
  } catch {
    // Fallback when SQLite DB is not yet created
  }
  return getTrendingSampleArticles();
}

/**
 * Fetch curated/scored trending topic descriptors from Prisma (`TrendingTopic`).
 */
export async function getTrendingTopicSlugs(): Promise<string[]> {
  try {
    const topics = await prisma.trendingTopic.findMany({
      orderBy: [{ isPinned: "desc" }, { score: "desc" }],
      take: 8,
    });
    if (topics.length > 0) {
      return topics.map((t) => t.slug);
    }
  } catch {
    // Fallback when SQLite DB is not yet created
  }
  return [
    "album-rollout",
    "sound-engineering",
    "spatial-audio",
    "music-supervision",
    "songwriting",
    "vinyl-packaging",
  ];
}

/**
 * Fetch published articles in a specific category from Prisma.
 */
export async function getArticlesByCategory(
  categorySlug: CategorySlug
): Promise<SampleArticle[]> {
  try {
    const rows = await prisma.article.findMany({
      where: {
        ...publicArticleWhere(),
        category: {
          slug: categorySlug,
        },
      },
      include: ARTICLE_INCLUDE,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });

    if (rows.length > 0) {
      return rows.map(mapPrismaArticleToViewModel);
    }
  } catch {
    // Fallback when SQLite DB is not yet created
  }
  return getSampleArticlesByCategory(categorySlug);
}

/**
 * Fetch a single published article by category slug and article slug from Prisma.
 */
export async function getArticleBySlug(
  categorySlug: string,
  articleSlug: string
): Promise<SampleArticle | undefined> {
  const normalizedCategory = categorySlug.trim().toLowerCase();
  const normalizedSlug = articleSlug.trim().toLowerCase();

  if (!isValidCategorySlug(normalizedCategory)) {
    return undefined;
  }

  try {
    const row = await prisma.article.findFirst({
      where: {
        slug: normalizedSlug,
        ...publicArticleWhere(),
        category: {
          slug: normalizedCategory,
        },
      },
      include: ARTICLE_INCLUDE,
    });

    if (row) {
      return mapPrismaArticleToViewModel(row);
    }

    // If the database is reachable and seeded, an unknown slug must return undefined (404)
    const count = await prisma.article.count();
    if (count > 0) {
      return undefined;
    }
  } catch {
    // Fallback when SQLite DB is not yet created
  }

  return getSampleArticleBySlug(normalizedCategory, normalizedSlug);
}

/**
 * Search published articles in Prisma by query string and optional category slug.
 */
export async function searchArticles(
  query: string,
  categoryFilter?: string
): Promise<SampleArticle[]> {
  const normalizedCategory = categoryFilter?.trim().toLowerCase();
  const validCategory =
    normalizedCategory && isValidCategorySlug(normalizedCategory)
      ? normalizedCategory
      : undefined;
  const trimmedQuery = query.trim();

  try {
    const terms = trimmedQuery
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const whereClause: Prisma.ArticleWhereInput = {
      ...publicArticleWhere(),
      ...(validCategory
        ? {
            category: {
              slug: validCategory,
            },
          }
        : {}),
      ...(terms.length > 0
        ? {
            AND: terms.map((term) => ({
              OR: [
                { title: { contains: term } },
                { subtitle: { contains: term } },
                { excerpt: { contains: term } },
                { bodyMarkdown: { contains: term } },
                { author: { penName: { contains: term } } },
                { category: { name: { contains: term } } },
                {
                  articleTags: {
                    some: {
                      tag: {
                        OR: [
                          { slug: { contains: term.toLowerCase() } },
                          { name: { contains: term } },
                        ],
                      },
                    },
                  },
                },
              ],
            })),
          }
        : {}),
    };

    const rows = await prisma.article.findMany({
      where: whereClause,
      include: ARTICLE_INCLUDE,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });

    const totalInDb = await prisma.article.count();
    if (totalInDb > 0) {
      return rows.map(mapPrismaArticleToViewModel);
    }
  } catch {
    // Fallback when SQLite DB is not yet created
  }

  return searchSampleArticles(query, validCategory);
}

/**
 * Fetch an author by slug from Prisma.
 */
export async function getAuthorBySlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  try {
    return await prisma.author.findUnique({
      where: { slug: normalized },
    });
  } catch {
    return null;
  }
}

/**
 * Fetch all published articles written by a specific author.
 */
export async function getArticlesByAuthor(
  authorId: string
): Promise<SampleArticle[]> {
  try {
    const rows = await prisma.article.findMany({
      where: {
        authorId,
        ...publicArticleWhere(),
      },
      include: ARTICLE_INCLUDE,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(mapPrismaArticleToViewModel);
  } catch {
    return [];
  }
}

/**
 * Fetch all authors who currently have at least one publicly published article.
 */
export async function getAuthorsWithPublishedArticles() {
  try {
    return await prisma.author.findMany({
      where: {
        articles: {
          some: publicArticleWhere(),
        },
      },
      orderBy: { penName: "asc" },
    });
  } catch {
    return [];
  }
}

