import React from "react";
import Link from "next/link";
import { CATEGORIES, SITE_DESCRIPTION, SITE_NAME } from "@/lib/config";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="font-serif text-2xl font-black tracking-tight text-slate-900 dark:text-white"
            >
              {SITE_NAME}
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {SITE_DESCRIPTION}
            </p>
            <p className="mt-4 inline-block rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
              Phase 1 Scaffold • Sample Placeholder Data Only
            </p>
          </div>

          {/* Categories Column 1 */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Editorial Sections
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {CATEGORIES.slice(0, 5).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${cat.slug}`}
                    className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories Column 2 */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Culture &amp; Criticism
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {CATEGORIES.slice(5).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${cat.slug}`}
                    className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/search"
                  className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Search Archive
                </Link>
              </li>
            </ul>
          </div>

          {/* Editorial Integrity & Roadmap Disclosure */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Editorial &amp; Architecture Notes
            </h2>
            <p className="mt-3 text-xs leading-relaxed">
              All Phase 1 stories are original sample placeholders written for
              layout testing. No external articles are copied, and no quotes or
              chart facts are fabricated.
            </p>
            <p className="mt-2 text-xs leading-relaxed">
              {/* TODO (Phase 2-4): Connect Prisma database, Auth.js RBAC, and human-approved AI draft workflow */}
              <strong>Roadmap (TODO):</strong> Database persistence, reader
              accounts, moderated comments, and the human-gated AI draft review
              pipeline (Draft → Admin Approval → Publish) arrive in Phases 2–4.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs sm:flex-row dark:border-slate-800">
          <p>
            &copy; {currentYear} {SITE_NAME}. Configured via{" "}
            <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-800">
              NEXT_PUBLIC_SITE_NAME
            </code>
            .
          </p>
          <p className="text-slate-500 dark:text-slate-500">
            Semantic HTML5 • Next.js App Router • Strict TypeScript
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
