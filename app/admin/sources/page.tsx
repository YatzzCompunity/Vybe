import React from "react";
import { requireAdminSession } from "@/lib/admin/guard";
import { listSources } from "@/lib/ai/source-service";
import { SourceManager } from "@/components/admin/SourceManager";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const user = await requireAdminSession("EDITOR");
  const sources = await listSources();

  const formattedSources = sources.map((s) => ({
    ...s,
    lastFetchedAt: s.lastFetchedAt ? s.lastFetchedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Source Allowlist
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Define authorized reputable domains for lead ingestion (official artist sites, labels, wire agencies, music journalism). Full-text scraping is prohibited.
          </p>
        </div>
      </div>

      <SourceManager initialSources={formattedSources} userRole={user.role} />
    </div>
  );
}
