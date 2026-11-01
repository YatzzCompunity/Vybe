import React from "react";
import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/config";
import type { SampleArticle } from "@/lib/types";

interface ArticleCardProps {
  article: SampleArticle;
  variant?: "hero" | "secondary" | "standard" | "compact";
}

export function ArticleCard({
  article,
  variant = "standard",
}: ArticleCardProps) {
  const category = CATEGORY_MAP[article.categorySlug];
  const articleHref = `/${article.categorySlug}/${article.slug}`;
  const categoryHref = `/${article.categorySlug}`;

  if (variant === "compact") {
    return (
      <article className="group flex items-start gap-3.5 rounded-xl border border-slate-200/80 bg-white p-3.5 transition hover:border-indigo-500/50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-400/50">
        {typeof article.trendingRank === "number" ? (
          <span
            aria-label={`Trending rank ${article.trendingRank}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/10 font-serif text-sm font-black text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300"
          >
            0{article.trendingRank}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
            <Link
              href={categoryHref}
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {category.name}
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
              SAMPLE
            </span>
          </div>
          <h3 className="mt-1 font-serif text-sm font-bold leading-snug text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
            <Link href={articleHref}>{article.title}</Link>
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {article.author.penName} • {article.readingTimeMinutes} min read
          </p>
        </div>
      </article>
    );
  }

  if (variant === "hero") {
    return (
      <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        {/* Pure CSS Gradient Placeholder Artwork (No hotlinked external images) */}
        <Link
          href={articleHref}
          aria-label={`Read sample article: ${article.title}`}
          className={`relative flex aspect-[16/9] w-full flex-col justify-between bg-gradient-to-br ${article.coverGradient} p-6 text-white sm:p-8`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              Lead Sample Feature • {category.name}
            </span>
            <span className="rounded bg-amber-400/90 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-950">
              Sample Placeholder
            </span>
          </div>
          <div className="my-auto py-6">
            <p className="font-mono text-xs uppercase tracking-widest text-white/80">
              {article.coverLabel}
            </p>
            <p className="mt-1 text-xs text-white/75">
              CSS Gradient Placeholder (Zero copyrighted/hotlinked imagery)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/85">
            <span>{article.publishedDisplay}</span>
            <span>•</span>
            <span>{article.readingTimeMinutes} min read</span>
          </div>
        </Link>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Link href={categoryHref} className="hover:underline">
              {category.name}
            </Link>
            <span>•</span>
            <span className="text-slate-500 dark:text-slate-400">
              {article.author.penName}
            </span>
          </div>

          <h2 className="mt-2.5 font-serif text-2xl font-black leading-tight text-slate-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 sm:text-3xl">
            <Link href={articleHref}>{article.title}</Link>
          </h2>

          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {article.excerpt}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-wrap gap-1.5">
              {article.tags.slice(0, 3).map((tag) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  #{tag}
                </Link>
              ))}
            </div>
            <Link
              href={articleHref}
              className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Read sample story &rarr;
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <Link
        href={articleHref}
        aria-label={`Read sample article: ${article.title}`}
        className={`relative flex aspect-[16/10] w-full flex-col justify-between bg-gradient-to-br ${article.coverGradient} p-4 text-white`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-black/30 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
            {category.name}
          </span>
          <span className="rounded bg-amber-400/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-950">
            Sample
          </span>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-white/85">
          {article.coverLabel}
        </p>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link
              href={categoryHref}
              className="font-bold uppercase tracking-wider text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {category.name}
            </Link>
            <span>•</span>
            <span>{article.readingTimeMinutes} min read</span>
          </div>

          <h3 className="mt-2 font-serif text-lg font-bold leading-snug text-slate-900 transition group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
            <Link href={articleHref}>{article.title}</Link>
          </h3>

          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {article.excerpt}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="truncate">{article.author.penName}</span>
          <Link
            href={articleHref}
            className="shrink-0 font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Read &rarr;
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ArticleCard;
