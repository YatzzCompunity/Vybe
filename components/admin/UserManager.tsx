"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface UserItem {
  id: string;
  email: string;
  displayName: string;
  role: "READER" | "AUTHOR" | "EDITOR" | "ADMIN";
  isActive: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  _count: {
    bookmarks: number;
    comments: number;
  };
}

export function UserManager({
  initialUsers,
  total,
  currentSearch = "",
}: {
  initialUsers: UserItem[];
  total: number;
  currentSearch?: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState(currentSearch);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/admin/users?search=${encodeURIComponent(search)}`);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setBusyId(userId);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          kind: "ok",
          text: `User role updated to ${newRole}.`,
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole as UserItem["role"] } : u))
        );
        router.refresh();
      } else {
        setMsg({
          kind: "err",
          text: data.error?.message ?? "Failed to update user role.",
        });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error occurred." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Search and summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-700"
          >
            Search
          </button>
        </form>

        <div className="text-xs text-slate-500">
          Total registered users: <span className="font-bold text-slate-700 dark:text-slate-300">{total}</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Activity</th>
              <th className="px-3 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Change Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {u.displayName}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                          : u.role === "EDITOR"
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : u.role === "AUTHOR"
                          ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {u.isActive ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium">Deactivated</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {u._count.bookmarks} saved · {u._count.comments} comments
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="READER">READER</option>
                      <option value="AUTHOR">AUTHOR</option>
                      <option value="EDITOR">EDITOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
