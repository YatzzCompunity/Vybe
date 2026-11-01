import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { CATEGORY_MAP, SITE_NAME } from "@/lib/config";
import { getAllArticles, getArticleBySlug } from "@/lib/articles";
import { buildBreadcrumbJsonLd, buildPersonJsonLd, getBaseUrl } from "@/lib/seo";
import { ArticleCard } from "@/components/ArticleCard";
import { Newsletter } from "@/components/Newsletter";
import { BookmarkButton } from "@/components/BookmarkButton";

const Comments = dynamic(
  () => import("@/components/Comments").then((mod) => mod.Comments),
  {
    loading: () => (
      <div className="mt-8 rounded-xl border border-slate-200 p-5 dark:border-slate-800">
        <h2 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
          Reader Discussion
        </h2>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading discussion…</p>
      </div>
    ),
  }
);

export const revalidate = 300;

interface ArticlePageProps {
  params: {
    category: string;
    slug: string;
  };
}

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map((article) => ({
    category: article.categorySlug,
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const article = await getArticleBySlug(params.category, params.slug);
  if (!article) {
    return {
      title: "Article Not Found",
    };
  }

  const category = CATEGORY_MAP[article.categorySlug];
  const canonicalPath = `/${article.categorySlug}/${article.slug}`;
  const seo = article.seoMetadata;

  const pageTitle = seo?.metaTitle?.trim() || article.title;
  const pageDescription = seo?.metaDescription?.trim() || article.excerpt;
  const canonicalUrl = seo?.canonicalUrl?.trim() || canonicalPath;
  const ogTitle =
    seo?.ogTitle?.trim() || seo?.metaTitle?.trim() || `${article.title} | ${SITE_NAME}`;
  const ogDescription =
    seo?.ogDescription?.trim() || seo?.metaDescription?.trim() || article.excerpt;
  const twitterCard =
    seo?.twitterCardType === "summary" ? "summary" : "summary_large_image";
  const ogImages = seo?.ogImageUrl?.trim()
    ? [{ url: seo.ogImageUrl.trim(), alt: pageTitle }]
    : undefined;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: !seo?.noIndex,
      follow: !seo?.noFollow,
    },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title: ogTitle,
      description: ogDescription,
      url: canonicalUrl,
      section: category ? category.name : article.categorySlug,
      publishedTime: article.publishedAtIso,
      modifiedTime: article.updatedAtIso || article.publishedAtIso,
      authors: [article.author.penName],
      tags: article.tags,
      images: ogImages,
    },
    twitter: {
      card: twitterCard,
      title: ogTitle,
      description: ogDescription,
      images: seo?.ogImageUrl?.trim() ? [seo.ogImageUrl.trim()] : undefined,
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const [article, allArticles] = await Promise.all([
    getArticleBySlug(params.category, params.slug),
    getAllArticles(),
  ]);

  // Return HTTP 404 for unknown category or article slugs
  if (!article) {
    notFound();
  }

  const baseUrl = getBaseUrl();
  const category = CATEGORY_MAP[article.categorySlug];
  const relatedArticles = allArticles
    .filter((a) => a.id !== article.id)
    .slice(0, 3);

  const canonicalUrl = article.seoMetadata?.canonicalUrl?.startsWith("http")
    ? article.seoMetadata.canonicalUrl
    : `${baseUrl}/${article.categorySlug}/${article.slug}`;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", item: "/" },
    {
      name: category ? category.name : article.categorySlug,
      item: `/${article.categorySlug}`,
    },
    { name: article.title, item: `/${article.categorySlug}/${article.slug}` },
  ]);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.seoMetadata?.metaTitle?.trim() || article.title,
    description:
      article.seoMetadata?.metaDescription?.trim() || article.excerpt,
    datePublished: article.publishedAtIso,
    dateModified: article.updatedAtIso || article.publishedAtIso,
    articleSection: category ? category.name : article.categorySlug,
    keywords: article.tags.join(", "),
    author: {
      "@type": "Person",
      name: article.author.penName,
      jobTitle: article.author.roleTitle,
      description: article.author.bio,
      url: `${baseUrl}/author/${article.author.slug}`,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    ...(article.seoMetadata?.ogImageUrl
      ? { image: [article.seoMetadata.ogImageUrl] }
      : {}),
  };

  let customStructuredData = null;
  if (article.seoMetadata?.structuredDataJson) {
    try {
      customStructuredData = JSON.parse(
        article.seoMetadata.structuredDataJson
      );
    } catch {
      // Ignore invalid custom structured data JSON
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {customStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(customStructuredData),
          }}
        />
      )}

      <article className="mx-auto max-w-3xl">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"
        >
          <Link
            href="/"
            className="hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/${category.slug}`}
            className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {category.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-slate-700 dark:text-slate-300">
            {article.slug}
          </span>
        </nav>

        {/* Explicit Sample Content Disclosure Banner */}
        <div
          role="note"
          aria-label="Sample content notice"
          className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200"
        >
          <strong className="font-bold uppercase tracking-wider">
            Sample / Placeholder Article:
          </strong>{" "}
          This page renders an original placeholder fixture queried from Prisma (
          <code className="font-mono">isSampleContent = true</code>) for Phase 2
          database, layout, and route verification. It is not real news and
          contains no copied text or fabricated real-world facts.
        </div>

        {/* Article Header & H1 */}
        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Link href={`/${category.slug}`} className="hover:underline">
              {category.name}
            </Link>
            <span>•</span>
            <span className="text-slate-500 dark:text-slate-400">
              {article.readingTimeMinutes} min read
            </span>
          </div>

          <h1 className="mt-3 font-serif text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            {article.subtitle}
          </p>

          {/* Author & Metadata Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                By{" "}
                <Link
                  href={`/author/${article.author.slug}`}
                  className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
                >
                  {article.author.penName}
                </Link>
              </p>
              <p className="mt-0.5">
                {article.author.roleTitle} • {article.publishedDisplay}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <BookmarkButton slug={article.slug} returnPath={`/${article.categorySlug}/${article.slug}`} />
            </div>
          </div>
        </header>

        {/* Pure CSS Gradient Artwork Placeholder */}
        <figure className="mt-8">
          <div
            className={`flex aspect-[16/9] w-full flex-col justify-between rounded-2xl bg-gradient-to-br ${article.coverGradient} p-6 text-white shadow-sm sm:p-10`}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {SITE_NAME} Visual Placeholder
              </span>
              <span className="rounded bg-amber-400/90 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-950">
                CSS Gradient
              </span>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/90 sm:text-sm">
                {article.coverLabel}
              </p>
              <p className="mt-1 text-xs text-white/75">
                Phase 1 uses pure CSS gradients instead of external photography.
              </p>
            </div>
          </div>
          <figcaption className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Illustration placeholder for {article.title} ({SITE_NAME} Phase 1
            Scaffold).
          </figcaption>
        </figure>

        {/* Article Body Paragraphs */}
        <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-800 dark:text-slate-200 sm:text-lg">
          {article.bodyParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {/* Tags Footer */}
        <footer className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Filed Under Sample Tags
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                #{tag}
              </Link>
            ))}
          </div>

          {/* Author Card (data from the Author model) */}
          <aside aria-labelledby="author-card-heading" className="mt-8 flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(buildPersonJsonLd(article.author)),
              }}
            />
            <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {article.author.penName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 id="author-card-heading" className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                About the author
              </h2>
              <p className="mt-1 font-serif text-base font-bold text-slate-900 dark:text-white">
                <Link
                  href={`/author/${article.author.slug}`}
                  className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
                >
                  {article.author.penName}
                </Link>
              </p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{article.author.roleTitle}</p>
              {article.author.bio && (
                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{article.author.bio}</p>
              )}
              <div className="mt-3">
                <Link
                  href={`/author/${article.author.slug}`}
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  View profile &amp; published articles &rarr;
                </Link>
              </div>
            </div>
          </aside>

          <Comments slug={article.slug} returnPath={`/${article.categorySlug}/${article.slug}`} />
        </footer>
      </article>

      {/* Related Sample Stories */}
      <section
        aria-labelledby="related-stories-heading"
        className="mt-16 border-t border-slate-200 pt-10 dark:border-slate-800"
      >
        <h2
          id="related-stories-heading"
          className="mb-6 font-serif text-2xl font-black text-slate-900 dark:text-white"
        >
          More Sample Dispatches on {SITE_NAME}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {relatedArticles.map((related) => (
            <ArticleCard
              key={related.id}
              article={related}
              variant="standard"
            />
          ))}
        </div>
      </section>

      <div className="mt-14">
        <Newsletter />
      </div>
    </div>
  );
}
