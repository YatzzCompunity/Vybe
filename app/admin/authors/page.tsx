import React from "react";
import { listAuthors } from "@/lib/admin/service";
import { requireAdminSession } from "@/lib/admin/guard";
import { AuthorManager } from "@/components/admin/AuthorManager";

export const dynamic = "force-dynamic";

export default async function AdminAuthorsPage() {
  const user = await requireAdminSession("EDITOR");
  const authors = await listAuthors();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Authors Management</h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Manage editorial bylines, staff writers, and contributing authors.
        </p>
      </div>

      <AuthorManager initialAuthors={authors} userRole={user.role} />
    </div>
  );
}
