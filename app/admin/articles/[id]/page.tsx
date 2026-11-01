import React from "react";
import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getArticle, listCategories, listAuthors } from "@/lib/admin/service";
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

interface Props {
  params: { id: string };
}

export default async function EditArticlePage({ params }: Props) {
  const user = await requireAdminSession("EDITOR");

  let article;
  try {
    article = await getArticle(params.id);
  } catch {
    notFound();
  }

  const [categories, authors] = await Promise.all([
    listCategories(),
    listAuthors(),
  ]);

  return (
    <ArticleEditorClient
      mode="edit"
      initialArticle={{
        ...article,
        publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
      }}
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      authors={authors.map((a) => ({ id: a.id, penName: a.penName, roleTitle: a.roleTitle }))}
      userRole={user.role}
    />
  );
}
