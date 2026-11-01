"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface SourceItem {
  id: string;
  name: string;
  domain: string;
  feedUrl: string | null;
  sourceType: string;
  trustTier: number;
  isEnabled: boolean;
  lastFetchedAt: string | null;
  createdAt: string;
  _count?: {
    articles: number;
    leads: number;
  };
}

export function SourceManager({
  initialSources,
  userRole,
}: {
  initialSources: SourceItem[];
  userRole: string;
}) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [sourceType, setSourceType] = useState("MANUAL");
  const [trustTier, setTrustTier] = useState(1);
  const [isEnabled, setIsEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const startEdit = (s: SourceItem) => {
    setEditingId(s.id);
    setName(s.name);
    setDomain(s.domain);
    setFeedUrl(s.feedUrl ?? "");
    setSourceType(s.sourceType);
    setTrustTier(s.trustTier);
    setIsEnabled(s.isEnabled);
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setDomain("");
    setFeedUrl("");
    setSourceType("MANUAL");
    setTrustTier(1);
    setIsEnabled(true);
    setMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const payload = {
      name,
      domain,
      feedUrl: feedUrl.trim() || null,
      sourceType,
      trustTier: Number(trustTier),
      isEnabled,
    };

    try {
      const url = editingId ? `/api/v1/admin/sources/${editingId}` : "/api/v1/admin/sources";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to save source.");
      }

      setMsg({
        kind: "ok",
        text: editingId ? "Source updated successfully." : "Source created on allowlist.",
      });

      if (editingId) {
        setSources((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, ...json.data } : s))
        );
      } else {
        setSources((prev) => [json.data, ...prev]);
      }

      cancelEdit();
      router.refresh();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setMsg({ kind: "err", text });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (source: SourceItem) => {
    try {
      const res = await fetch(`/api/v1/admin/sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !source.isEnabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to toggle source status.");

      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, isEnabled: !s.isEnabled } : s))
      );
      router.refresh();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setMsg({ kind: "err", text });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete source "${name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/sources/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to delete source.");

      setSources((prev) => prev.filter((s) => s.id !== id));
      setMsg({ kind: "ok", text: `Source "${name}" deleted.` });
      router.refresh();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setMsg({ kind: "err", text });
    }
  };

  return (
    <div className="space-y-8">
      {msg && (
        <div
          className={`rounded-md p-3 text-sm ${
            msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Source Editor Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
          {editingId ? "Edit Allowlisted Source" : "Add Source to Allowlist"}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Only allowlisted domains can be ingested as editorial leads. No scraped full text; sources provide origin verification.
        </p>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Source Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Billboard, AP News, Official Artist Site"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Domain *
              </label>
              <input
                type="text"
                required
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. billboard.com, apnews.com"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Source Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="MANUAL">MANUAL (Curated lead)</option>
                <option value="PRESS_RELEASE">PRESS_RELEASE (Official Label / PR)</option>
                <option value="OFFICIAL_STATEMENT">OFFICIAL_STATEMENT (Artist statement)</option>
                <option value="RSS">RSS (Syndicated news feed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Trust Tier (1 = Highest / Official, 5 = Emerging)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={trustTier}
                onChange={(e) => setTrustTier(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Feed URL (Optional, for RSS / feed tracking)
              </label>
              <input
                type="url"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="isEnabledCheck"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="isEnabledCheck"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Enabled on active allowlist (Leads from this domain can be ingested)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update Source" : "Add to Allowlist"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Sources Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-slate-900 dark:text-white">
            Active Source Allowlist ({sources.length})
          </h3>
          <span className="text-xs text-slate-500">
            {sources.filter((s) => s.isEnabled).length} active / {sources.filter((s) => !s.isEnabled).length} disabled
          </span>
        </div>

        {sources.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No sources configured yet. Add your first verified news source above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Source Name</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Trust Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Articles</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {s.domain}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {s.sourceType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          s.trustTier === 1
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        Tier {s.trustTier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(s)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                          s.isEnabled
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {s.isEnabled ? "Allowlisted" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {s._count?.articles ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => startEdit(s)}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="text-rose-600 hover:underline dark:text-rose-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
