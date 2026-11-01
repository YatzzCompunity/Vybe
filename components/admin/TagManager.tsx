"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface TagItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  _count: {
    articleTags: number;
  };
}

export function TagManager({
  initialTags,
  userRole,
}: {
  initialTags: TagItem[];
  userRole: string;
}) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const startEdit = (t: TagItem) => {
    setEditingId(t.id);
    setName(t.name);
    setSlug(t.slug);
    setDescription(t.description ?? "");
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const payload: Record<string, unknown> = {
      name,
      slug: slug || undefined,
      description: description || undefined,
    };

    try {
      const url = editingId ? `/api/v1/admin/tags/${editingId}` : "/api/v1/admin/tags";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({
          kind: "ok",
          text: editingId ? "Tag updated." : "Tag created successfully.",
        });
        cancelEdit();
        const refreshRes = await fetch("/api/v1/admin/tags");
        if (refreshRes.ok) {
          const fresh = await refreshRes.json();
          setTags(fresh.data);
        }
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Operation failed." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: TagItem) => {
    const force = t._count.articleTags > 0;
    const confirmText = force
      ? `Tag "${t.name}" is used by ${t._count.articleTags} article(s). Detach from all articles and permanently delete?`
      : `Delete tag "${t.name}"?`;

    if (!confirm(confirmText)) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/tags/${t.id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ kind: "ok", text: "Tag deleted." });
        setTags((prev) => prev.filter((item) => item.id !== t.id));
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Failed to delete tag." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
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

      {/* Tag Form */}
      <form
        onSubmit={handleSave}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
          <h2 className="font-serif text-base font-bold">
            {editingId ? "Edit Tag" : "Add New Tag"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tag Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. World Tour"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-derived if empty"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <input
            type="text"
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief scope of this tag..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update Tag" : "Create Tag"}
          </button>
        </div>
      </form>

      {/* Tags Grid */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          Existing Tags ({tags.length})
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {tags.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-800/60"
            >
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {t.name}
                </span>
                <span className="ml-1.5 font-mono text-[10px] text-slate-400">
                  /{t.slug}
                </span>
                <span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {t._count.articleTags}
                </span>
              </div>
              <div className="ml-2 flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-700">
                <button
                  onClick={() => startEdit(t)}
                  className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                  title="Edit tag"
                >
                  ✎
                </button>
                {userRole === "ADMIN" && (
                  <button
                    onClick={() => handleDelete(t)}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    title="Delete tag"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
