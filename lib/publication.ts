import { ArticleStatus, type Prisma } from "@prisma/client";

/**
 * Single source of truth for "publicly visible article".
 * An article is public ONLY when status = PUBLISHED AND publishedAt <= now.
 * A PUBLISHED article with a future publishedAt is a "scheduled" article and must
 * not leak through any public read (API, search, trending, pages, bookmarks, comments).
 * Evaluated per call so scheduled articles go live automatically (no cron needed).
 */
export function publicArticleWhere(): Prisma.ArticleWhereInput {
  return { status: ArticleStatus.PUBLISHED, publishedAt: { lte: new Date() } };
}
