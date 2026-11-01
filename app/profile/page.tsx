import { publicArticleWhere } from "@/lib/publication";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArticleStatus } from "@prisma/client";
import prisma from "@/lib/db";
import { getSessionUser } from "@/lib/api/auth-guard";
import { ProfileForms } from "@/components/auth/ProfileForms";

export const metadata: Metadata = { title: "Your profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/profile");

  const [bookmarks, comments] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId: user.id, article: { ...publicArticleWhere() } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, article: { select: { slug: true, title: true, category: { select: { slug: true } } } } },
    }),
    prisma.comment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, body: true, status: true, article: { select: { slug: true, title: true, category: { select: { slug: true } } } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="break-words font-serif text-3xl font-bold">{user.displayName}</h1>
          <p className="break-all text-sm text-slate-600 dark:text-slate-400">{user.email} · {user.role}</p>
        </div>
        {(user.role === "ADMIN" || user.role === "EDITOR") && (
          <Link
            href="/admin"
            className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Admin Dashboard →
          </Link>
        )}
      </header>
      <ProfileForms displayName={user.displayName} avatarUrl={user.avatarUrl ?? ""} hasPassword={Boolean(user.passwordHash)} />
      <section>
        <h2 className="text-lg font-bold">Saved articles ({bookmarks.length})</h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {bookmarks.map((b) => (
            <li key={b.id}><Link className="text-indigo-600 hover:underline" href={`/${b.article.category.slug}/${b.article.slug}`}>{b.article.title}</Link></li>
          ))}
          {bookmarks.length === 0 && <li className="list-none text-slate-600 dark:text-slate-400">Nothing saved yet. Use the bookmark button on any article to save it here.</li>}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-bold">Your comments ({comments.length})</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {comments.map((c) => (
            <li key={c.id} className="rounded border border-slate-200 p-2 dark:border-slate-800">
              <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold dark:bg-slate-800">{c.status}</span>
              on <Link className="text-indigo-600 hover:underline" href={`/${c.article.category.slug}/${c.article.slug}`}>{c.article.title}</Link>
              <p className="mt-1 whitespace-pre-wrap break-words">{c.body}</p>
            </li>
          ))}
          {comments.length === 0 && <li className="text-slate-600 dark:text-slate-400">No comments yet. Comments you post appear here, including those awaiting moderation.</li>}
        </ul>
      </section>
    </div>
  );
}
