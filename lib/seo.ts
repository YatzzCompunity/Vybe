/**
 * ============================================================================
 * VYBE Media Platform — SEO & Structured Data Helpers (`lib/seo.ts`)
 * ============================================================================
 * Centralized utilities for base URL resolution, XML escaping, and Schema.org
 * JSON-LD structured data generators.
 *
 * Base URL Resolution Order:
 * 1. NEXT_PUBLIC_SITE_URL (canonical production or preview site URL)
 * 2. NEXTAUTH_URL (Auth.js / NextAuth callback host URL)
 * 3. AUTH_URL (Auth.js v5 alternate)
 * 4. Fallback: "http://localhost:3000" (local development placeholder)
 *
 * NOTE: For production search indexing, NEXT_PUBLIC_SITE_URL MUST be configured
 * with the real decided domain (e.g., https://vybe.example.com) in production env.
 * ============================================================================
 */

import { SITE_DESCRIPTION, SITE_NAME } from "./config";

/**
 * Returns the configured base URL without any trailing slashes.
 */
export function getBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/**
 * Resolves an absolute URL given an optional path.
 */
export function absoluteUrl(path: string = "/"): string {
  const base = getBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/**
 * Escapes characters for XML contexts (&, <, >, ", ').
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Schema.org BreadcrumbList item.
 */
export interface BreadcrumbItem {
  name: string;
  item: string;
}

/**
 * Builds a Schema.org BreadcrumbList object.
 */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item.startsWith("http")
        ? crumb.item
        : `${baseUrl}${crumb.item.startsWith("/") ? crumb.item : `/${crumb.item}`}`,
    })),
  };
}

/**
 * Builds a Schema.org Organization object for the publisher.
 */
export function buildOrganizationJsonLd() {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: SITE_NAME,
    url: baseUrl,
    description: SITE_DESCRIPTION,
  };
}

/**
 * Builds a Schema.org WebSite object with SearchAction.
 */
export function buildWebSiteJsonLd() {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: baseUrl,
    publisher: {
      "@id": `${baseUrl}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Builds a Schema.org Person object for an author.
 */
export function buildPersonJsonLd(author: {
  penName: string;
  roleTitle?: string;
  bio?: string | null;
  slug: string;
}) {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.penName,
    ...(author.roleTitle ? { jobTitle: author.roleTitle } : {}),
    ...(author.bio ? { description: author.bio } : {}),
    url: `${baseUrl}/author/${author.slug}`,
  };
}
