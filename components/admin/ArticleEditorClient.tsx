"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface AuthorOption {
  id: string;
  penName: string;
  roleTitle: string;
}

interface ArticleData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  bodyMarkdown: string;
  editorialNote: string | null;
  status: string;
  state: string;
  isFeatured: boolean;
  isTrending: boolean;
  trendingRank: number | null;
  publishedAt: string | null;
  readingTimeMinutes: number;
  categoryId: string;
  authorId: string;
  tags: string[];
  isAiAssisted?: boolean;
  aiMetadataJson?: string | null;
  sourceId?: string | null;
  source?: {
    id: string;
    name: string;
    domain: string;
    trustTier: number;
  } | null;
  seoMetadata?: {
    metaTitle: string | null;
    metaDescription: string | null;
    canonicalUrl: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageUrl: string | null;
    twitterCardType: string | null;
    noIndex: boolean;
    noFollow: boolean;
  } | null;
  category: { id: string; name: string; slug: string };
  author: { id: string; penName: string };
}

interface Props {
  mode: "create" | "edit";
  initialArticle?: ArticleData;
  categories: CategoryOption[];
  authors: AuthorOption[];
  userRole: string;
}

export function ArticleEditorClient({
  mode,
  initialArticle,
  categories,
  authors,
  userRole,
}: Props) {
  const router = useRouter();

  // Main article form state
  const [title, setTitle] = useState(initialArticle?.title ?? "");
  const [slug, setSlug] = useState(initialArticle?.slug ?? "");
  const [subtitle, setSubtitle] = useState(initialArticle?.subtitle ?? "");
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt ?? "");
  const [bodyMarkdown, setBodyMarkdown] = useState(initialArticle?.bodyMarkdown ?? "");
  const [editorialNote, setEditorialNote] = useState(initialArticle?.editorialNote ?? "");
  const [categoryId, setCategoryId] = useState(
    initialArticle?.categoryId ?? categories[0]?.id ?? ""
  );
  const [authorId, setAuthorId] = useState(
    initialArticle?.authorId ?? authors[0]?.id ?? ""
  );
  const [tagsStr, setTagsStr] = useState(
    initialArticle?.tags ? initialArticle.tags.join(", ") : ""
  );
  const [isFeatured, setIsFeatured] = useState(initialArticle?.isFeatured ?? false);
  const [isTrending, setIsTrending] = useState(initialArticle?.isTrending ?? false);
  const [trendingRank, setTrendingRank] = useState<string>(
    initialArticle?.trendingRank ? String(initialArticle.trendingRank) : ""
  );

  // Status & SEO state
  const [state, setState] = useState(initialArticle?.state ?? "DRAFT");
  const [publishedAt, setPublishedAt] = useState(initialArticle?.publishedAt ?? null);
  const [scheduleDate, setScheduleDate] = useState("");

  // SEO Form state
  const seo = initialArticle?.seoMetadata;
  const [metaTitle, setMetaTitle] = useState(seo?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(seo?.metaDescription ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(seo?.canonicalUrl ?? "");
  const [ogTitle, setOgTitle] = useState(seo?.ogTitle ?? "");
  const [ogDescription, setOgDescription] = useState(seo?.ogDescription ?? "");
  const [ogImageUrl, setOgImageUrl] = useState(seo?.ogImageUrl ?? "");
  const [twitterCardType, setTwitterCardType] = useState(
    seo?.twitterCardType ?? "summary_large_image"
  );
  const [noIndex, setNoIndex] = useState(seo?.noIndex ?? false);
  const [noFollow, setNoFollow] = useState(seo?.noFollow ?? false);

  // UI feedback
  const [saving, setSaving] = useState(false);
  const [savingSeo, setSavingSeo] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [seoMsg, setSeoMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // AI Metadata & Quality Checks
  let initialParsedAiMetadata: Record<string, unknown> | null = null;
  try {
    if (initialArticle?.aiMetadataJson) {
      initialParsedAiMetadata = JSON.parse(initialArticle.aiMetadataJson);
    }
  } catch {}

  const [aiMetadata] = useState(initialParsedAiMetadata);
  const [qualityReport, setQualityReport] = useState<any>(
    initialParsedAiMetadata?.qualityReport ?? null
  );
  const [runningQc, setRunningQc] = useState(false);
  const [qcMsg, setQcMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleRunQualityCheck = async () => {
    setRunningQc(true);
    setQcMsg(null);
    try {
      const res = await fetch("/api/v1/admin/ai/quality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt,
          bodyMarkdown,
          currentArticleId: initialArticle?.id,
          categoryId,
          tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
          seoMetadata: {
            metaTitle,
            metaDescription,
            ogTitle,
            ogDescription,
          },
          sourcesCited: (aiMetadata as any)?.sourcesCited || [],
          unverifiedClaims: (aiMetadata as any)?.unverifiedClaims || [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Quality check failed.");

      setQualityReport(json.data);
      setQcMsg({ kind: "ok", text: "Quality checks refreshed successfully." });
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setQcMsg({ kind: "err", text });
    } finally {
      setRunningQc(false);
    }
  };

  // Save Article (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      title,
      slug: slug || undefined,
      subtitle: subtitle || undefined,
      excerpt,
      bodyMarkdown,
      editorialNote: editorialNote || undefined,
      categoryId,
      authorId,
      tags,
      isFeatured,
      isTrending,
      trendingRank: trendingRank ? parseInt(trendingRank, 10) : undefined,
    };

    try {
      const url =
        mode === "create"
          ? "/api/v1/admin/articles"
          : `/api/v1/admin/articles/${initialArticle?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        setMsg({
          kind: "err",
          text: resData.error?.message ?? "Failed to save article.",
        });
        setSaving(false);
        return;
      }

      setMsg({
        kind: "ok",
        text:
          mode === "create"
            ? "Article created as DRAFT! You can now publish or schedule it."
            : "Article saved successfully.",
      });

      if (mode === "create") {
        router.push(`/admin/articles/${resData.data.id}`);
      } else {
        setState(resData.data.state);
        setPublishedAt(resData.data.publishedAt);
        router.refresh();
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setSaving(false);
    }
  };

  // Publish Now
  const handlePublish = async () => {
    if (!initialArticle?.id) return;
    if (!confirm("Publish this article immediately? It will become publicly visible.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/articles/${initialArticle.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setState("PUBLISHED");
        setPublishedAt(data.data.publishedAt);
        setMsg({ kind: "ok", text: "Article is now LIVE and publicly visible." });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Publish failed." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setSaving(false);
    }
  };

  // Unpublish
  const handleUnpublish = async () => {
    if (!initialArticle?.id) return;
    if (!confirm("Unpublish this article? It will revert to DRAFT and hide from the public.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/articles/${initialArticle.id}/unpublish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setState("DRAFT");
        setPublishedAt(null);
        setMsg({ kind: "ok", text: "Article unpublished and reverted to DRAFT." });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Unpublish failed." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setSaving(false);
    }
  };

  // Schedule
  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialArticle?.id || !scheduleDate) return;
    setSaving(true);
    try {
      const whenIso = new Date(scheduleDate).toISOString();
      const res = await fetch(`/api/v1/admin/articles/${initialArticle.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishedAt: whenIso }),
      });
      const data = await res.json();
      if (res.ok) {
        setState("SCHEDULED");
        setPublishedAt(data.data.publishedAt);
        setMsg({
          kind: "ok",
          text: `Article scheduled for publication at ${new Date(whenIso).toLocaleString()}. It remains hidden from public view until that time.`,
        });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Schedule failed." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setSaving(false);
    }
  };

  // Save SEO
  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialArticle?.id) return;
    setSavingSeo(true);
    setSeoMsg(null);

    const payload = {
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      canonicalUrl: canonicalUrl || undefined,
      ogTitle: ogTitle || undefined,
      ogDescription: ogDescription || undefined,
      ogImageUrl: ogImageUrl || undefined,
      twitterCardType: twitterCardType || undefined,
      noIndex,
      noFollow,
    };

    try {
      const res = await fetch(`/api/v1/admin/articles/${initialArticle.id}/seo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSeoMsg({ kind: "ok", text: "SEO metadata saved successfully." });
        router.refresh();
      } else {
        setSeoMsg({ kind: "err", text: data.error?.message ?? "Failed to save SEO metadata." });
      }
    } catch {
      setSeoMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setSavingSeo(false);
    }
  };

  // Delete (admin only)
  const handleDelete = async () => {
    if (!initialArticle?.id) return;
    if (state === "PUBLISHED") {
      alert("Please unpublish the article before deleting it.");
      return;
    }
    if (!confirm("Permanently delete this article? This action cannot be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/articles/${initialArticle.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        alert("Article deleted.");
        router.push("/admin/articles");
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Failed to delete article." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/articles"
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400"
            >
              ← Back to articles
            </Link>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight">
            {mode === "create" ? "Create New Article" : `Edit Article: ${title}`}
          </h1>
        </div>

        {mode === "edit" && initialArticle && (
          <div className="flex items-center gap-2">
            {state === "PUBLISHED" && (
              <Link
                href={`/${initialArticle.category.slug}/${initialArticle.slug}`}
                target="_blank"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400"
              >
                View Live ↗
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Global Status Message */}
      {msg && (
        <div
          role="status"
          className={`rounded-md p-3 text-sm border ${
            msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* AI Assisted Guardrail Banner */}
      {initialArticle?.isAiAssisted && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-4 shadow-sm dark:border-purple-900/60 dark:bg-purple-950/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-purple-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                AI-Assisted Draft
              </span>
              <span className="text-xs font-semibold text-purple-950 dark:text-purple-200">
                Human Editorial Gate: Approval Required Before Publication
              </span>
            </div>
            {initialArticle.source && (
              <span className="text-xs text-purple-800 dark:text-purple-300">
                Source: <strong>{initialArticle.source.name}</strong> ({initialArticle.source.domain})
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-purple-800 dark:text-purple-300">
            This article contains AI-generated or AI-assisted content. Under VYBE editorial guardrails, it can never be published automatically. Inspect the quality report below, check sources and unverified claims, and approve manually.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content Form (Left 2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-serif text-lg font-bold border-b border-slate-100 pb-2 dark:border-slate-800">
              Article Content
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title..."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Slug & Subtitle */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Slug (URL segment)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated-from-title"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-[11px] text-slate-400">Leave blank to auto-slugify title.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Short supporting header..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Category and Author */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (/{c.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Author <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.penName} ({a.roleTitle})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Excerpt (Lead paragraph) <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                maxLength={600}
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary shown on cards and feeds (max 600 chars)..."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Markdown Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Article Body (Markdown) <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={14}
                value={bodyMarkdown}
                onChange={(e) => setBodyMarkdown(e.target.value)}
                placeholder="# Heading&#10;&#10;Write the article content in Markdown format..."
                className="w-full font-mono rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Tags & Editorial Note */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tags (comma-separated slugs)
                </label>
                <input
                  type="text"
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  placeholder="e.g. k-pop, interviews, new-album"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Editorial Note (internal)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={editorialNote}
                  onChange={(e) => setEditorialNote(e.target.value)}
                  placeholder="Private notes for staff..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Featured & Trending Flags */}
            <div className="rounded-md border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Curation &amp; Visibility Flags
              </h3>
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Feature on Hero Carousel</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTrending}
                    onChange={(e) => setIsTrending(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Mark as Trending</span>
                </label>

                {isTrending && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Rank (1-999):</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={trendingRank}
                      onChange={(e) => setTrendingRank(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : mode === "create" ? "Create Article (as Draft)" : "Save Changes"}
              </button>
            </div>
          </form>

          {/* AI Quality Checks & Integrity Panel (in edit mode) */}
          {mode === "edit" && initialArticle && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg font-bold">Content Quality &amp; Editorial Integrity</h2>
                  {qualityReport && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        qualityReport.score >= 80
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : qualityReport.score >= 60
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      Score: {qualityReport.score}/100
                    </span>
                  )}
                  {qualityReport && (
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        qualityReport.needsReview
                          ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}
                    >
                      {qualityReport.needsReview ? "Needs Editorial Review" : "Passed Checks"}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleRunQualityCheck}
                  disabled={runningQc}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 disabled:opacity-50"
                >
                  {runningQc ? "Running Checks..." : "🔍 Run Quality Check"}
                </button>
              </div>

              {qcMsg && (
                <div
                  className={`rounded-md p-2.5 text-xs border ${
                    qcMsg.kind === "ok"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  {qcMsg.text}
                </div>
              )}

              {/* Quality Checklist details */}
              {qualityReport ? (
                <div className="space-y-4 pt-1 text-xs">
                  {/* Factual Accuracy */}
                  <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>1. Factual Accuracy &amp; Sources</span>
                      <span className="text-slate-500 font-mono">
                        Confidence: {Math.round(qualityReport.factualAccuracy.confidenceLevel * 100)}%
                      </span>
                    </div>
                    <div className="mt-2 text-slate-600 dark:text-slate-400 space-y-1">
                      <p>
                        <strong>Sources Cited:</strong>{" "}
                        {qualityReport.factualAccuracy.sourcesCited.length > 0
                          ? qualityReport.factualAccuracy.sourcesCited.join(", ")
                          : "None cited (Flagged)"}
                      </p>
                      {qualityReport.factualAccuracy.unverifiedClaims.length > 0 && (
                        <div className="mt-2 rounded bg-amber-50 p-2 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                          <strong>⚠️ Unverified Claims Flagged ({qualityReport.factualAccuracy.unverifiedClaims.length}):</strong>
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {qualityReport.factualAccuracy.unverifiedClaims.map((c: string, idx: number) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {qualityReport.factualAccuracy.flags.map((f: string, idx: number) => (
                        <p key={idx} className="text-amber-600 dark:text-amber-400">
                          • {f}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Grammar & Spelling */}
                  <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>2. Grammar &amp; Spelling Pass</span>
                      <span className={qualityReport.grammarSpelling.passed ? "text-emerald-600" : "text-amber-600"}>
                        {qualityReport.grammarSpelling.passed ? "✓ Passed" : `${qualityReport.grammarSpelling.issues.length} Note(s)`}
                      </span>
                    </div>
                    {qualityReport.grammarSpelling.issues.length > 0 ? (
                      <ul className="mt-2 list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1">
                        {qualityReport.grammarSpelling.issues.map((iss: any, idx: number) => (
                          <li key={idx}>
                            <span className="font-semibold">{iss.type}:</span> {iss.message}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-slate-500">No repeated words, excessive punctuation, or unmatched syntax detected.</p>
                    )}
                  </div>

                  {/* Duplicate / Plagiarism Risk */}
                  <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>3. Duplicate / Plagiarism Risk Check</span>
                      <span className={qualityReport.duplicateRisk.isExactDuplicate ? "text-rose-600 font-bold" : "text-slate-500"}>
                        Similarity: {Math.round(qualityReport.duplicateRisk.highestSimilarity * 100)}%
                      </span>
                    </div>
                    {qualityReport.duplicateRisk.flags.length > 0 && (
                      <div className="mt-2 space-y-1 text-rose-600 dark:text-rose-400">
                        {qualityReport.duplicateRisk.flags.map((fl: string, idx: number) => (
                          <p key={idx}>• {fl}</p>
                        ))}
                      </div>
                    )}
                    {qualityReport.duplicateRisk.similarArticles.length > 0 && (
                      <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Existing similar articles:</span>
                        <ul className="list-disc list-inside">
                          {qualityReport.duplicateRisk.similarArticles.map((sa: any) => (
                            <li key={sa.id}>
                              &quot;{sa.title}&quot; ({Math.round(sa.similarity * 100)}% similarity)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Heading Hierarchy & SEO Completeness */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">
                        4. Heading Hierarchy
                      </span>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        {qualityReport.headingHierarchy.passed
                          ? "✓ Clean heading structure (H2/H3)"
                          : qualityReport.headingHierarchy.issues.join("; ")}
                      </p>
                    </div>

                    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">
                        5. SEO Completeness
                      </span>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        Title: {qualityReport.seoCompleteness.metaTitleLength}c • Description: {qualityReport.seoCompleteness.metaDescriptionLength}c
                        {qualityReport.seoCompleteness.issues.length > 0 && (
                          <span className="block text-amber-600 dark:text-amber-400 mt-0.5">
                            {qualityReport.seoCompleteness.issues[0]}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Internal Link Suggestions */}
                  {qualityReport.internalLinks.suggestions.length > 0 && (
                    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">
                        6. Contextual Internal Link Suggestions
                      </span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {qualityReport.internalLinks.suggestions.map((sug: any) => (
                          <Link
                            key={sug.id}
                            href={`/${sug.categorySlug}/${sug.slug}`}
                            target="_blank"
                            className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          >
                            🔗 {sug.title} ({sug.categorySlug}) ↗
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Art Direction / Image Prompt */}
                  {(aiMetadata as any)?.imagePrompt && (
                    <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">
                        Art Direction / Hero Image Prompt Suggestion:
                      </span>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 italic">
                        &quot;{(aiMetadata as any).imagePrompt}&quot;
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500">
                  <p>No quality report recorded for this draft.</p>
                  <button
                    type="button"
                    onClick={handleRunQualityCheck}
                    className="mt-2 text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Click to run initial quality check →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Per-Article SEO Editor (only in edit mode) */}
          {mode === "edit" && initialArticle && (
            <form onSubmit={handleSaveSeo} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <h2 className="font-serif text-lg font-bold">SEO &amp; Social Meta Tags</h2>
                <span className="text-xs text-slate-500">API: PUT /api/v1/admin/articles/[id]/seo</span>
              </div>

              {seoMsg && (
                <div
                  role="status"
                  className={`rounded-md p-2.5 text-xs border ${
                    seoMsg.kind === "ok"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  {seoMsg.text}
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Meta Title</span>
                  <span className={metaTitle.length > 70 ? "text-red-500" : "text-slate-400"}>
                    {metaTitle.length}/70
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={70}
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Defaults to article title if empty"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Meta Description</span>
                  <span className={metaDescription.length > 200 ? "text-red-500" : "text-slate-400"}>
                    {metaDescription.length}/200
                  </span>
                </div>
                <textarea
                  maxLength={200}
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Search snippet summary..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Canonical URL
                  </label>
                  <input
                    type="url"
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    placeholder="https://example.com/original-article"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    OG Image URL
                  </label>
                  <input
                    type="url"
                    value={ogImageUrl}
                    onChange={(e) => setOgImageUrl(e.target.value)}
                    placeholder="https://cdn.example.com/banner.jpg"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Open Graph Title
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={ogTitle}
                    onChange={(e) => setOgTitle(e.target.value)}
                    placeholder="Social card title..."
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Twitter Card Type
                  </label>
                  <select
                    value={twitterCardType}
                    onChange={(e) => setTwitterCardType(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="summary_large_image">summary_large_image</option>
                    <option value="summary">summary</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Open Graph Description
                </label>
                <textarea
                  maxLength={300}
                  rows={2}
                  value={ogDescription}
                  onChange={(e) => setOgDescription(e.target.value)}
                  placeholder="Social preview description..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noIndex}
                    onChange={(e) => setNoIndex(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>No-Index (block search crawlers)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noFollow}
                    onChange={(e) => setNoFollow(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>No-Follow (do not endorse links)</span>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSeo}
                  className="rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  {savingSeo ? "Saving SEO..." : "Update SEO Metadata"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar Controls (Right 1 col) */}
        <div className="space-y-6">
          {mode === "create" ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Publication Workflow
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                New articles always start in <span className="font-semibold text-slate-800 dark:text-slate-200">DRAFT</span> status. After saving, you will be redirected to the editor where you can publish immediately or schedule a future release date.
              </p>
            </div>
          ) : (
            <>
              {/* Publication Status & Lifecycle */}
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Publication Lifecycle
                </h3>

                <div className="rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Current State:</span>
                    <span className="font-bold text-slate-900 dark:text-white uppercase">
                      {state}
                    </span>
                  </div>
                  {publishedAt && (
                    <div className="mt-2 text-slate-500 text-[11px]">
                      {state === "SCHEDULED" ? "Goes live on:" : "Published on:"}{" "}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {new Date(publishedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Publish & Unpublish Actions */}
                <div className="space-y-2">
                  {state !== "PUBLISHED" ? (
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={saving}
                      className="w-full rounded-md bg-emerald-600 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Publish Now (Make Public)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUnpublish}
                      disabled={saving}
                      className="w-full rounded-md bg-amber-600 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                    >
                      Unpublish (Revert to Draft)
                    </button>
                  )}
                </div>

                {/* Schedule Publication Form */}
                <form onSubmit={handleSchedule} className="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Schedule for Future Date
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={saving || !scheduleDate}
                    className="w-full rounded-md bg-slate-800 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700"
                  >
                    Set Schedule
                  </button>
                  <p className="text-[10px] text-slate-400">
                    Scheduled stories remain hidden from public feeds and searches until the specified timestamp passes.
                  </p>
                </form>

                {/* Safe Delete for Admins */}
                {userRole === "ADMIN" && (
                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      className="w-full rounded-md border border-rose-200 bg-rose-50 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      Delete Article
                    </button>
                    {state === "PUBLISHED" && (
                      <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                        Must unpublish first before deleting.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Info panel */}
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-xs text-slate-500 space-y-2">
                <div>Article ID: <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{initialArticle?.id}</span></div>
                <div>Reading Time: <span className="font-medium text-slate-700 dark:text-slate-300">{initialArticle?.readingTimeMinutes} min</span></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
