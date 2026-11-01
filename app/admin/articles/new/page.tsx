import React from "react";
import nextDynamic from "next/dynamic";
import { listCategories, listAuthors } from "@/lib/admin/service";
import { requireAdminSession } from "@/lib/admin/guard";

const ArticleEditorClient = nextDynamic(
  () =>
    import("@/components/admin/ArticleEditorClient").then(
      (mod) => mod.ArticleEditorClient
    ),
  {
    loading: () => (
      <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">Loading article editor…</p>
      </div>
    ),
  }
);

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const user = await requireAdminSession("EDITOR");
  const [categories, authors] = await Promise.all([
    listCategories(),
    listAuthors(),
  ]);

  return (
    <ArticleEditorClient
      mode="create"
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      authors={authors.map((a) => ({ id: a.id, penName: a.penName, roleTitle: a.roleTitle }))}
      userRole={user.role}
    />
  );
}
