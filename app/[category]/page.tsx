import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_NAME } from "@/lib/config";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import {
  getAllArticles,
  getAllCategories,
  getArticlesByCategory,
  getCategoryBySlug,
} from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { Newsletter } from "@/components/Newsletter";

export const revalidate = 60;

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((cat) => ({
    category: cat.slug,
  }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const category = await getCategoryBySlug(params.category);
  if (!category) {
    return {
      title: "Category Not Found",
    };
  }

  const title = `${category.name} | ${SITE_NAME}`;
  const description = `${category.description} Read international news, analysis, and features on ${SITE_NAME}.`;
  const canonicalPath = `/${category.slug}`;

  return {
    title: `${category.name} News & Analysis`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = await getCategoryBySlug(params.category);

  // Return HTTP 404 for unknown category slugs
  if (!category) {
    notFound();
  }

  const [categoryArticles, allArticles, categories] = await Promise.all([
    getArticlesByCategory(category.slug),
    getAllArticles(),
    getAllCategories(),
  ]);
  const otherSampleArticles = allArticles
    .filter((a) => a.categorySlug !== category.slug)
    .slice(0, 3);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", item: "/" },
    { name: category.name, item: `/${category.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"
      >
        <Link
          href="/"
          className="hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-slate-900 dark:text-slate-200">
          {category.name}
        </span>
      </nav>

      {/* Category Hero Header */}
      <section
        className={`rounded-2xl bg-gradient-to-br ${category.accentColor} p-6 text-white shadow-sm sm:p-10`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
            {SITE_NAME} Editorial Section
          </span>
          <span className="rounded bg-amber-400/90 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-950">
            Sample Category Skeleton
          </span>
        </div>
        <h1 className="mt-4 font-serif text-3xl font-black tracking-tight sm:text-5xl">
          {category.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
          {category.description}
        </p>
      </section>

      {/* Category Switcher Pills */}
      <nav
        aria-label="Switch editorial category"
        className="flex flex-wrap items-center gap-2"
      >
        {categories.map((item) => {
          const isCurrent = item.slug === category.slug;
          return (
            <Link
              key={item.slug}
              href={`/${item.slug}`}
              aria-current={isCurrent ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                isCurrent
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Category Articles Grid */}
      <section aria-labelledby="category-articles-heading">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
          <h2
            id="category-articles-heading"
            className="font-serif text-xl font-black text-slate-900 dark:text-white sm:text-2xl"
          >
            Sample Dispatches in {category.name} ({categoryArticles.length})
          </h2>
          <Link
            href={`/search?category=${encodeURIComponent(category.slug)}`}
            className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Search within {category.name} &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categoryArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              variant="standard"
            />
          ))}
        </div>
      </section>

      {/* More Sample Articles From Other Sections */}
      <section aria-labelledby="more-sections-heading">
        <h2
          id="more-sections-heading"
          className="mb-5 border-b border-slate-200 pb-3 font-serif text-lg font-bold text-slate-900 dark:border-slate-800 dark:text-white"
        >
          More Sample Stories Across {SITE_NAME}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {otherSampleArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              variant="standard"
            />
          ))}
        </div>
      </section>

      <Newsletter />
    </div>
  );
}
