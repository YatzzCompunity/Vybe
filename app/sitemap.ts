import type { MetadataRoute } from "next";
import prisma from "@/lib/db";
import { publicArticleWhere } from "@/lib/publication";
import { getBaseUrl } from "@/lib/seo";
import { CATEGORIES } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();

  // Core static public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  try {
    // 1. Categories from Prisma
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
      url: `${baseUrl}/${cat.slug}`,
      lastModified: cat.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    // 2. Authors who have published articles
    const authors = await prisma.author.findMany({
      where: {
        articles: {
          some: publicArticleWhere(),
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { slug: "asc" },
    });

    const authorRoutes: MetadataRoute.Sitemap = authors.map((author) => ({
      url: `${baseUrl}/author/${author.slug}`,
      lastModified: author.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    // 3. Published articles ONLY (using publicArticleWhere to strictly exclude drafts & scheduled)
    const articles = await prisma.article.findMany({
      where: publicArticleWhere(),
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
        isFeatured: true,
        category: {
          select: { slug: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });

    const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
      url: `${baseUrl}/${article.category.slug}/${article.slug}`,
      lastModified: article.updatedAt ?? article.publishedAt ?? now,
      changeFrequency: "weekly",
      priority: article.isFeatured ? 0.9 : 0.7,
    }));

    return [
      ...staticRoutes,
      ...categoryRoutes,
      ...authorRoutes,
      ...articleRoutes,
    ];
  } catch (error) {
    // Safe build fallback when database is temporarily uninitialized
    console.error("Sitemap generation encountered database error, falling back to static:", error);
    const fallbackCategoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
      url: `${baseUrl}/${cat.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    }));
    return [...staticRoutes, ...fallbackCategoryRoutes];
  }
}
