/**
 * ============================================================================
 * VYBE Media Platform — Source Allowlist Service
 * ============================================================================
 *
 * Manages verified news sources (official artist sites, labels, Billboard,
 * Variety, Pitchfork, AP, Reuters, etc.).
 *
 * All lead ingestion is strictly gated against the allowlist: leads with URLs
 * from non-allowlisted domains are rejected, ensuring only reputable leads enter
 * the editorial funnel.
 * ============================================================================
 */

import prisma from "@/lib/db";
import { SourceType, type Source } from "@prisma/client";
import * as I from "@/lib/admin/input";
import type { Raw } from "@/lib/admin/input";

export function extractDomain(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function isDomainAllowlisted(urlOrDomain: string): Promise<{
  allowlisted: boolean;
  source: Source | null;
}> {
  const domain = extractDomain(urlOrDomain) || urlOrDomain.toLowerCase().trim();
  if (!domain) return { allowlisted: false, source: null };

  const sources = await prisma.source.findMany({
    where: { isEnabled: true },
  });

  for (const s of sources) {
    const sDomain = s.domain.toLowerCase().trim();
    if (domain === sDomain || domain.endsWith(`.${sDomain}`)) {
      return { allowlisted: true, source: s };
    }
  }

  return { allowlisted: false, source: null };
}

export async function listSources(opts: { isEnabled?: boolean; search?: string } = {}) {
  const where: { isEnabled?: boolean; OR?: Array<{ name: { contains: string } } | { domain: { contains: string } }> } = {};
  if (opts.isEnabled !== undefined) where.isEnabled = opts.isEnabled;
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search } },
      { domain: { contains: opts.search.toLowerCase() } },
    ];
  }

  const items = await prisma.source.findMany({
    where,
    orderBy: [{ trustTier: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          articles: true,
          leads: true,
        },
      },
    },
  });

  return items;
}

export async function getSource(id: string) {
  const s = await prisma.source.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          articles: true,
          leads: true,
        },
      },
    },
  });
  if (!s) throw I.notFound("Source");
  return s;
}

export function parseSourceInput(raw: Raw, partial = false) {
  const name = I.reqStr(raw, "name", { max: 100 }, partial);
  let domain = I.str(raw, "domain", { max: 120 });
  if (domain) {
    domain = extractDomain(domain) || domain.toLowerCase();
  } else if (!partial) {
    throw I.bad("'domain' is required.");
  }

  return {
    name,
    domain,
    feedUrl: I.urlField(raw, "feedUrl"),
    sourceType: I.oneOf(raw, "sourceType", Object.values(SourceType) as [SourceType, ...SourceType[]]),
    trustTier: I.int(raw, "trustTier", 1, 5),
    isEnabled: I.bool(raw, "isEnabled"),
  };
}

export async function createSource(raw: Raw) {
  const d = parseSourceInput(raw, false);
  try {
    return await prisma.source.create({
      data: {
        name: d.name!,
        domain: d.domain!,
        feedUrl: d.feedUrl ?? null,
        sourceType: d.sourceType ?? "MANUAL",
        trustTier: d.trustTier ?? 1,
        isEnabled: d.isEnabled ?? true,
      },
    });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("A source with this feed URL already exists.");
    throw e;
  }
}

export async function updateSource(id: string, raw: Raw) {
  await getSource(id);
  const d = parseSourceInput(raw, true);

  const data: {
    name?: string;
    domain?: string;
    feedUrl?: string | null;
    sourceType?: SourceType;
    trustTier?: number;
    isEnabled?: boolean;
    lastFetchedAt?: Date;
  } = {};

  if (d.name) data.name = d.name;
  if (d.domain) data.domain = d.domain;
  if (d.feedUrl !== undefined) data.feedUrl = d.feedUrl;
  if (d.sourceType !== undefined) data.sourceType = d.sourceType;
  if (d.trustTier) data.trustTier = d.trustTier;
  if (d.isEnabled !== undefined) data.isEnabled = d.isEnabled;

  try {
    return await prisma.source.update({
      where: { id },
      data,
    });
  } catch (e) {
    if (I.isUniqueViolation(e)) throw I.conflict("A source with this feed URL already exists.");
    throw e;
  }
}

export async function deleteSource(id: string) {
  const s = await prisma.source.findUnique({
    where: { id },
    include: { _count: { select: { articles: true, leads: true } } },
  });
  if (!s) throw I.notFound("Source");

  if (s._count.articles > 0) {
    throw I.conflict("Cannot delete a source referenced by existing articles. Disable it instead.");
  }

  await prisma.source.delete({ where: { id } });
  return { deleted: true };
}
