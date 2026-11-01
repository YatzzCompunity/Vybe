"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface AuthorItem {
  id: string;
  slug: string;
  penName: string;
  roleTitle: string;
  bio: string;
  avatarUrl: string | null;
  isStaff: boolean;
  userId: string | null;
  _count: {
    articles: number;
  };
}

export function AuthorManager({
  initialAuthors,
  userRole,
}: {
  initialAuthors: AuthorItem[];
  userRole: string;
}) {
  const router = useRouter();
  const [authors, setAuthors] = useState(initialAuthors);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [penName, setPenName] = useState("");
  const [slug, setSlug] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isStaff, setIsStaff] = useState(true);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const startEdit = (a: AuthorItem) => {
    setEditingId(a.id);
    setPenName(a.penName);
    setSlug(a.slug);
    setRoleTitle(a.roleTitle);
    setBio(a.bio);
    setAvatarUrl(a.avatarUrl ?? "");
    setIsStaff(a.isStaff);
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPenName("");
    setSlug("");
    setRoleTitle("");
    setBio("");
    setAvatarUrl("");
    setIsStaff(true);
    setMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const payload: Record<string, unknown> = {
      penName,
      slug: slug || undefined,
      roleTitle,
      bio,
      avatarUrl: avatarUrl || undefined,
      isStaff,
    };

    try {
      const url = editingId ? `/api/v1/admin/authors/${editingId}` : "/api/v1/admin/authors";
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
          text: editingId ? "Author updated." : "Author profile created.",
        });
        cancelEdit();
        const refreshRes = await fetch("/api/v1/admin/authors");
        if (refreshRes.ok) {
          const fresh = await refreshRes.json();
          setAuthors(fresh.data);
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

  const handleDelete = async (a: AuthorItem) => {
    if (!confirm(`Delete author "${a.penName}"? Authors with assigned articles cannot be deleted.`)) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/authors/${a.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ kind: "ok", text: "Author deleted." });
        setAuthors((prev) => prev.filter((item) => item.id !== a.id));
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error?.message ?? "Failed to delete author." });
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

      {/* Author Form */}
      <form
        onSubmit={handleSave}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
          <h2 className="font-serif text-base font-bold">
            {editingId ? "Edit Author Profile" : "Add New Author"}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pen Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={penName}
              onChange={(e) => setPenName(e.target.value)}
              placeholder="e.g. Maya Chen"
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
              placeholder="auto-derived if blank"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Role Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Senior Music Critic"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Avatar URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.example.com/author.jpg"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={isStaff}
                onChange={(e) => setIsStaff(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span>Staff Author (internal team member)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Bio <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            maxLength={1000}
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Author background and credentials..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update Author" : "Create Author"}
          </button>
        </div>
      </form>

      {/* Authors List */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Pen Name &amp; Title</th>
              <th className="px-3 py-3">Slug</th>
              <th className="px-3 py-3">Articles</th>
              <th className="px-3 py-3">Staff</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {authors.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {a.penName}
                  </div>
                  <div className="text-[11px] text-slate-500">{a.roleTitle}</div>
                </td>
                <td className="px-3 py-3 font-mono text-slate-500 text-[11px]">
                  /{a.slug}
                </td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-900 dark:text-slate-200">
                    {a._count.articles}
                  </span>{" "}
                  articles
                </td>
                <td className="px-3 py-3">
                  {a.isStaff ? (
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                      Staff
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Contributor
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(a)}
                      className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    {userRole === "ADMIN" && (
                      <button
                        onClick={() => handleDelete(a)}
                        disabled={saving || a._count.articles > 0}
                        title={
                          a._count.articles > 0
                            ? "Cannot delete author while articles are assigned to them."
                            : "Delete author"
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
