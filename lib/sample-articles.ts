/**
 * ============================================================================
 * BUILD-TIME FALLBACK FIXTURES — SAMPLE / PLACEHOLDER CONTENT ONLY
 * ============================================================================
 * IMPORTANT NOTICE (PHASE 2):
 * Public read pages (`/`, `/[category]`, `/category/[slug]`, `/[category]/[slug]`,
 * and `/search`) now read directly from the Prisma database via `lib/articles.ts`.
 *
 * This module (`lib/sample-articles.ts`) is retained strictly as a build-time
 * fallback when the local SQLite database file (`prisma/dev.db`) has not yet
 * been created or seeded, ensuring unseeded builds never fail.
 *
 * - These entries are NOT real news reports (marked `isSamplePlaceholder: true`).
 * - No text is copied from any external music or entertainment publication.
 * - No real-world quotes, chart rankings, or release dates are fabricated.
 * ============================================================================
 */

import { CATEGORIES, CATEGORY_MAP } from "./config";
import type { CategoryInfo, CategorySlug, SampleArticle, SampleAuthor } from "./types";

const SAMPLE_AUTHORS: Record<string, SampleAuthor> = {
  editorialDesk: {
    id: "sample-author-1",
    slug: "editorial-architecture-desk",
    penName: "Editorial Architecture Desk (Sample)",
    roleTitle: "Layout & Features Placeholder",
    bio: "Placeholder editorial profile used to verify byline rendering, author cards, and structured metadata during Phase 1.",
  },
  studioCraftDesk: {
    id: "sample-author-2",
    slug: "studio-craft-desk",
    penName: "Studio & Production Desk (Sample)",
    roleTitle: "Audio Craft Placeholder",
    bio: "Sample contributor profile demonstrating multi-author attribution in category feeds and article headers.",
  },
  cultureFormatDesk: {
    id: "sample-author-3",
    slug: "culture-format-desk",
    penName: "Culture & Formats Desk (Sample)",
    roleTitle: "Media Systems Placeholder",
    bio: "Sample contributor profile for testing cross-category tagging and search filtering.",
  },
};

/**
 * 9 original sample/placeholder articles (one per primary navigation category)
 * for Phase 1 UI and routing verification.
 */
export const SAMPLE_ARTICLES: readonly SampleArticle[] = [
  // 1. ALBUMS (Hero Featured Sample)
  {
    id: "sample-art-01",
    slug: "sample-how-modern-album-rollouts-are-structured",
    title: "Sample Feature: How a Modern Album Rollout Is Structured From Studio to Stage",
    subtitle:
      "Placeholder long-form explainer examining how teaser singles, artwork direction, and physical pressing timelines fit together.",
    excerpt:
      "SAMPLE PLACEHOLDER: An overview of the standard phases involved in planning a full-length studio record release, used here to test hero typography and featured card layouts.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This article is a layout test fixture demonstrating how lead feature stories appear across the homepage hero module and the article detail template. It describes general music-industry workflow concepts rather than reporting on any specific real-world release.",
      "In a typical full-length album campaign, teams coordinate mastering deadlines alongside visual identity systems months before an announcement. Physical manufacturing schedules—especially for vinyl records and booklet packaging—often dictate when final audio masters must be locked.",
      "Once the core sonic and visual direction is established, the rollout sequence typically introduces listeners to the project through one or two lead singles, accompanied by liner-note essays, studio process documentation, and rehearsal preparation for live performances."
    ],
    categorySlug: "albums",
    author: SAMPLE_AUTHORS.editorialDesk,
    tags: ["sample-content", "album-rollout", "vinyl-packaging", "editorial-layout"],
    readingTimeMinutes: 4,
    publishedAtIso: "2026-10-25T09:00:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: true,
    isTrending: true,
    trendingRank: 1,
    coverGradient: "from-emerald-700 via-teal-700 to-slate-900",
    coverLabel: "SAMPLE ALBUMS FEATURE • ARTWORK PLACEHOLDER",
    isSamplePlaceholder: true,
  },

  // 2. MUSIC (Secondary Featured Sample)
  {
    id: "sample-art-02",
    slug: "sample-inside-live-touring-production-logistics",
    title: "Sample Guide: Inside the Logistics of International Live Touring Production",
    subtitle:
      "Placeholder overview of soundcheck workflows, stage plot routing, and acoustic calibration across different venue sizes.",
    excerpt:
      "SAMPLE PLACEHOLDER: How touring audio engineers and production managers adapt a live show from intimate clubs to outdoor amphitheaters.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This entry serves as a placeholder story for the Music category feed and secondary featured slot. All descriptions are educational overviews of general live sound production practices.",
      "Touring production relies on repeatable technical documentation—specifically input lists, stage plots, and monitor mix presets—so that local venue crews and traveling engineers can assemble complex audio systems within tight load-in windows.",
      "Acoustic calibration tools allow front-of-house engineers to adapt speaker arrays to varying room geometries, ensuring consistent vocal intelligibility and low-end balance regardless of ceiling height or seating materials."
    ],
    categorySlug: "music",
    author: SAMPLE_AUTHORS.studioCraftDesk,
    tags: ["sample-content", "live-production", "sound-engineering", "touring"],
    readingTimeMinutes: 3,
    publishedAtIso: "2026-10-24T14:30:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: true,
    isTrending: true,
    trendingRank: 2,
    coverGradient: "from-indigo-700 via-violet-700 to-slate-900",
    coverLabel: "SAMPLE MUSIC GUIDE • STAGE AUDIO PLACEHOLDER",
    isSamplePlaceholder: true,
  },

  // 3. CELEBRITY (Secondary Featured Sample)
  {
    id: "sample-art-03",
    slug: "sample-how-red-carpet-archival-wardrobe-styling-works",
    title: "Sample Explainer: How Archival Wardrobe Styling Works for Major Award Ceremonies",
    subtitle:
      "Placeholder look at how stylists, ateliers, and garment conservators coordinate custom and archival looks for public appearances.",
    excerpt:
      "SAMPLE PLACEHOLDER: Testing the Celebrity category layout with an overview of garment sourcing, tailoring timelines, and photographic lighting.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This placeholder article tests the Celebrity category route and card typography. It outlines the general craft of formal styling without referencing real-world individuals or events.",
      "Preparing a formal appearance look typically begins weeks in advance with mood boards that align garment silhouette, fabric texture, and camera flash behavior. When archival pieces are selected, conservation specialists establish strict handling and fitting protocols.",
      "Final fittings account for movement, posture during press line photography, and coordination with hair, makeup, and jewelry design teams so the visual presentation reads cohesively in both wide-angle and close-up framing."
    ],
    categorySlug: "celebrity",
    author: SAMPLE_AUTHORS.cultureFormatDesk,
    tags: ["sample-content", "styling", "fashion-archives", "red-carpet"],
    readingTimeMinutes: 3,
    publishedAtIso: "2026-10-23T11:15:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: true,
    isTrending: true,
    trendingRank: 3,
    coverGradient: "from-rose-700 via-pink-700 to-slate-900",
    coverLabel: "SAMPLE CELEBRITY EXPLAINER • STYLING PLACEHOLDER",
    isSamplePlaceholder: true,
  },

  // 4. ARTISTS
  {
    id: "sample-art-04",
    slug: "sample-building-a-sustainable-independent-studio-practice",
    title: "Sample Profile Format: Building a Sustainable Independent Studio Practice",
    subtitle:
      "Placeholder template demonstrating how artist craft profiles, rehearsal habits, and demo archiving are presented.",
    excerpt:
      "SAMPLE PLACEHOLDER: A structural preview of the Artists section, focusing on songwriting notebooks, stem organization, and collaborative sessions.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: Created for Phase 1 layout verification, this article demonstrates the Artists category template and tag navigation links.",
      "Many working songwriters and multi-instrumentalists treat their home or project studios as modular laboratories. Keeping instruments wired and ready to record minimizes technical friction when a melodic or rhythmic idea emerges.",
      "Equally important is disciplined stem archiving—labeling tempo, key center, microphone chain, and session notes—so rough voice memos and multitrack sketches can be revisited months later without losing context."
    ],
    categorySlug: "artists",
    author: SAMPLE_AUTHORS.studioCraftDesk,
    tags: ["sample-content", "songwriting", "home-studio", "stem-archiving"],
    readingTimeMinutes: 4,
    publishedAtIso: "2026-10-22T16:00:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: true,
    trendingRank: 4,
    coverGradient: "from-amber-600 via-orange-700 to-slate-900",
    coverLabel: "SAMPLE ARTISTS PROFILE • STUDIO PLACEHOLDER",
    isSamplePlaceholder: true,
  },

  // 5. SINGLES
  {
    id: "sample-art-05",
    slug: "sample-anatomy-of-a-three-minute-pop-arrangement",
    title: "Sample Breakdown: The Anatomy of a Three-Minute Single Arrangement",
    subtitle:
      "Placeholder musicology piece illustrating how intro hooks, pre-chorus lift, and dynamic contrast keep arrangements engaging.",
    excerpt:
      "SAMPLE PLACEHOLDER: Testing the Singles category view with a generic structural breakdown of verse, chorus, and bridge dynamics.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This placeholder article populates the Singles category for Phase 1 testing. It discusses general music theory and arrangement concepts.",
      "Compact single arrangements often rely on contrast in register and rhythmic density between sections. By keeping verse instrumentation sparse, producers leave spectral headroom for the chorus to expand in stereo width and harmonic richness.",
      "Subtle arrangement transitions—such as muting the bass for a single bar before the downbeat or introducing a counter-melody in the second verse—maintain momentum without overcrowding the vocal."
    ],
    categorySlug: "singles",
    author: SAMPLE_AUTHORS.studioCraftDesk,
    tags: ["sample-content", "arrangement", "music-theory", "song-structure"],
    readingTimeMinutes: 3,
    publishedAtIso: "2026-10-21T10:45:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: false,
    coverGradient: "from-sky-600 via-blue-700 to-slate-900",
    coverLabel: "SAMPLE SINGLES BREAKDOWN • WAVEFORM PLACEHOLDER",
    isSamplePlaceholder: true,
  },

  // 6. POP CULTURE
  {
    id: "sample-art-06",
    slug: "sample-how-film-and-series-music-supervision-works",
    title: "Sample Essay: How Music Supervision Connects Visual Storytelling and Catalogue Songs",
    subtitle:
      "Placeholder overview of cue sheets, synchronization licensing workflows, and thematic motifs in cinema and television.",
    excerpt:
      "SAMPLE PLACEHOLDER: Exploring the intersection of visual media and recorded music to test the Pop Culture section layout.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This article is a placeholder fixture for the Pop Culture category. It explains the general role of music supervisors in film and television production.",
      "Music supervision bridges creative direction and legal clearance. Supervisors collaborate with directors and editors to test temporary cues against rough picture cuts, evaluating how tempo and lyric perspective shape the emotional subtext of a scene.",
      "Simultaneously, clearance specialists confirm publishing and master ownership splits so that synchronization licenses match the project's distribution territories and archival formats."
    ],
    categorySlug: "pop-culture",
    author: SAMPLE_AUTHORS.cultureFormatDesk,
    tags: ["sample-content", "music-supervision", "soundtracks", "sync-licensing"],
    readingTimeMinutes: 4,
    publishedAtIso: "2026-10-20T13:20:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: true,
    trendingRank: 5,
    coverGradient: "from-fuchsia-700 via-purple-700 to-slate-900",
    coverLabel: "SAMPLE POP CULTURE • SOUNDTRACK PLACEHOLDER",
    isSamplePlaceholder: true,
  },

  // 7. TRENDING
  {
    id: "sample-art-07",
    slug: "sample-understanding-spatial-audio-and-binaural-mixing-formats",
    title: "Sample Explainer: Understanding Spatial Audio and Binaural Headphone Delivery",
    subtitle:
      "Placeholder technical primer on object-based audio mixes versus traditional two-channel stereo masters.",
    excerpt:
      "SAMPLE PLACEHOLDER: Testing the Trending section with a primer on immersive mixing workflows and headphone translation checks.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This placeholder article populates the Trending category route during Phase 1 scaffold verification.",
      "Object-based audio formats allow mixing engineers to position individual stems in a three-dimensional coordinate field rather than a strictly left-right stereo panorama. When rendered for headphones, binaural processing applies head-related transfer functions to simulate depth and elevation.",
      "Because listeners use a wide range of playback hardware, engineers routinely check immersive masters alongside dedicated stereo fold-downs to preserve punch, vocal presence, and tonal consistency."
    ],
    categorySlug: "trending",
    author: SAMPLE_AUTHORS.editorialDesk,
    tags: ["sample-content", "spatial-audio", "mixing", "audio-formats"],
    readingTimeMinutes: 3,
    publishedAtIso: "2026-10-19T15:10:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: false,
    coverGradient: "from-red-700 via-orange-700 to-slate-900",
    coverLabel: "SAMPLE TRENDING PRIMER • SPATIAL AUDIO PLACEHOLDER",
    isSamplePlaceholder: true,
  },

  // 8. INTERVIEWS
  {
    id: "sample-art-08",
    slug: "sample-how-long-form-editorial-q-and-a-features-are-formatted",
    title: "Sample Q&A Template: How Long-Form Production Interviews Are Structured",
    subtitle:
      "Placeholder demonstration of question-and-answer typography, context blocks, and editorial disclosure notes.",
    excerpt:
      "SAMPLE PLACEHOLDER: A structural template showing how verified interviews and studio conversations will be formatted in Phase 2.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This entry tests the Interviews category route. To uphold strict editorial integrity, no real or fabricated quotes are included; instead, this text outlines how Q&A formatting works on the platform.",
      "Editorial interviews begin with a context header summarizing the subject's discipline, the setting of the conversation, and the editorial editing policy (such as light editing for clarity and length).",
      "Questions are visually distinguished from responses using bold typographic hierarchy, while technical terms—like console routing, microphone polar patterns, or tuning systems—are accompanied by brief inline context for general readers."
    ],
    categorySlug: "interviews",
    author: SAMPLE_AUTHORS.editorialDesk,
    tags: ["sample-content", "interview-format", "editorial-standards", "typography"],
    readingTimeMinutes: 3,
    publishedAtIso: "2026-10-18T08:30:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: false,
    coverGradient: "from-teal-700 via-emerald-700 to-slate-900",
    coverLabel: "SAMPLE INTERVIEWS TEMPLATE • Q&A PLACEHOLDER",
    isSamplePlaceholder: true,
  },

  // 9. REVIEWS
  {
    id: "sample-art-09",
    slug: "sample-critical-framework-for-evaluating-album-sequencing-and-fidelity",
    title: "Sample Review Rubric: A Critical Framework for Evaluating Album Sequencing and Fidelity",
    subtitle:
      "Placeholder guide explaining how critical reviews assess thematic cohesion, dynamic range, and lyrical craft.",
    excerpt:
      "SAMPLE PLACEHOLDER: Testing the Reviews category layout with an explanation of our critical evaluation criteria.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This placeholder article tests the Reviews category page and card layout without reviewing or rating any real-world recording.",
      "Thoughtful music criticism looks beyond surface genre labels to examine how a record accomplishes its own artistic intent. Reviewers evaluate track-to-track pacing, harmonic variety across side A and side B, and the interplay between lyric imagery and arrangement.",
      "Sonic fidelity is also considered in context: whether a recording aims for crisp studio separation or raw room-mic immediacy, the mix should serve the emotional weight of the performance."
    ],
    categorySlug: "reviews",
    author: SAMPLE_AUTHORS.cultureFormatDesk,
    tags: ["sample-content", "review-framework", "album-sequencing", "criticism"],
    readingTimeMinutes: 4,
    publishedAtIso: "2026-10-17T12:00:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: false,
    coverGradient: "from-violet-700 via-purple-800 to-slate-900",
    coverLabel: "SAMPLE REVIEWS RUBRIC • CRITICISM PLACEHOLDER",
    isSamplePlaceholder: true,
  },
] as const;

/**
 * Return all sample articles ordered from newest to oldest.
 */
export function getAllSampleArticles(): SampleArticle[] {
  return [...SAMPLE_ARTICLES];
}

/**
 * Return featured sample articles for the homepage hero section.
 */
export function getFeaturedSampleArticles(): {
  lead: SampleArticle;
  secondary: SampleArticle[];
} {
  const featured = SAMPLE_ARTICLES.filter((a) => a.isFeatured);
  const lead = featured[0] ?? SAMPLE_ARTICLES[0];
  const secondary = featured.slice(1, 3);
  return { lead, secondary };
}

/**
 * Return trending sample articles sorted by `trendingRank`.
 */
export function getTrendingSampleArticles(): SampleArticle[] {
  return SAMPLE_ARTICLES.filter((a) => a.isTrending).sort(
    (a, b) => (a.trendingRank ?? 99) - (b.trendingRank ?? 99)
  );
}

/**
 * Return latest sample articles for the homepage feed.
 */
export function getLatestSampleArticles(limit = 6): SampleArticle[] {
  return SAMPLE_ARTICLES.slice(0, limit);
}

/**
 * Look up a valid category by its URL slug. Returns `undefined` for unknown slugs.
 */
export function getCategoryBySlug(slug: string): CategoryInfo | undefined {
  const normalized = slug.trim().toLowerCase() as CategorySlug;
  return CATEGORY_MAP[normalized];
}

/**
 * Return sample articles belonging to a specific category slug.
 */
export function getSampleArticlesByCategory(
  categorySlug: CategorySlug
): SampleArticle[] {
  return SAMPLE_ARTICLES.filter((a) => a.categorySlug === categorySlug);
}

/**
 * Look up a single sample article by both category slug and article slug.
 * Returns `undefined` if either the category or the slug does not match.
 */
export function getSampleArticleBySlug(
  categorySlug: string,
  articleSlug: string
): SampleArticle | undefined {
  const normalizedCategory = categorySlug.trim().toLowerCase();
  const normalizedSlug = articleSlug.trim().toLowerCase();
  return SAMPLE_ARTICLES.find(
    (a) =>
      a.categorySlug === normalizedCategory && a.slug === normalizedSlug
  );
}

/**
 * Filter sample articles by a search query string (and optional category slug).
 * Matches against title, subtitle, excerpt, body paragraphs, tags, category name, and author.
 */
export function searchSampleArticles(
  query: string,
  categoryFilter?: string
): SampleArticle[] {
  const normalizedCategory = categoryFilter?.trim().toLowerCase();
  const basePool =
    normalizedCategory && normalizedCategory in CATEGORY_MAP
      ? SAMPLE_ARTICLES.filter((a) => a.categorySlug === normalizedCategory)
      : [...SAMPLE_ARTICLES];

  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return basePool;
  }

  const terms = trimmedQuery.split(/\s+/).filter(Boolean);

  return basePool.filter((article) => {
    const categoryName =
      CATEGORIES.find((c) => c.slug === article.categorySlug)?.name ?? "";
    const haystack = [
      article.title,
      article.subtitle,
      article.excerpt,
      ...article.bodyParagraphs,
      ...article.tags,
      categoryName,
      article.author.penName,
    ]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}
