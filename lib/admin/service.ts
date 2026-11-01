import { ArticleStatus, CommentStatus, Prisma, type Role, type User } from "@prisma/client";
import prisma from "@/lib/db";
import * as I from "@/lib/admin/input";
import type { Raw } from "@/lib/admin/input";
import { assertCanPublishAiArticle } from "@/lib/ai/guardrails";

/*
 * Admin domain logic shared by the /api/v1/admin/* routes AND the /admin server actions.
 * Callers are responsible for the role guard (requireRole) BEFORE calling these.
 * Status transitions happen ONLY through publish/unpublish/schedule — create/update never
 * accept `status` or `publishedAt`, so no other code path can make a draft public.
 */

const ADMIN_USER_SELECT = {
  id: true, email: true, displayName: true, role: true, isActive: true, emailVerifiedAt: true,
  createdAt: true, _count: { select: { bookmarks: true, comments: true } },
} satisfies Prisma.UserSelect; // NEVER add passwordHash / resetToken* here.

/* ------------------------------ Articles ------------------------------ */

const ARTICLE_LIST_SELECT = {
  id: true, slug: true, title: true, status: true, isFeatured: true, isTrending: true, trendingRank: true,
  publishedAt: true, updatedAt: true, createdAt: true,
  category: { select: { id: true, slug: true, name: true } },
  author: { select: { id: true, penName: true } },
} satisfies Prisma.ArticleSelect;

type ListRow = Prisma.ArticleGetPayload<{ select: typeof ARTICLE_LIST_SELECT }>;

export function articleState(a: { status: ArticleStatus; publishedAt: Date | null }): string {
  if (a.status === "PUBLISHED") return a.publishedAt && a.publishedAt > new Date() ? "SCHEDULED" : "PUBLISHED";
  return a.status;
}

function withState(a: ListRow) {
  return { ...a, state: articleState(a) };
}

export async function listArticles(q: { status?: string; search?: string; page: number; limit: number; skip: number }) {
  const where: Prisma.ArticleWhereInput = {};
  const now = new Date();
  if (q.status === "SCHEDULED") {
    where.status = "PUBLISHED";
    where.publishedAt = { gt: now };
  } else if (q.status === "PUBLISHED") {
    where.status = "PUBLISHED";
    where.publishedAt = { lte: now };
  } else if (q.status) {
    where.status = I.oneOf({ s: q.status }, "s", Object.values(ArticleStatus));
  }
  if (q.search) where.OR = [{ title: { contains: q.search } }, { slug: { contains: q.search.toLowerCase() } }];
  const [rows, total] = await Promise.all([
    prisma.article.findMany({ where, select: ARTICLE_LIST_SELECT, orderBy: { updatedAt: "desc" }, skip: q.skip, take: q.limit }),
    prisma.article.count({ where }),
  ]);
  return { items: rows.map(withState), total };
}

export async function getArticle(id: string) {
  const a = await prisma.article.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, slug: true, name: true } },
      author: { select: { id: true, penName: true } },
      articleTags: { select: { tag: { select: { slug: true } } } },
      seoMetadata: true,
      source: { select: { id: true, name: true, domain: true, trustTier: true } },
    },
  });
  if (!a) throw I.notFound("Article");
  const { articleTags, ...rest } = a;
  return { ...rest, state: articleState(a), tags: articleTags.map((t) => t.tag.slug) };
}

async function resolveTags(slugs: string[]) {
  const tags = await prisma.tag.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const missing = slugs.filter((s) => !tags.some((t) => t.slug === s));
  if (missing.length) throw I.bad(`Unknown tag slug(s): ${missing.join(", ")}. Create them first.`);
  return tags;
}

function readingTime(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220));
}

export function parseArticleInput(raw: Raw, partial: boolean) {
  const title = I.reqStr(raw, "title", { max: 200 }, partial);
  let slug = I.slugField(raw, "slug", true);
  if (!slug && !partial && title) slug = I.slugify(title);
  if (!partial && !slug) throw I.bad("Could not derive a slug; provide 'slug'.");
  return {
    title,
    slug,
    subtitle: I.str(raw, "subtitle", { max: 300 }),
    excerpt: I.reqStr(raw, "excerpt", { max: 600, multiline: true }, partial),
    bodyMarkdown: I.reqStr(raw, "bodyMarkdown", { max: 100000, multiline: true }, partial),
    editorialNote: I.str(raw, "editorialNote", { max: 500, multiline: true }),
    categoryId: I.reqStr(raw, "categoryId", { max: 160 }, partial),
    authorId: I.reqStr(raw, "authorId", { max: 160 }, partial),
    tags: I.slugList(raw, "tags"),
    isFeatured: I.bool(raw, "isFeatured"),
    isTrending: I.bool(raw, "isTrending"),
    trendingRank: I.int(raw, "trendingRank", 1, 999),
    sourceId: I.str(raw, "sourceId", { max: 100 }),
    isAiAssisted: I.bool(raw, "isAiAssisted"),
    aiMetadataJson: I.str(raw, "aiMetadataJson", { max: 100000, multiline: true }),
  };
}

export async function createArticle(raw: Raw) {
  const d = parseArticleInput(raw, false);
  const tags = d.tags ? await resolveTags(d.tags) : [];
  await assertCategoryAuthor(d.categoryId, d.authorId);
  try {
    const a = await prisma.article.create({
      data: {
        slug: d.slug!, title: d.title!, subtitle: d.subtitle ?? null, excerpt: d.excerpt!, bodyMarkdown: d.bodyMarkdown!,
        editorialNote: d.editorialNote ?? null, categoryId: d.categoryId!, authorId: d.authorId!,
        status: "DRAFT", publishedAt: null, // always DRAFT; going public requires publish/schedule
        isFeatured: d.isFeatured ?? false, isTrending: d.isTrending ?? false, trendingRank: d.trendingRank ?? null,
        isAiAssisted: d.isAiAssisted ?? false, sourceId: d.sourceId ?? null, aiMetadataJson: d.aiMetadataJson ?? null,
        readingTimeMinutes: readingTime(d.bodyMarkdown!),
        articleTags: { create: tags.map((t) => ({ tagId: t.id })) },
      },
      select: { id: true },
    });
    return getArticle(a.id);
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("An article with this slug already exists.");
    throw e;
  }
}

async function assertCategoryAuthor(categoryId?: string, authorId?: string) {
  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) throw I.bad("Unknown categoryId.");
  if (authorId && !(await prisma.author.findUnique({ where: { id: authorId }, select: { id: true } }))) throw I.bad("Unknown authorId.");
}

export async function updateArticle(id: string, raw: Raw) {
  await getArticle(id);
  const d = parseArticleInput(raw, true);
  const tags = d.tags ? await resolveTags(d.tags) : undefined;
  await assertCategoryAuthor(d.categoryId, d.authorId);
  const data: Prisma.ArticleUncheckedUpdateInput = {};
  if (d.title !== undefined) data.title = d.title;
  if (d.slug !== undefined) data.slug = d.slug;
  if (d.subtitle !== undefined) data.subtitle = d.subtitle;
  if (d.excerpt !== undefined) data.excerpt = d.excerpt;
  if (d.bodyMarkdown !== undefined) { data.bodyMarkdown = d.bodyMarkdown; data.readingTimeMinutes = readingTime(d.bodyMarkdown); }
  if (d.editorialNote !== undefined) data.editorialNote = d.editorialNote;
  if (d.categoryId !== undefined) data.categoryId = d.categoryId;
  if (d.authorId !== undefined) data.authorId = d.authorId;
  if (d.isFeatured !== undefined) data.isFeatured = d.isFeatured;
  if (d.isTrending !== undefined) data.isTrending = d.isTrending;
  if (d.trendingRank !== undefined) data.trendingRank = d.trendingRank;
  if (d.sourceId !== undefined) data.sourceId = d.sourceId;
  if (d.isAiAssisted !== undefined) data.isAiAssisted = d.isAiAssisted;
  if (d.aiMetadataJson !== undefined) data.aiMetadataJson = d.aiMetadataJson;
  try {
    await prisma.$transaction(async (tx) => {
      if (tags) {
        await tx.articleTag.deleteMany({ where: { articleId: id } });
        await tx.articleTag.createMany({ data: tags.map((t) => ({ articleId: id, tagId: t.id })) });
      }
      await tx.article.update({ where: { id }, data });
    });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("An article with this slug already exists.");
    throw e;
  }
  return getArticle(id);
}

/** Safe delete: a publicly visible/scheduled article must be unpublished first. */
export async function deleteArticle(id: string) {
  const a = await prisma.article.findUnique({ where: { id }, select: { status: true, seoMetadataId: true } });
  if (!a) throw I.notFound("Article");
  if (a.status === "PUBLISHED") throw I.conflict("Unpublish the article before deleting it.");
  await prisma.$transaction(async (tx) => {
    await tx.article.delete({ where: { id } }); // cascades bookmarks, comments, article tags
    if (a.seoMetadataId) await tx.sEOMetadata.deleteMany({ where: { id: a.seoMetadataId } });
  });
  return { deleted: true };
}

export async function publishArticle(id: string, actor: User) {
  const a = await prisma.article.findUnique({ where: { id }, select: { id: true, isAiAssisted: true } });
  if (!a) throw I.notFound("Article");
  assertCanPublishAiArticle(a, actor.role);
  const now = new Date();
  await prisma.article.update({
    where: { id }, data: { status: "PUBLISHED", publishedAt: now, approvedById: actor.id, approvedAt: now },
  });
  return getArticle(id);
}

export async function scheduleArticle(id: string, raw: Raw, actor: User) {
  const when = I.date(raw, "publishedAt");
  if (!when) throw I.bad("'publishedAt' (future ISO date) is required.");
  if (when.getTime() <= Date.now() + 1000) throw I.bad("'publishedAt' must be in the future. Use publish to go live now.");
  const a = await prisma.article.findUnique({ where: { id }, select: { id: true, isAiAssisted: true } });
  if (!a) throw I.notFound("Article");
  assertCanPublishAiArticle(a, actor.role);
  // status=PUBLISHED + future publishedAt = scheduled. Hidden from every public read until the time passes.
  await prisma.article.update({
    where: { id }, data: { status: "PUBLISHED", publishedAt: when, approvedById: actor.id, approvedAt: new Date() },
  });
  return getArticle(id);
}

export async function unpublishArticle(id: string) {
  if (!(await prisma.article.findUnique({ where: { id }, select: { id: true } }))) throw I.notFound("Article");
  await prisma.article.update({ where: { id }, data: { status: "DRAFT", publishedAt: null } });
  return getArticle(id);
}

export async function setFlags(id: string, raw: Raw) {
  if (!(await prisma.article.findUnique({ where: { id }, select: { id: true } }))) throw I.notFound("Article");
  const data: Prisma.ArticleUpdateInput = {};
  const f = I.bool(raw, "isFeatured"), t = I.bool(raw, "isTrending"), r = I.int(raw, "trendingRank", 1, 999);
  if (f !== undefined) data.isFeatured = f;
  if (t !== undefined) { data.isTrending = t; if (!t) data.trendingRank = null; }
  if (r !== undefined && t !== false) data.trendingRank = r;
  if (Object.keys(data).length === 0) throw I.bad("Provide isFeatured, isTrending and/or trendingRank.");
  await prisma.article.update({ where: { id }, data });
  return getArticle(id);
}

/* ------------------------------ SEO ------------------------------ */

export async function getSeo(id: string) {
  const a = await getArticle(id);
  return { articleId: a.id, slug: a.slug, seo: a.seoMetadata };
}

export async function updateSeo(id: string, raw: Raw) {
  const a = await prisma.article.findUnique({ where: { id }, select: { id: true, seoMetadataId: true } });
  if (!a) throw I.notFound("Article");
  const slug = I.slugField(raw, "slug", true);
  const seo: Prisma.SEOMetadataUncheckedUpdateInput = {};
  const set = <K extends keyof Prisma.SEOMetadataUncheckedUpdateInput>(k: K, v: Prisma.SEOMetadataUncheckedUpdateInput[K] | undefined) => {
    if (v !== undefined) seo[k] = v;
  };
  set("metaTitle", I.str(raw, "metaTitle", { max: 70 }));
  set("metaDescription", I.str(raw, "metaDescription", { max: 200, multiline: true }));
  set("canonicalUrl", I.urlField(raw, "canonicalUrl"));
  set("ogTitle", I.str(raw, "ogTitle", { max: 100 }));
  set("ogDescription", I.str(raw, "ogDescription", { max: 300, multiline: true }));
  set("ogImageUrl", I.urlField(raw, "ogImageUrl"));
  set("twitterCardType", I.oneOf(raw, "twitterCardType", ["summary", "summary_large_image"] as const));
  set("noIndex", I.bool(raw, "noIndex"));
  set("noFollow", I.bool(raw, "noFollow"));
  try {
    await prisma.$transaction(async (tx) => {
      if (a.seoMetadataId) {
        if (Object.keys(seo).length) await tx.sEOMetadata.update({ where: { id: a.seoMetadataId }, data: seo });
      } else {
        const created = await tx.sEOMetadata.create({ data: seo as Prisma.SEOMetadataUncheckedCreateInput });
        await tx.article.update({ where: { id }, data: { seoMetadataId: created.id } });
      }
      if (slug) await tx.article.update({ where: { id }, data: { slug } });
    });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("An article with this slug already exists.");
    throw e;
  }
  return getSeo(id);
}

/* --------------------- Categories / Tags / Authors --------------------- */

export async function listCategories() {
  const rows = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { articles: true, children: true, trendingTopics: true } } } });
  return rows;
}

function parseCategory(raw: Raw, partial: boolean) {
  return {
    slug: partial ? undefined : I.slugField(raw, "slug"), // slug is immutable (public routes are slug-based)
    name: I.reqStr(raw, "name", { max: 80 }, partial),
    description: I.reqStr(raw, "description", { max: 400, multiline: true }, partial),
    accentColor: I.str(raw, "accentColor", { max: 120 }),
    sortOrder: I.int(raw, "sortOrder", 0, 9999),
    isActive: I.bool(raw, "isActive"),
    parentId: I.str(raw, "parentId", { max: 160 }),
  };
}

export async function createCategory(raw: Raw) {
  const d = parseCategory(raw, false);
  try {
    return await prisma.category.create({
      data: { slug: d.slug!, name: d.name!, description: d.description!, ...(d.accentColor ? { accentColor: d.accentColor } : {}),
        sortOrder: d.sortOrder ?? 0, isActive: d.isActive ?? true, parentId: d.parentId ?? null },
    });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("A category with this slug already exists.");
    throw e;
  }
}

export async function updateCategory(id: string, raw: Raw) {
  if (raw.slug !== undefined) {
    const cur = await prisma.category.findUnique({ where: { id }, select: { slug: true } });
    if (cur && raw.slug !== cur.slug) throw I.bad("Category slug cannot be changed (public URLs depend on it).");
  }
  const d = parseCategory(raw, true);
  if (d.parentId === id) throw I.bad("A category cannot be its own parent.");
  if (!(await prisma.category.findUnique({ where: { id }, select: { id: true } }))) throw I.notFound("Category");
  const data: Prisma.CategoryUncheckedUpdateInput = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.description !== undefined) data.description = d.description;
  if (d.accentColor) data.accentColor = d.accentColor;
  if (d.sortOrder !== undefined && d.sortOrder !== null) data.sortOrder = d.sortOrder;
  if (d.isActive !== undefined) data.isActive = d.isActive;
  if (d.parentId !== undefined) data.parentId = d.parentId;
  return prisma.category.update({ where: { id }, data });
}

/** Blocked (409) while articles, child categories or trending topics still reference it. */
export async function deleteCategory(id: string) {
  const c = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { articles: true, children: true, trendingTopics: true } } } });
  if (!c) throw I.notFound("Category");
  if (c._count.articles || c._count.children || c._count.trendingTopics) {
    throw I.conflict("Category is still in use. Move or delete its articles, child categories and trending topics first.", { ...c._count });
  }
  await prisma.category.delete({ where: { id } });
  return { deleted: true };
}

export async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { articleTags: true } } } });
}

export async function createTag(raw: Raw) {
  const name = I.reqStr(raw, "name", { max: 60 })!;
  const slug = I.slugField(raw, "slug", true) ?? I.slugify(name);
  if (!slug) throw I.bad("Could not derive a slug.");
  try {
    return await prisma.tag.create({ data: { name, slug, description: I.str(raw, "description", { max: 300 }) ?? null } });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("A tag with this slug already exists.");
    throw e;
  }
}

export async function updateTag(id: string, raw: Raw) {
  if (!(await prisma.tag.findUnique({ where: { id }, select: { id: true } }))) throw I.notFound("Tag");
  const data: Prisma.TagUpdateInput = {};
  const name = I.reqStr(raw, "name", { max: 60 }, true), slug = I.slugField(raw, "slug", true), description = I.str(raw, "description", { max: 300 });
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;
  if (description !== undefined) data.description = description;
  try {
    return await prisma.tag.update({ where: { id }, data });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("A tag with this slug already exists.");
    throw e;
  }
}

/** Blocked (409) while articles use the tag, unless force=true (explicitly detaches it from articles). */
export async function deleteTag(id: string, force: boolean) {
  const t = await prisma.tag.findUnique({ where: { id }, include: { _count: { select: { articleTags: true } } } });
  if (!t) throw I.notFound("Tag");
  if (t._count.articleTags && !force) {
    throw I.conflict(`Tag is used by ${t._count.articleTags} article(s). Re-send with force=true to detach and delete.`, { articles: t._count.articleTags });
  }
  await prisma.tag.delete({ where: { id } }); // ArticleTag rows cascade
  return { deleted: true, detachedFromArticles: t._count.articleTags };
}

export async function listAuthors() {
  return prisma.author.findMany({ orderBy: { penName: "asc" }, select: { id: true, slug: true, penName: true, roleTitle: true, bio: true, avatarUrl: true, isStaff: true, userId: true, _count: { select: { articles: true } } } });
}

function parseAuthor(raw: Raw, partial: boolean) {
  return {
    penName: I.reqStr(raw, "penName", { max: 80 }, partial),
    slug: I.slugField(raw, "slug", true),
    roleTitle: I.reqStr(raw, "roleTitle", { max: 80 }, partial),
    bio: I.reqStr(raw, "bio", { max: 1000, multiline: true }, partial),
    avatarUrl: I.urlField(raw, "avatarUrl"),
    isStaff: I.bool(raw, "isStaff"),
  };
}

export async function createAuthor(raw: Raw) {
  const d = parseAuthor(raw, false);
  const slug = d.slug ?? I.slugify(d.penName!);
  try {
    return await prisma.author.create({ data: { slug, penName: d.penName!, roleTitle: d.roleTitle!, bio: d.bio!, avatarUrl: d.avatarUrl ?? null, isStaff: d.isStaff ?? true } });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("An author with this slug already exists.");
    throw e;
  }
}

export async function updateAuthor(id: string, raw: Raw) {
  if (!(await prisma.author.findUnique({ where: { id }, select: { id: true } }))) throw I.notFound("Author");
  const d = parseAuthor(raw, true);
  const data: Prisma.AuthorUpdateInput = {};
  if (d.penName !== undefined) data.penName = d.penName;
  if (d.slug !== undefined) data.slug = d.slug;
  if (d.roleTitle !== undefined) data.roleTitle = d.roleTitle;
  if (d.bio !== undefined) data.bio = d.bio;
  if (d.avatarUrl !== undefined) data.avatarUrl = d.avatarUrl;
  if (d.isStaff !== undefined) data.isStaff = d.isStaff;
  try {
    return await prisma.author.update({ where: { id }, data });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("An author with this slug already exists.");
    throw e;
  }
}

/** Blocked (409) while the author still has articles (never orphan or silently reassign). */
export async function deleteAuthor(id: string) {
  const a = await prisma.author.findUnique({ where: { id }, include: { _count: { select: { articles: true } } } });
  if (!a) throw I.notFound("Author");
  if (a._count.articles) throw I.conflict(`Author still has ${a._count.articles} article(s). Reassign or delete them first.`, { articles: a._count.articles });
  await prisma.author.delete({ where: { id } });
  return { deleted: true };
}

/* ------------------------------ Users ------------------------------ */

export async function listUsers(q: { page: number; limit: number; skip: number; search?: string }) {
  const where: Prisma.UserWhereInput = q.search ? { OR: [{ email: { contains: q.search.toLowerCase() } }, { displayName: { contains: q.search } }] } : {};
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: ADMIN_USER_SELECT, orderBy: { createdAt: "desc" }, skip: q.skip, take: q.limit }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

const ROLES: readonly Role[] = ["READER", "AUTHOR", "EDITOR", "ADMIN"];

/** Never removes the last active ADMIN (guard is inside the same transaction as the update). */
export async function changeUserRole(id: string, raw: Raw) {
  const role = I.oneOf(raw, "role", ROLES);
  if (!role) throw I.bad(`'role' is required (${ROLES.join(", ")}).`);
  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) throw I.notFound("User");
    if (target.role === "ADMIN" && role !== "ADMIN") {
      const admins = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
      if (admins <= 1) throw I.conflict("Cannot demote the last active admin.");
    }
    await tx.user.update({ where: { id }, data: { role } });
  });
  return prisma.user.findUniqueOrThrow({ where: { id }, select: ADMIN_USER_SELECT });
}

/* ------------------------- Trending topics ------------------------- */

export async function listTrendingTopics() {
  return prisma.trendingTopic.findMany({ orderBy: [{ isPinned: "desc" }, { score: "desc" }], include: { category: { select: { slug: true, name: true } } } });
}

function parseTopic(raw: Raw, partial: boolean) {
  return {
    label: I.reqStr(raw, "label", { max: 80 }, partial),
    slug: I.slugField(raw, "slug", true),
    categoryId: I.str(raw, "categoryId", { max: 160 }),
    score: I.num(raw, "score", 0, 1000000),
    velocity: I.num(raw, "velocity", -1000000, 1000000),
    isPinned: I.bool(raw, "isPinned"),
    expiresAt: I.date(raw, "expiresAt"),
  };
}

export async function createTrendingTopic(raw: Raw) {
  const d = parseTopic(raw, false);
  const slug = d.slug ?? I.slugify(d.label!);
  if (d.categoryId) await assertCategoryAuthor(d.categoryId);
  try {
    return await prisma.trendingTopic.create({ data: { slug, label: d.label!, categoryId: d.categoryId ?? null, score: d.score ?? 0, velocity: d.velocity ?? 0, isPinned: d.isPinned ?? false, expiresAt: d.expiresAt ?? null } });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("A trending topic with this slug already exists.");
    throw e;
  }
}

export async function updateTrendingTopic(id: string, raw: Raw) {
  if (!(await prisma.trendingTopic.findUnique({ where: { id }, select: { id: true } }))) throw I.notFound("Trending topic");
  const d = parseTopic(raw, true);
  if (d.categoryId) await assertCategoryAuthor(d.categoryId);
  const data: Prisma.TrendingTopicUncheckedUpdateInput = {};
  if (d.label !== undefined) data.label = d.label;
  if (d.slug !== undefined) data.slug = d.slug;
  if (d.categoryId !== undefined) data.categoryId = d.categoryId;
  if (d.score !== undefined) data.score = d.score;
  if (d.velocity !== undefined) data.velocity = d.velocity;
  if (d.isPinned !== undefined) data.isPinned = d.isPinned;
  if (d.expiresAt !== undefined) data.expiresAt = d.expiresAt;
  try {
    return await prisma.trendingTopic.update({ where: { id }, data });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("A trending topic with this slug already exists.");
    throw e;
  }
}

export async function deleteTrendingTopic(id: string) {
  if (!(await prisma.trendingTopic.findUnique({ where: { id }, select: { id: true } }))) throw I.notFound("Trending topic");
  await prisma.trendingTopic.delete({ where: { id } });
  return { deleted: true };
}

/* ------------------------- Comment moderation ------------------------- */

export async function listComments(q: { status?: string; page: number; limit: number; skip: number }) {
  const status = q.status === "ALL" ? undefined : I.oneOf({ s: q.status ?? "PENDING" }, "s", Object.values(CommentStatus));
  const where: Prisma.CommentWhereInput = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where, orderBy: { createdAt: "asc" }, skip: q.skip, take: q.limit,
      select: { id: true, body: true, status: true, createdAt: true, user: { select: { id: true, displayName: true, email: true } }, article: { select: { id: true, slug: true, title: true } } },
    }),
    prisma.comment.count({ where }),
  ]);
  return { items, total };
}

export async function moderateComment(id: string, action: "approve" | "reject", actor: User) {
  const c = await prisma.comment.findUnique({ where: { id }, select: { id: true } });
  if (!c) throw I.notFound("Comment");
  return prisma.comment.update({
    where: { id }, data: { status: action === "approve" ? "APPROVED" : "REJECTED", moderatedById: actor.id },
    select: { id: true, status: true },
  });
}

export async function deleteComment(id: string) {
  if (!(await prisma.comment.findUnique({ where: { id }, select: { id: true } }))) throw I.notFound("Comment");
  await prisma.comment.delete({ where: { id } }); // replies cascade
  return { deleted: true };
}

/* ------------------------------ Analytics ------------------------------ */

/** All numbers come from real DB rows. Pageviews are NOT tracked, so none are reported. */
export async function getAnalytics() {
  const now = new Date();
  const [total, published, scheduled, drafts, inReview, users, bookmarks, commentGroups, categories, catBookmarks, top] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { status: "PUBLISHED", publishedAt: { lte: now } } }),
    prisma.article.count({ where: { status: "PUBLISHED", publishedAt: { gt: now } } }),
    prisma.article.count({ where: { status: "DRAFT" } }),
    prisma.article.count({ where: { status: { in: ["IN_REVIEW", "APPROVED"] } } }),
    prisma.user.count(),
    prisma.bookmark.count(),
    prisma.comment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.category.findMany({ select: { id: true, slug: true, name: true, articles: { where: { status: "PUBLISHED", publishedAt: { lte: now } }, select: { id: true } } } }),
    prisma.bookmark.findMany({ select: { article: { select: { categoryId: true } } } }),
    prisma.article.findMany({ where: { bookmarks: { some: {} } }, select: { slug: true, title: true, status: true, id: true, _count: { select: { bookmarks: true } } }, orderBy: { bookmarks: { _count: "desc" } }, take: 10 }),
  ]);
  const comments: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0, FLAGGED: 0 };
  let commentTotal = 0;
  for (const g of commentGroups) { comments[g.status] = g._count._all; commentTotal += g._count._all; }
  const bmByCat = new Map<string, number>();
  for (const b of catBookmarks) bmByCat.set(b.article.categoryId, (bmByCat.get(b.article.categoryId) ?? 0) + 1);
  const popularCategories = categories
    .map((c) => ({ slug: c.slug, name: c.name, publishedArticles: c.articles.length, bookmarks: bmByCat.get(c.id) ?? 0 }))
    .sort((a, b) => b.publishedArticles + b.bookmarks - (a.publishedArticles + a.bookmarks))
    .slice(0, 10);
  return {
    articles: { total, published, scheduled, drafts, inReviewOrApproved: inReview },
    users, bookmarks, comments: { total: commentTotal, byStatus: comments },
    popularCategories,
    mostBookmarkedArticles: top.map((a) => ({ id: a.id, slug: a.slug, title: a.title, status: a.status, bookmarks: a._count.bookmarks })),
    pageviews: { tracked: false, note: "Pageview tracking is not implemented; no traffic numbers are available." },
  };
}
