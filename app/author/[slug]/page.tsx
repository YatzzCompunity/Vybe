import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_NAME } from "@/lib/config";
import { getArticlesByAuthor, getAuthorBySlug } from "@/lib/articles";
import { buildBreadcrumbJsonLd, buildPersonJsonLd } from "@/lib/seo";
import { ArticleCard } from "@/components/ArticleCard";
import { Newsletter } from "@/components/Newsletter";
import prisma from "@/lib/db";

interface AuthorPageProps {
  params: {
    slug: string;
  };
}

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const authors = await prisma.author.findMany({
      select: { slug: true },
    });
    return authors.map((a) => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const author = await getAuthorBySlug(params.slug);
  if (!author) {
    return {
      title: "Author Not Found",
    };
  }

  const title = `${author.penName} — Editorial Profile`;
  const description =
    author.bio ||
    `Articles, reviews, and music journalism by ${author.penName} on ${SITE_NAME}.`;
  const canonicalPath = `/author/${author.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "profile",
      siteName: SITE_NAME,
      title: `${author.penName} | ${SITE_NAME}`,
      description,
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title: `${author.penName} | ${SITE_NAME}`,
      description,
    },
  };
}

export default async function AuthorProfilePage({ params }: AuthorPageProps) {
  const author = await getAuthorBySlug(params.slug);
  if (!author) {
    notFound();
  }

  const articles = await getArticlesByAuthor(author.id);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", item: "/" },
    { name: "Authors", item: "/author" },
    { name: author.penName, item: `/author/${author.slug}` },
  ]);

  const personJsonLd = buildPersonJsonLd(author);

  const initials = author.penName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
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
        <span className="text-slate-500 dark:text-slate-400">Authors</span>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-slate-900 dark:text-slate-200">
          {author.penName}
        </span>
      </nav>

      {/* Author Profile Header */}
      <section
        aria-labelledby="author-profile-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-2xl font-bold text-white shadow-md sm:h-24 sm:w-24 sm:text-3xl"
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {author.isStaff ? "Staff Contributor" : "Contributor"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {articles.length} published{" "}
                {articles.length === 1 ? "dispatch" : "dispatches"}
              </span>
            </div>

            <h1
              id="author-profile-heading"
              className="mt-3 font-serif text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl"
            >
              {author.penName}
            </h1>

            <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {author.roleTitle}
            </p>

            {author.bio && (
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:text-base">
                {author.bio}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Published Articles Grid */}
      <section aria-labelledby="author-articles-heading">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
          <h2
            id="author-articles-heading"
            className="font-serif text-xl font-black text-slate-900 dark:text-white sm:text-2xl"
          >
            Dispatches by {author.penName} ({articles.length})
          </h2>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No published dispatches found for this author.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                variant="standard"
              />
            ))}
          </div>
        )}
      </section>

      <Newsletter />
    </div>
  );
}
