"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface LeadItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  sourceId: string;
  source: {
    id: string;
    name: string;
    domain: string;
    trustTier: number;
  };
  status: "NEW" | "APPROVED" | "REJECTED" | "CONVERTED";
  verifiedFacts: string | null;
  confidenceScore: number;
  convertedArticleId: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface SourceOption {
  id: string;
  name: string;
  domain: string;
  isEnabled: boolean;
}

export interface CategoryOption {
  id: string;
  slug: string;
  name: string;
}

export interface AuthorOption {
  id: string;
  penName: string;
}

export function LeadManager({
  initialLeads,
  sources,
  categories,
  authors,
  userRole,
  currentStatus,
}: {
  initialLeads: LeadItem[];
  sources: SourceOption[];
  categories: CategoryOption[];
  authors: AuthorOption[];
  userRole: string;
  currentStatus?: string;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [statusFilter, setStatusFilter] = useState(currentStatus || "ALL");

  // New Lead Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [sourceId, setSourceId] = useState(sources[0]?.id || "");
  const [summary, setSummary] = useState("");
  const [verifiedFacts, setVerifiedFacts] = useState("");
  const [confidenceScore, setConfidenceScore] = useState(0.9);

  // Generate Draft Modal state
  const [generatingLeadId, setGeneratingLeadId] = useState<string | null>(null);
  const [draftCategory, setDraftCategory] = useState(categories[0]?.id || "");
  const [draftAuthor, setDraftAuthor] = useState(authors[0]?.id || "");
  const [editorialPrompt, setEditorialPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  const filteredLeads =
    statusFilter === "ALL"
      ? leads
      : leads.filter((l) => l.status === statusFilter);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/v1/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          sourceId,
          summary,
          verifiedFacts: verifiedFacts || undefined,
          confidenceScore: Number(confidenceScore),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to create lead.");
      }

      setMsg({ kind: "ok", text: "Lead recorded for editorial review." });
      setLeads((prev) => [json.data, ...prev]);
      setTitle("");
      setUrl("");
      setSummary("");
      setVerifiedFacts("");
      setShowAddForm(false);
      router.refresh();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setMsg({ kind: "err", text });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (
    leadId: string,
    newStatus: "APPROVED" | "REJECTED" | "NEW"
  ) => {
    try {
      const res = await fetch(`/api/v1/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to update lead status.");

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
      setMsg({ kind: "ok", text: `Lead marked as ${newStatus}.` });
      router.refresh();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setMsg({ kind: "err", text });
    }
  };

  const handleGenerateDraft = async (leadId: string) => {
    setGenerating(true);
    setMsg(null);

    try {
      const res = await fetch("/api/v1/admin/ai/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          categoryId: draftCategory,
          authorId: draftAuthor,
          editorialPrompt: editorialPrompt || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        const errorMsg = json?.error?.message || json?.message || "Failed to generate AI draft.";
        throw new Error(errorMsg);
      }

      const createdArticle = json.data?.article;
      setMsg({
        kind: "ok",
        text: `Draft created successfully in state ${createdArticle?.status}. Redirecting to editor...`,
      });

      setGeneratingLeadId(null);
      router.push(`/admin/articles/${createdArticle.id}`);
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setMsg({ kind: "err", text });
    } finally {
      setGenerating(false);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    setMsg(null);

    try {
      const res = await fetch("/api/v1/admin/ai/scan", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Scan failed.");

      setMsg({
        kind: "info",
        text: `${json.data?.message} (Guardrail: ${json.data?.guardrailStatus})`,
      });
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setMsg({ kind: "err", text });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded-md p-3 text-sm ${
            msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : msg.kind === "info"
              ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {["ALL", "NEW", "APPROVED", "CONVERTED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {scanning ? "Auditing..." : "⚡ Run Pipeline Scan"}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            {showAddForm ? "Close Form" : "+ Record New Lead"}
          </button>
        </div>
      </div>

      {/* New Lead Form Drawer */}
      {showAddForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
            Record Editorial Lead
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Enter a lead for review. Full-text scraping of articles is prohibited; record verified facts and short summary.
          </p>

          <form onSubmit={handleCreateLead} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Headline / Lead Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Kendrick Lamar Announces 2027 World Tour and Next Studio Album"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Source * (Domain must be allowlisted)
                </label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.domain}) {s.isEnabled ? "" : "[DISABLED]"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Source URL *
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://billboard.com/music/..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Short Lead Summary * (System or editor summary; no verbatim copyright text)
                </label>
                <textarea
                  required
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief 2-3 sentence overview of the news or event..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Verified Facts / Editorial Checklist (Optional bullet points)
                </label>
                <textarea
                  rows={3}
                  value={verifiedFacts}
                  onChange={(e) => setVerifiedFacts(e.target.value)}
                  placeholder="- Verified date: November 1, 2026&#10;- Confirmed via official label press release&#10;- Stadium tour dates confirmed in 14 countries"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Initial Confidence Score (0.0 - 1.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={confidenceScore}
                  onChange={(e) => setConfidenceScore(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Lead"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Generate Draft Modal / Configuration Box */}
      {generatingLeadId && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/40">
          <h3 className="font-serif text-base font-bold text-slate-900 dark:text-white">
            Configure AI Draft Generation
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Generates structured original draft prose, headings, SEO metadata, and quality checks. The resulting article will be saved in state DRAFT (human review mandatory).
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Category
              </label>
              <select
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assign Staff Author
              </label>
              <select
                value={draftAuthor}
                onChange={(e) => setDraftAuthor(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.penName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Optional Editor Angle / Guidance Prompt
              </label>
              <input
                type="text"
                value={editorialPrompt}
                onChange={(e) => setEditorialPrompt(e.target.value)}
                placeholder="e.g. Focus on cultural implications and critical reception rather than gossip."
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <button
              onClick={() => handleGenerateDraft(generatingLeadId)}
              disabled={generating}
              className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? "Calling AI Provider..." : "✨ Generate AI Draft Now"}
            </button>
            <button
              onClick={() => setGeneratingLeadId(null)}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No leads found matching filter &quot;{statusFilter}&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((l) => (
            <div
              key={l.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        l.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : l.status === "CONVERTED"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                          : l.status === "REJECTED"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {l.status}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {l.source?.name} ({l.source?.domain})
                    </span>
                    <span className="text-xs text-slate-400">
                      Confidence: {Math.round(l.confidenceScore * 100)}%
                    </span>
                  </div>

                  <h3 className="font-serif text-base font-bold text-slate-900 dark:text-white">
                    {l.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {l.summary}
                  </p>

                  {l.verifiedFacts && (
                    <div className="mt-2 rounded bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                      <span className="font-semibold block text-slate-700 dark:text-slate-200">
                        Verified Facts Checklist:
                      </span>
                      <pre className="whitespace-pre-wrap font-sans mt-0.5">
                        {l.verifiedFacts}
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Source Link ↗
                    </a>
                    <span>•</span>
                    <span>Recorded {new Date(l.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 items-end">
                  {l.status === "CONVERTED" && l.convertedArticleId ? (
                    <Link
                      href={`/admin/articles/${l.convertedArticleId}`}
                      className="rounded bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:border-purple-800 dark:text-purple-300"
                    >
                      View Generated Draft →
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={() => setGeneratingLeadId(l.id)}
                        className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                      >
                        ✨ Generate AI Draft
                      </button>

                      <div className="flex items-center gap-1.5 text-xs">
                        {l.status !== "APPROVED" && (
                          <button
                            onClick={() => handleUpdateStatus(l.id, "APPROVED")}
                            className="text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            Approve
                          </button>
                        )}
                        {l.status !== "REJECTED" && (
                          <button
                            onClick={() => handleUpdateStatus(l.id, "REJECTED")}
                            className="text-rose-600 hover:underline dark:text-rose-400"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
