import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/config";
import { getAllCategories, searchArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { SearchBar } from "@/components/SearchBar";

interface SearchPageProps {
  searchParams?: {
    q?: string | string[];
    category?: string | string[];
  };
}

export const metadata: Metadata = {
  title: "Search Sample Articles",
  description: `Search across sample music, celebrity, artist, and album placeholder stories on ${SITE_NAME}.`,
  alternates: {
    canonical: "/search",
  },
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const rawQuery = Array.isArray(searchParams?.q)
    ? searchParams?.q[0]
    : searchParams?.q;
  const rawCategory = Array.isArray(searchParams?.category)
    ? searchParams?.category[0]
    : searchParams?.category;

  const query = (rawQuery ?? "").trim();
  const categoryFilter = (rawCategory ?? "").trim().toLowerCase();

  const [results, categories] = await Promise.all([
    searchArticles(query, categoryFilter || undefined),
    getAllCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Search Header */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          {SITE_NAME} Archive Filter • Phase 1 Local Dataset
        </p>
        <h1 className="mt-2 font-serif text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Search Sample Articles
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Filter sample placeholder stories stored in Prisma by keyword, topic
          tag, or editorial category.
        </p>

        <div className="mt-6 max-w-2xl">
          <SearchBar
            defaultValue={query}
            categoryFilter={categoryFilter || undefined}
            placeholder="Try 'album', 'touring', 'spatial-audio', 'styling'..."
          />
        </div>

        {/* Category Filter Pills */}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400">
            Category filter:
          </span>
          <Link
            href={query ? `/search?q=${encodeURIComponent(query)}` : "/search"}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              !categoryFilter
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            All Categories
          </Link>
          {categories.map((cat) => {
            const isSelected = categoryFilter === cat.slug;
            const params = new URLSearchParams();
            if (query) params.set("q", query);
            params.set("category", cat.slug);
            return (
              <Link
                key={cat.slug}
                href={`/search?${params.toString()}`}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Search Results Section */}
      <section aria-labelledby="search-results-heading">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
          <h2
            id="search-results-heading"
            className="font-serif text-xl font-black text-slate-900 dark:text-white"
          >
            {query ? (
              <>
                Showing {results.length} sample{" "}
                {results.length === 1 ? "result" : "results"} for &ldquo;
                {query}&rdquo;
              </>
            ) : (
              <>
                Showing {results.length} sample{" "}
                {results.length === 1 ? "article" : "articles"}
                {categoryFilter ? ` in "${categoryFilter}"` : ""}
              </>
            )}
          </h2>

          {query || categoryFilter ? (
            <Link
              href="/search"
              className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Reset filters
            </Link>
          ) : null}
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                variant="standard"
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-800">
            <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
              No matching sample articles found
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Try searching for sample keywords such as{" "}
              <Link
                href="/search?q=album"
                className="font-semibold text-indigo-600 underline dark:text-indigo-400"
              >
                album
              </Link>
              ,{" "}
              <Link
                href="/search?q=touring"
                className="font-semibold text-indigo-600 underline dark:text-indigo-400"
              >
                touring
              </Link>
              ,{" "}
              <Link
                href="/search?q=studio"
                className="font-semibold text-indigo-600 underline dark:text-indigo-400"
              >
                studio
              </Link>
              , or{" "}
              <Link
                href="/search?q=spatial"
                className="font-semibold text-indigo-600 underline dark:text-indigo-400"
              >
                spatial
              </Link>
              .
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
