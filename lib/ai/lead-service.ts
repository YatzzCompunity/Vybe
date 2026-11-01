/**
 * ============================================================================
 * VYBE Media Platform — Editorial Lead Ingestion Service
 * ============================================================================
 *
 * Ingestion rules:
 * 1. Must NOT copy full copyrighted or paywalled articles.
 * 2. Records a lead (title, URL, source, published date, short summary written
 *    by the system or editor) for editorial review.
 * 3. URL domain must be on the enabled Source allowlist.
 * 4. Leads enter state "NEW", can be reviewed/approved by editor, and converted
 *    to an AI-assisted Draft.
 * ============================================================================
 */

import prisma from "@/lib/db";
import { LeadStatus, type Prisma } from "@prisma/client";
import * as I from "@/lib/admin/input";
import type { Raw } from "@/lib/admin/input";
import { isDomainAllowlisted } from "./source-service";

export async function listLeads(opts: {
  status?: string;
  sourceId?: string;
  search?: string;
  page: number;
  limit: number;
  skip: number;
}) {
  const where: Prisma.LeadWhereInput = {};

  if (opts.status) {
    where.status = I.oneOf({ s: opts.status }, "s", Object.values(LeadStatus));
  }
  if (opts.sourceId) {
    where.sourceId = opts.sourceId;
  }
  if (opts.search) {
    where.OR = [
      { title: { contains: opts.search } },
      { summary: { contains: opts.search } },
      { url: { contains: opts.search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: opts.skip,
      take: opts.limit,
      include: {
        source: {
          select: {
            id: true,
            name: true,
            domain: true,
            trustTier: true,
          },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { items, total };
}

export async function getLead(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      source: {
        select: {
          id: true,
          name: true,
          domain: true,
          trustTier: true,
        },
      },
    },
  });
  if (!lead) throw I.notFound("Lead");
  return lead;
}

export function parseLeadInput(raw: Raw, partial = false) {
  const title = I.reqStr(raw, "title", { max: 250 }, partial);
  const url = I.urlField(raw, "url");
  if (!partial && !url) throw I.bad("'url' is required.");

  const summary = I.reqStr(raw, "summary", { max: 1500, multiline: true }, partial);
  const sourceId = I.str(raw, "sourceId", { max: 100 });
  const verifiedFacts = I.str(raw, "verifiedFacts", { max: 3000, multiline: true });
  const publishedAt = I.date(raw, "publishedAt");
  const confidenceScore = I.num(raw, "confidenceScore", 0.0, 1.0);
  const status = I.oneOf(raw, "status", Object.values(LeadStatus) as [LeadStatus, ...LeadStatus[]]);

  return {
    title,
    url,
    summary,
    sourceId,
    verifiedFacts,
    publishedAt,
    confidenceScore,
    status,
  };
}

export async function createLead(raw: Raw) {
  const d = parseLeadInput(raw, false);

  // Validate URL is on the allowlist
  const allowlistCheck = await isDomainAllowlisted(d.url!);
  let resolvedSourceId = d.sourceId;

  if (allowlistCheck.allowlisted && allowlistCheck.source) {
    if (!resolvedSourceId) {
      resolvedSourceId = allowlistCheck.source.id;
    }
  } else if (!resolvedSourceId) {
    throw I.bad(
      `The domain for URL "${d.url}" is not on the active Source allowlist. Add and enable the source before creating a lead.`
    );
  }

  // Verify sourceId exists and is enabled
  const source = await prisma.source.findUnique({
    where: { id: resolvedSourceId },
  });
  if (!source) throw I.bad("Specified source does not exist.");
  if (!source.isEnabled) throw I.bad(`Source "${source.name}" is currently disabled in the allowlist.`);

  try {
    return await prisma.lead.create({
      data: {
        title: d.title!,
        url: d.url!,
        summary: d.summary!,
        sourceId: resolvedSourceId!,
        publishedAt: d.publishedAt ?? null,
        verifiedFacts: d.verifiedFacts ?? null,
        confidenceScore: d.confidenceScore ?? (source.trustTier === 1 ? 0.95 : 0.8),
        status: d.status ?? "NEW",
      },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            domain: true,
            trustTier: true,
          },
        },
      },
    });
  } catch (e) {
    if (I.isUniqueViolation(e)) {
      throw I.conflict("A lead with this URL already exists in the system.");
    }
    throw e;
  }
}

export async function updateLead(id: string, raw: Raw) {
  await getLead(id);
  const d = parseLeadInput(raw, true);

  const data: Prisma.LeadUncheckedUpdateInput = {};
  if (d.title) data.title = d.title;
  if (d.url) {
    const allowlistCheck = await isDomainAllowlisted(d.url);
    if (!allowlistCheck.allowlisted) {
      throw I.bad(`Domain for URL "${d.url}" is not on the active Source allowlist.`);
    }
    data.url = d.url;
  }
  if (d.summary) data.summary = d.summary;
  if (d.sourceId) data.sourceId = d.sourceId;
  if (d.verifiedFacts !== undefined) data.verifiedFacts = d.verifiedFacts;
  if (d.publishedAt !== undefined) data.publishedAt = d.publishedAt;
  if (d.confidenceScore !== undefined) data.confidenceScore = d.confidenceScore;
  if (d.status !== undefined) data.status = d.status;

  try {
    return await prisma.lead.update({
      where: { id },
      data,
      include: {
        source: {
          select: {
            id: true,
            name: true,
            domain: true,
            trustTier: true,
          },
        },
      },
    });
  } catch (e) {
    if (I.isUniqueViolation(e)) {
      throw I.conflict("A lead with this URL already exists in the system.");
    }
    throw e;
  }
}

export async function deleteLead(id: string) {
  await getLead(id);
  await prisma.lead.delete({ where: { id } });
  return { deleted: true };
}
