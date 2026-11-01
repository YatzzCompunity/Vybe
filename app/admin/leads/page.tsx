import React from "react";
import nextDynamic from "next/dynamic";
import prisma from "@/lib/db";
import { requireAdminSession } from "@/lib/admin/guard";
import { listLeads } from "@/lib/ai/lead-service";
import { listSources } from "@/lib/ai/source-service";

const LeadManager = nextDynamic(
  () => import("@/components/admin/LeadManager").then((mod) => mod.LeadManager),
  {
    loading: () => (
      <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">Loading lead pipeline…</p>
      </div>
    ),
  }
);

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    status?: string;
    sourceId?: string;
    search?: string;
    page?: string;
  };
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const user = await requireAdminSession("EDITOR");
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const limit = 50;
  const skip = (page - 1) * limit;

  const [leadsResult, sources, categories, authors] = await Promise.all([
    listLeads({
      status: searchParams.status,
      sourceId: searchParams.sourceId,
      search: searchParams.search,
      page,
      limit,
      skip,
    }),
    listSources({ isEnabled: true }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.author.findMany({
      where: { isStaff: true },
      select: { id: true, penName: true },
      orderBy: { penName: "asc" },
    }),
  ]);

  const formattedLeads = leadsResult.items.map((l) => ({
    ...l,
    publishedAt: l.publishedAt ? l.publishedAt.toISOString() : null,
    createdAt: l.createdAt.toISOString(),
  }));

  const formattedSources = sources.map((s) => ({
    id: s.id,
    name: s.name,
    domain: s.domain,
    isEnabled: s.isEnabled,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Editorial Leads & AI Pipeline
        </h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Curated leads from allowlisted news sources and verified press releases. Approve leads and generate structured, human-gated AI drafts for editorial review.
        </p>
      </div>

      <LeadManager
        initialLeads={formattedLeads}
        sources={formattedSources}
        categories={categories}
        authors={authors}
        userRole={user.role}
        currentStatus={searchParams.status}
      />
    </div>
  );
}
