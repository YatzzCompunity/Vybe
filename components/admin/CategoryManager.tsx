"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  accentColor: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  _count: {
    articles: number;
    children: number;
    trendingTopics: number;
  };
}

export function CategoryManager({
  initialCategories,
  userRole,
}: {
  initialCategories: CategoryItem[];
  userRole: string;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const startEdit = (c: CategoryItem) => {
    setEditingId(c.id);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description);
    setAccentColor(c.accentColor ?? "");
    setSortOrder(String(c.sortOrder));
    setIsActive(c.isActive);
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setAccentColor("");
    setSortOrder("0");
    setIsActive(true);
    setMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const payload: Record<string, unknown> = {
      name,
      description,
      accentColor: accentColor || undefined,
      sortOrder: parseInt(sortOrder, 10) || 0,
      isActive,
    };

    if (!editingId) {
      payload.slug = slug.toLowerCase().trim();
    }

    try {
      const url = editingId
        ? `/api/v1/admin/categories/${editingId}`
        : "/api/v1/admin/categories";
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
          text: editingId ? "Category updated." : "Category created successfully.",
        });
        cancelEdit();
        // Refresh category list from server
        const refreshRes = await fetch("/api/v1/admin/categories");
        if (refreshRes.ok) {
          const fresh = await refreshRes.json();
          setCategories(fresh.data);
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"? Categories in use with articles cannot be deleted.`)) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/categories/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ kind: "ok", text: "Category deleted." });
        setCategories((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Failed to delete category." });
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

      {/* Category Creation / Edit Form */}
      <form
        onSubmit={handleSave}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
          <h2 className="font-serif text-base font-bold">
            {editingId ? "Edit Category" : "Add New Category"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pop Culture"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={Boolean(editingId)}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. pop-culture"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60"
            />
            {editingId && (
              <span className="text-[10px] text-slate-400">Slugs are immutable once created.</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Accent Color
            </label>
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="e.g. #4f46e5 or indigo"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            maxLength={400}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Category editorial scope..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span>Sort Order:</span>
              <input
                type="number"
                min={0}
                max={9999}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span>Active</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update Category" : "Create Category"}
          </button>
        </div>
      </form>

      {/* Categories List Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-3 py-3">Slug</th>
              <th className="px-3 py-3">Articles</th>
              <th className="px-3 py-3">Sort</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {c.name}
                  </div>
                  <div className="line-clamp-1 text-slate-500 text-[11px] max-w-sm">
                    {c.description}
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-slate-500 text-[11px]">
                  /{c.slug}
                </td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-900 dark:text-slate-200">
                    {c._count.articles}
                  </span>{" "}
                  articles
                </td>
                <td className="px-3 py-3 text-slate-500">{c.sortOrder}</td>
                <td className="px-3 py-3">
                  {c.isActive ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Active
                    </span>
                  ) : (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(c)}
                      className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    {userRole === "ADMIN" && (
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={saving || c._count.articles > 0}
                        title={
                          c._count.articles > 0
                            ? "Cannot delete category while articles are assigned to it."
                            : "Delete category"
                        }
                        className="rounded bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-30 dark:bg-rose-950/40 dark:text-rose-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
