import React from "react";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/config";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/seo";
import {
  getAllArticles,
  getAllCategories,
  getFeaturedArticles,
  getTrendingArticles,
  getTrendingTopicSlugs,
} from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { Newsletter } from "@/components/Newsletter";

export const revalidate = 60;

export default async function HomePage() {
  const [
    { lead, secondary },
    trendingArticles,
    allSampleArticles,
    categories,
    trendingTopics,
  ] = await Promise.all([
    getFeaturedArticles(),
    getTrendingArticles(),
    getAllArticles(),
    getAllCategories(),
    getTrendingTopicSlugs(),
  ]);

  const websiteJsonLd = buildWebSiteJsonLd();
  const organizationJsonLd = buildOrganizationJsonLd();

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* Page H1 Masthead & Sample Content Banner */}
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Editorial Front Page • Phase 1 Scaffold
          </p>
          <h1 className="mt-1 font-serif text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {SITE_NAME}: Music, Artists &amp; Global Culture
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            {SITE_DESCRIPTION} All articles below are original sample
            placeholders built for layout, SEO hierarchy, and route testing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href="/search"
            className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 font-semibold text-slate-700 transition hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Browse Search &rarr;
          </Link>
        </div>
      </section>

      {/* Hero / Featured Section + Trending Sidebar */}
      <section aria-labelledby="featured-section-heading">
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="featured-section-heading"
            className="font-serif text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl"
          >
            Featured Sample Stories
          </h2>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Hero + Trending Layout
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Lead Hero Story (7 cols on desktop) */}
          <div className="space-y-6 lg:col-span-7">
            <ArticleCard article={lead} variant="hero" />

            {/* Secondary Featured Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {secondary.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant="standard"
                />
              ))}
            </div>
          </div>

          {/* Trending Section (5 cols on desktop) */}
          <aside
            aria-labelledby="trending-section-heading"
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <h2
                  id="trending-section-heading"
                  className="font-serif text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl"
                >
                  Trending Now (Sample)
                </h2>
                <Link
                  href="/trending"
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  View section &rarr;
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {trendingArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    variant="compact"
                  />
                ))}
              </div>
            </div>

            {/* Trending Topic Tags */}
            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sample Topic Descriptors
              </h3>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {trendingTopics.map((topic) => (
                  <Link
                    key={topic}
                    href={`/search?q=${encodeURIComponent(topic)}`}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    #{topic}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Latest News & Editorial Sections Grid */}
      <section aria-labelledby="latest-news-heading">
        <div className="mb-6 flex flex-col justify-between gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-end dark:border-slate-800">
          <div>
            <h2
              id="latest-news-heading"
              className="font-serif text-2xl font-black tracking-tight text-slate-900 dark:text-white"
            >
              Latest Sample Dispatches Across All Desks
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Showing all {allSampleArticles.length} original placeholder
              articles covering every navigation category.
            </p>
          </div>
          <Link
            href="/search"
            className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Filter &amp; search all sample articles &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allSampleArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              variant="standard"
            />
          ))}
        </div>
      </section>

      {/* Category Directory Band */}
      <section
        aria-labelledby="category-directory-heading"
        className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50"
      >
        <h2
          id="category-directory-heading"
          className="font-serif text-lg font-bold text-slate-900 dark:text-white"
        >
          Explore {SITE_NAME} Sections
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/${category.slug}`}
              className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-500/60 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {category.name}
                </h3>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  /{category.slug} &rarr;
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {category.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter Section */}
      <Newsletter />
    </div>
  );
}
