import { publicArticleWhere } from "@/lib/publication";
import { ArticleStatus, type Prisma } from "@prisma/client";

export const PUBLIC_ARTICLE_LIST_INCLUDE = {
  author: {
    select: {
      id: true,
      slug: true,
      penName: true,
      roleTitle: true,
      avatarUrl: true,
    },
  },
  category: {
    select: {
      id: true,
      slug: true,
      name: true,
      accentColor: true,
    },
  },
  articleTags: {
    include: {
      tag: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
    orderBy: {
      assignedAt: "asc" as const,
    },
  },
} satisfies Prisma.ArticleInclude;

export const PUBLIC_ARTICLE_DETAIL_INCLUDE = {
  author: {
    select: {
      id: true,
      slug: true,
      penName: true,
      roleTitle: true,
      bio: true,
      avatarUrl: true,
      isStaff: true,
    },
  },
  category: {
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      accentColor: true,
    },
  },
  articleTags: {
    include: {
      tag: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
    orderBy: {
      assignedAt: "asc" as const,
    },
  },
  heroMedia: {
    select: {
      id: true,
      url: true,
      altText: true,
      caption: true,
      credit: true,
      mimeType: true,
      width: true,
      height: true,
    },
  },
  seoMetadata: {
    select: {
      metaTitle: true,
      metaDescription: true,
      canonicalUrl: true,
      ogTitle: true,
      ogDescription: true,
      ogImageUrl: true,
      twitterCardType: true,
      noIndex: true,
      noFollow: true,
    },
  },
} satisfies Prisma.ArticleInclude;

export type ArticleListRecord = Prisma.ArticleGetPayload<{
  include: typeof PUBLIC_ARTICLE_LIST_INCLUDE;
}>;

export type ArticleDetailRecord = Prisma.ArticleGetPayload<{
  include: typeof PUBLIC_ARTICLE_DETAIL_INCLUDE;
}>;

export interface ArticleSummaryDto {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  status: "PUBLISHED";
  isFeatured: boolean;
  isTrending: boolean;
  trendingRank: number | null;
  isSampleContent: boolean;
  readingTimeMinutes: number;
  viewCount: number;
  coverGradient: string | null;
  coverLabel: string | null;
  publishedDisplay: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    slug: string;
    name: string;
    accentColor: string;
  };
  author: {
    id: string;
    slug: string;
    penName: string;
    roleTitle: string;
    avatarUrl: string | null;
  };
  tags: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
}

export interface ArticleDetailDto extends ArticleSummaryDto {
  bodyMarkdown: string;
  bodyHtml: string | null;
  bodyParagraphs: string[];
  editorialNote: string | null;
  isAiAssisted: boolean;
  category: {
    id: string;
    slug: string;
    name: string;
    description: string;
    accentColor: string;
  };
  author: {
    id: string;
    slug: string;
    penName: string;
    roleTitle: string;
    bio: string;
    avatarUrl: string | null;
    isStaff: boolean;
  };
  heroMedia: {
    id: string;
    url: string;
    altText: string;
    caption: string | null;
    credit: string;
    mimeType: string;
    width: number | null;
    height: number | null;
  } | null;
  seoMetadata: {
    metaTitle: string | null;
    metaDescription: string | null;
    canonicalUrl: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageUrl: string | null;
    twitterCardType: string;
    noIndex: boolean;
    noFollow: boolean;
  } | null;
}

/**
 * Serialize a published `Article` row for list, search, and trending endpoints.
 */
export function serializeArticleSummary(
  record: ArticleListRecord
): ArticleSummaryDto {
  const publishedAtDate = record.publishedAt ?? record.createdAt;
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    subtitle: record.subtitle,
    excerpt: record.excerpt,
    status: "PUBLISHED",
    isFeatured: record.isFeatured,
    isTrending: record.isTrending,
    trendingRank: record.trendingRank,
    isSampleContent: record.isSampleContent,
    readingTimeMinutes: record.readingTimeMinutes,
    viewCount: record.viewCount,
    coverGradient: record.coverGradient,
    coverLabel: record.coverLabel,
    publishedDisplay: record.publishedDisplay,
    publishedAt: publishedAtDate.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    category: {
      id: record.category.id,
      slug: record.category.slug,
      name: record.category.name,
      accentColor: record.category.accentColor,
    },
    author: {
      id: record.author.id,
      slug: record.author.slug,
      penName: record.author.penName,
      roleTitle: record.author.roleTitle,
      avatarUrl: record.author.avatarUrl,
    },
    tags: record.articleTags.map((at) => ({
      id: at.tag.id,
      slug: at.tag.slug,
      name: at.tag.name,
    })),
  };
}

/**
 * Serialize a single published `Article` row for `GET /api/v1/articles/[slug]`.
 */
export function serializeArticleDetail(
  record: ArticleDetailRecord
): ArticleDetailDto {
  const summary = serializeArticleSummary(record);
  const bodyParagraphs = record.bodyMarkdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    ...summary,
    bodyMarkdown: record.bodyMarkdown,
    bodyHtml: record.bodyHtml,
    bodyParagraphs,
    editorialNote: record.editorialNote,
    isAiAssisted: record.isAiAssisted,
    category: {
      id: record.category.id,
      slug: record.category.slug,
      name: record.category.name,
      description: record.category.description,
      accentColor: record.category.accentColor,
    },
    author: {
      id: record.author.id,
      slug: record.author.slug,
      penName: record.author.penName,
      roleTitle: record.author.roleTitle,
      bio: record.author.bio,
      avatarUrl: record.author.avatarUrl,
      isStaff: record.author.isStaff,
    },
    heroMedia: record.heroMedia
      ? {
          id: record.heroMedia.id,
          url: record.heroMedia.url,
          altText: record.heroMedia.altText,
          caption: record.heroMedia.caption,
          credit: record.heroMedia.credit,
          mimeType: record.heroMedia.mimeType,
          width: record.heroMedia.width,
          height: record.heroMedia.height,
        }
      : null,
    seoMetadata: record.seoMetadata
      ? {
          metaTitle: record.seoMetadata.metaTitle,
          metaDescription: record.seoMetadata.metaDescription,
          canonicalUrl: record.seoMetadata.canonicalUrl,
          ogTitle: record.seoMetadata.ogTitle,
          ogDescription: record.seoMetadata.ogDescription,
          ogImageUrl: record.seoMetadata.ogImageUrl,
          twitterCardType: record.seoMetadata.twitterCardType,
          noIndex: record.seoMetadata.noIndex,
          noFollow: record.seoMetadata.noFollow,
        }
      : null,
  };
}

/**
 * Build a Prisma `ArticleWhereInput` filter that ALWAYS restricts to
 * `publicArticleWhere()` (PUBLISHED and not scheduled) and applies optional `category`, `tag`, and `q` filters.
 */
export function buildPublishedArticleWhere(filters: {
  category?: string;
  tag?: string;
  q?: string;
}): Prisma.ArticleWhereInput {
  const andConditions: Prisma.ArticleWhereInput[] = [
    { ...publicArticleWhere() },
  ];

  if (filters.category) {
    andConditions.push({
      category: {
        slug: filters.category,
        isActive: true,
      },
    });
  }

  if (filters.tag) {
    andConditions.push({
      articleTags: {
        some: {
          tag: {
            slug: filters.tag,
          },
        },
      },
    });
  }

  if (filters.q) {
    const terms = filters.q
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    for (const term of terms) {
      const lowerTerm = term.toLowerCase();
      andConditions.push({
        OR: [
          { title: { contains: term } },
          { subtitle: { contains: term } },
          { excerpt: { contains: term } },
          { bodyMarkdown: { contains: term } },
          { author: { penName: { contains: term } } },
          { category: { name: { contains: term } } },
          { category: { slug: { contains: lowerTerm } } },
          {
            articleTags: {
              some: {
                tag: {
                  OR: [
                    { slug: { contains: lowerTerm } },
                    { name: { contains: term } },
                  ],
                },
              },
            },
          },
        ],
      });
    }
  }

  return {
    AND: andConditions,
  };
}
