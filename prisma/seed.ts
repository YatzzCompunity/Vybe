/**
 * ============================================================================
 * VYBE Media Platform — Idempotent Database Seed (Phase 2)
 * ============================================================================
 * Seeds the local SQLite (or production PostgreSQL) database with:
 * - 9 primary navigation categories (`Category`)
 * - 3 sample editorial author profiles (`Author`)
 * - 9 original SAMPLE / PLACEHOLDER articles (`Article`) copied verbatim from
 *   `lib/sample-articles.ts` (one per category, marked `isSampleContent: true`
 *   and `editorialNote` indicating sample fixture status)
 * - Associated topic tags (`Tag` + `ArticleTag` join records)
 * - 6 sample trending topics (`TrendingTopic`)
 *
 * Security & Compliance:
 * - Zero User accounts or plaintext passwords are created in Phase 2 (Auth is Phase 4).
 * - All article content is 100% original sample/placeholder prose for layout and
 *   database verification only — no copied third-party news or fabricated facts.
 * - Uses `upsert` by unique `slug` (and composite `[articleId, tagId]`) so running
 *   the seed multiple times is strictly idempotent.
 * ============================================================================
 */

import { ArticleStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  accentColor: string;
  sortOrder: number;
}

interface SeedAuthor {
  key: string;
  slug: string;
  penName: string;
  roleTitle: string;
  bio: string;
}

interface SeedArticle {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  bodyParagraphs: string[];
  categorySlug: string;
  authorSlug: string;
  tags: string[];
  readingTimeMinutes: number;
  publishedAtIso: string;
  publishedDisplay: string;
  isFeatured: boolean;
  isTrending: boolean;
  trendingRank?: number;
  coverGradient: string;
  coverLabel: string;
}

const SEED_CATEGORIES: readonly SeedCategory[] = [
  {
    slug: "music",
    name: "Music",
    description:
      "Industry analysis, production workflows, global scenes, and live touring mechanics.",
    accentColor: "from-indigo-600 via-violet-600 to-purple-700",
    sortOrder: 1,
  },
  {
    slug: "celebrity",
    name: "Celebrity",
    description:
      "Public image architecture, brand partnerships, red-carpet styling, and media literacy.",
    accentColor: "from-rose-600 via-pink-600 to-fuchsia-700",
    sortOrder: 2,
  },
  {
    slug: "artists",
    name: "Artists",
    description:
      "Craft profiles, creative routines, independent career building, and studio instrumentation.",
    accentColor: "from-amber-500 via-orange-600 to-red-600",
    sortOrder: 3,
  },
  {
    slug: "albums",
    name: "Albums",
    description:
      "Long-form record sequencing, concept architecture, liner notes, and vinyl mastering.",
    accentColor: "from-emerald-600 via-teal-600 to-cyan-700",
    sortOrder: 4,
  },
  {
    slug: "singles",
    name: "Singles",
    description:
      "Songwriting hooks, arrangement structures, radio edits, and lead-track rollout strategies.",
    accentColor: "from-sky-500 via-blue-600 to-indigo-700",
    sortOrder: 5,
  },
  {
    slug: "pop-culture",
    name: "Pop Culture",
    description:
      "Crossovers between soundtracks, fashion, cinema, digital communities, and design.",
    accentColor: "from-fuchsia-600 via-purple-600 to-indigo-700",
    sortOrder: 6,
  },
  {
    slug: "trending",
    name: "Trending",
    description:
      "High-velocity editorial explainers on emerging audio formats and cultural conversations.",
    accentColor: "from-red-600 via-orange-600 to-amber-600",
    sortOrder: 7,
  },
  {
    slug: "interviews",
    name: "Interviews",
    description:
      "Long-form conversational formats exploring production philosophy and creative craft.",
    accentColor: "from-teal-600 via-emerald-600 to-green-700",
    sortOrder: 8,
  },
  {
    slug: "reviews",
    name: "Reviews",
    description:
      "Critical frameworks for evaluating sonic fidelity, lyricism, arrangement, and cohesion.",
    accentColor: "from-violet-600 via-purple-700 to-slate-800",
    sortOrder: 9,
  },
];

const SEED_AUTHORS: readonly SeedAuthor[] = [
  {
    key: "editorialDesk",
    slug: "editorial-architecture-desk",
    penName: "Editorial Architecture Desk (Sample)",
    roleTitle: "Layout & Features Placeholder",
    bio: "Placeholder editorial profile used to verify byline rendering, author cards, and structured metadata during Phase 1.",
  },
  {
    key: "studioCraftDesk",
    slug: "studio-craft-desk",
    penName: "Studio & Production Desk (Sample)",
    roleTitle: "Audio Craft Placeholder",
    bio: "Sample contributor profile demonstrating multi-author attribution in category feeds and article headers.",
  },
  {
    key: "cultureFormatDesk",
    slug: "culture-format-desk",
    penName: "Culture & Formats Desk (Sample)",
    roleTitle: "Media Systems Placeholder",
    bio: "Sample contributor profile for testing cross-category tagging and search filtering.",
  },
];

const SEED_SAMPLE_ARTICLES: readonly SeedArticle[] = [
  // 1. ALBUMS (Hero Featured Sample)
  {
    slug: "sample-how-modern-album-rollouts-are-structured",
    title:
      "Sample Feature: How a Modern Album Rollout Is Structured From Studio to Stage",
    subtitle:
      "Placeholder long-form explainer examining how teaser singles, artwork direction, and physical pressing timelines fit together.",
    excerpt:
      "SAMPLE PLACEHOLDER: An overview of the standard phases involved in planning a full-length studio record release, used here to test hero typography and featured card layouts.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This article is a layout test fixture demonstrating how lead feature stories appear across the homepage hero module and the article detail template. It describes general music-industry workflow concepts rather than reporting on any specific real-world release.",
      "In a typical full-length album campaign, teams coordinate mastering deadlines alongside visual identity systems months before an announcement. Physical manufacturing schedules—especially for vinyl records and booklet packaging—often dictate when final audio masters must be locked.",
      "Once the core sonic and visual direction is established, the rollout sequence typically introduces listeners to the project through one or two lead singles, accompanied by liner-note essays, studio process documentation, and rehearsal preparation for live performances.",
    ],
    categorySlug: "albums",
    authorSlug: "editorial-architecture-desk",
    tags: [
      "sample-content",
      "album-rollout",
      "vinyl-packaging",
      "editorial-layout",
    ],
    readingTimeMinutes: 4,
    publishedAtIso: "2026-10-25T09:00:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: true,
    isTrending: true,
    trendingRank: 1,
    coverGradient: "from-emerald-700 via-teal-700 to-slate-900",
    coverLabel: "SAMPLE ALBUMS FEATURE • ARTWORK PLACEHOLDER",
  },

  // 2. MUSIC (Secondary Featured Sample)
  {
    slug: "sample-inside-live-touring-production-logistics",
    title:
      "Sample Guide: Inside the Logistics of International Live Touring Production",
    subtitle:
      "Placeholder overview of soundcheck workflows, stage plot routing, and acoustic calibration across different venue sizes.",
    excerpt:
      "SAMPLE PLACEHOLDER: How touring audio engineers and production managers adapt a live show from intimate clubs to outdoor amphitheaters.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This entry serves as a placeholder story for the Music category feed and secondary featured slot. All descriptions are educational overviews of general live sound production practices.",
      "Touring production relies on repeatable technical documentation—specifically input lists, stage plots, and monitor mix presets—so that local venue crews and traveling engineers can assemble complex audio systems within tight load-in windows.",
      "Acoustic calibration tools allow front-of-house engineers to adapt speaker arrays to varying room geometries, ensuring consistent vocal intelligibility and low-end balance regardless of ceiling height or seating materials.",
    ],
    categorySlug: "music",
    authorSlug: "studio-craft-desk",
    tags: [
      "sample-content",
      "live-production",
      "sound-engineering",
      "touring",
    ],
    readingTimeMinutes: 3,
    publishedAtIso: "2026-10-24T14:30:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: true,
    isTrending: true,
    trendingRank: 2,
    coverGradient: "from-indigo-700 via-violet-700 to-slate-900",
    coverLabel: "SAMPLE MUSIC GUIDE • STAGE AUDIO PLACEHOLDER",
  },

  // 3. CELEBRITY (Secondary Featured Sample)
  {
    slug: "sample-how-red-carpet-archival-wardrobe-styling-works",
    title:
      "Sample Explainer: How Archival Wardrobe Styling Works for Major Award Ceremonies",
    subtitle:
      "Placeholder look at how stylists, ateliers, and garment conservators coordinate custom and archival looks for public appearances.",
    excerpt:
      "SAMPLE PLACEHOLDER: Testing the Celebrity category layout with an overview of garment sourcing, tailoring timelines, and photographic lighting.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This placeholder article tests the Celebrity category route and card typography. It outlines the general craft of formal styling without referencing real-world individuals or events.",
      "Preparing a formal appearance look typically begins weeks in advance with mood boards that align garment silhouette, fabric texture, and camera flash behavior. When archival pieces are selected, conservation specialists establish strict handling and fitting protocols.",
      "Final fittings account for movement, posture during press line photography, and coordination with hair, makeup, and jewelry design teams so the visual presentation reads cohesively in both wide-angle and close-up framing.",
    ],
    categorySlug: "celebrity",
    authorSlug: "culture-format-desk",
    tags: ["sample-content", "styling", "fashion-archives", "red-carpet"],
    readingTimeMinutes: 3,
    publishedAtIso: "2026-10-23T11:15:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: true,
    isTrending: true,
    trendingRank: 3,
    coverGradient: "from-rose-700 via-pink-700 to-slate-900",
    coverLabel: "SAMPLE CELEBRITY EXPLAINER • STYLING PLACEHOLDER",
  },

  // 4. ARTISTS
  {
    slug: "sample-building-a-sustainable-independent-studio-practice",
    title:
      "Sample Profile Format: Building a Sustainable Independent Studio Practice",
    subtitle:
      "Placeholder template demonstrating how artist craft profiles, rehearsal habits, and demo archiving are presented.",
    excerpt:
      "SAMPLE PLACEHOLDER: A structural preview of the Artists section, focusing on songwriting notebooks, stem organization, and collaborative sessions.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: Created for Phase 1 layout verification, this article demonstrates the Artists category template and tag navigation links.",
      "Many working songwriters and multi-instrumentalists treat their home or project studios as modular laboratories. Keeping instruments wired and ready to record minimizes technical friction when a melodic or rhythmic idea emerges.",
      "Equally important is disciplined stem archiving—labeling tempo, key center, microphone chain, and session notes—so rough voice memos and multitrack sketches can be revisited months later without losing context.",
    ],
    categorySlug: "artists",
    authorSlug: "studio-craft-desk",
    tags: ["sample-content", "songwriting", "home-studio", "stem-archiving"],
    readingTimeMinutes: 4,
    publishedAtIso: "2026-10-22T16:00:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: true,
    trendingRank: 4,
    coverGradient: "from-amber-600 via-orange-700 to-slate-900",
    coverLabel: "SAMPLE ARTISTS PROFILE • STUDIO PLACEHOLDER",
  },

  // 5. SINGLES
  {
    slug: "sample-anatomy-of-a-three-minute-pop-arrangement",
    title:
      "Sample Breakdown: The Anatomy of a Three-Minute Single Arrangement",
    subtitle:
      "Placeholder musicology piece illustrating how intro hooks, pre-chorus lift, and dynamic contrast keep arrangements engaging.",
    excerpt:
      "SAMPLE PLACEHOLDER: Testing the Singles category view with a generic structural breakdown of verse, chorus, and bridge dynamics.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This placeholder article populates the Singles category for Phase 1 testing. It discusses general music theory and arrangement concepts.",
      "Compact single arrangements often rely on contrast in register and rhythmic density between sections. By keeping verse instrumentation sparse, producers leave spectral headroom for the chorus to expand in stereo width and harmonic richness.",
      "Subtle arrangement transitions—such as muting the bass for a single bar before the downbeat or introducing a counter-melody in the second verse—maintain momentum without overcrowding the vocal.",
    ],
    categorySlug: "singles",
    authorSlug: "studio-craft-desk",
    tags: ["sample-content", "arrangement", "music-theory", "song-structure"],
    readingTimeMinutes: 3,
    publishedAtIso: "2026-10-21T10:45:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: false,
    coverGradient: "from-sky-600 via-blue-700 to-slate-900",
    coverLabel: "SAMPLE SINGLES BREAKDOWN • WAVEFORM PLACEHOLDER",
  },

  // 6. POP CULTURE
  {
    slug: "sample-how-film-and-series-music-supervision-works",
    title:
      "Sample Essay: How Music Supervision Connects Visual Storytelling and Catalogue Songs",
    subtitle:
      "Placeholder overview of cue sheets, synchronization licensing workflows, and thematic motifs in cinema and television.",
    excerpt:
      "SAMPLE PLACEHOLDER: Exploring the intersection of visual media and recorded music to test the Pop Culture section layout.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This article is a placeholder fixture for the Pop Culture category. It explains the general role of music supervisors in film and television production.",
      "Music supervision bridges creative direction and legal clearance. Supervisors collaborate with directors and editors to test temporary cues against rough picture cuts, evaluating how tempo and lyric perspective shape the emotional subtext of a scene.",
      "Simultaneously, clearance specialists confirm publishing and master ownership splits so that synchronization licenses match the project's distribution territories and archival formats.",
    ],
    categorySlug: "pop-culture",
    authorSlug: "culture-format-desk",
    tags: [
      "sample-content",
      "music-supervision",
      "soundtracks",
      "sync-licensing",
    ],
    readingTimeMinutes: 4,
    publishedAtIso: "2026-10-20T13:20:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: true,
    trendingRank: 5,
    coverGradient: "from-fuchsia-700 via-purple-700 to-slate-900",
    coverLabel: "SAMPLE POP CULTURE • SOUNDTRACK PLACEHOLDER",
  },

  // 7. TRENDING
  {
    slug: "sample-understanding-spatial-audio-and-binaural-mixing-formats",
    title:
      "Sample Explainer: Understanding Spatial Audio and Binaural Headphone Delivery",
    subtitle:
      "Placeholder technical primer on object-based audio mixes versus traditional two-channel stereo masters.",
    excerpt:
      "SAMPLE PLACEHOLDER: Testing the Trending section with a primer on immersive mixing workflows and headphone translation checks.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This placeholder article populates the Trending category route during Phase 1 scaffold verification.",
      "Object-based audio formats allow mixing engineers to position individual stems in a three-dimensional coordinate field rather than a strictly left-right stereo panorama. When rendered for headphones, binaural processing applies head-related transfer functions to simulate depth and elevation.",
      "Because listeners use a wide range of playback hardware, engineers routinely check immersive masters alongside dedicated stereo fold-downs to preserve punch, vocal presence, and tonal consistency.",
    ],
    categorySlug: "trending",
    authorSlug: "editorial-architecture-desk",
    tags: ["sample-content", "spatial-audio", "mixing", "audio-formats"],
    readingTimeMinutes: 3,
    publishedAtIso: "2026-10-19T15:10:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: false,
    coverGradient: "from-red-700 via-orange-700 to-slate-900",
    coverLabel: "SAMPLE TRENDING PRIMER • SPATIAL AUDIO PLACEHOLDER",
  },

  // 8. INTERVIEWS
  {
    slug: "sample-how-long-form-editorial-q-and-a-features-are-formatted",
    title:
      "Sample Q&A Template: How Long-Form Production Interviews Are Structured",
    subtitle:
      "Placeholder demonstration of question-and-answer typography, context blocks, and editorial disclosure notes.",
    excerpt:
      "SAMPLE PLACEHOLDER: A structural template showing how verified interviews and studio conversations will be formatted in Phase 2.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This entry tests the Interviews category route. To uphold strict editorial integrity, no real or fabricated quotes are included; instead, this text outlines how Q&A formatting works on the platform.",
      "Editorial interviews begin with a context header summarizing the subject's discipline, the setting of the conversation, and the editorial editing policy (such as light editing for clarity and length).",
      "Questions are visually distinguished from responses using bold typographic hierarchy, while technical terms—like console routing, microphone polar patterns, or tuning systems—are accompanied by brief inline context for general readers.",
    ],
    categorySlug: "interviews",
    authorSlug: "editorial-architecture-desk",
    tags: [
      "sample-content",
      "interview-format",
      "editorial-standards",
      "typography",
    ],
    readingTimeMinutes: 3,
    publishedAtIso: "2026-10-18T08:30:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: false,
    coverGradient: "from-teal-700 via-emerald-700 to-slate-900",
    coverLabel: "SAMPLE INTERVIEWS TEMPLATE • Q&A PLACEHOLDER",
  },

  // 9. REVIEWS
  {
    slug: "sample-critical-framework-for-evaluating-album-sequencing-and-fidelity",
    title:
      "Sample Review Rubric: A Critical Framework for Evaluating Album Sequencing and Fidelity",
    subtitle:
      "Placeholder guide explaining how critical reviews assess thematic cohesion, dynamic range, and lyrical craft.",
    excerpt:
      "SAMPLE PLACEHOLDER: Testing the Reviews category layout with an explanation of our critical evaluation criteria.",
    bodyParagraphs: [
      "SAMPLE / PLACEHOLDER CONTENT: This placeholder article tests the Reviews category page and card layout without reviewing or rating any real-world recording.",
      "Thoughtful music criticism looks beyond surface genre labels to examine how a record accomplishes its own artistic intent. Reviewers evaluate track-to-track pacing, harmonic variety across side A and side B, and the interplay between lyric imagery and arrangement.",
      "Sonic fidelity is also considered in context: whether a recording aims for crisp studio separation or raw room-mic immediacy, the mix should serve the emotional weight of the performance.",
    ],
    categorySlug: "reviews",
    authorSlug: "culture-format-desk",
    tags: [
      "sample-content",
      "review-framework",
      "album-sequencing",
      "criticism",
    ],
    readingTimeMinutes: 4,
    publishedAtIso: "2026-10-17T12:00:00.000Z",
    publishedDisplay: "Sample Fixture • Layout Test",
    isFeatured: false,
    isTrending: false,
    coverGradient: "from-violet-700 via-purple-800 to-slate-900",
    coverLabel: "SAMPLE REVIEWS RUBRIC • CRITICISM PLACEHOLDER",
  },
];

const SEED_TRENDING_TOPICS = [
  {
    slug: "album-rollout",
    label: "Album Rollout",
    categorySlug: "albums",
    score: 98.5,
    velocity: 14.2,
    isPinned: true,
  },
  {
    slug: "sound-engineering",
    label: "Sound Engineering",
    categorySlug: "music",
    score: 94.0,
    velocity: 11.8,
    isPinned: false,
  },
  {
    slug: "spatial-audio",
    label: "Spatial Audio",
    categorySlug: "trending",
    score: 91.2,
    velocity: 15.6,
    isPinned: false,
  },
  {
    slug: "music-supervision",
    label: "Music Supervision",
    categorySlug: "pop-culture",
    score: 88.4,
    velocity: 9.4,
    isPinned: false,
  },
  {
    slug: "songwriting",
    label: "Songwriting",
    categorySlug: "artists",
    score: 86.0,
    velocity: 8.1,
    isPinned: false,
  },
  {
    slug: "vinyl-packaging",
    label: "Vinyl Packaging",
    categorySlug: "albums",
    score: 83.7,
    velocity: 7.5,
    isPinned: false,
  },
] as const;

const SAMPLE_EDITORIAL_NOTE =
  "SAMPLE / PLACEHOLDER CONTENT — Seeded from original Phase 1/2 fixture for layout, routing, and Prisma database verification. Not real news.";

async function main(): Promise<void> {
  console.log("Seeding VYBE database (idempotent upsert by slug)...");

  // 1. Upsert 9 Categories
  const categoryIdBySlug = new Map<string, string>();
  for (const cat of SEED_CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        accentColor: cat.accentColor,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        accentColor: cat.accentColor,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
    categoryIdBySlug.set(cat.slug, record.id);
  }

  // 2. Upsert 3 Sample Authors (no User accounts created in Phase 2)
  const authorIdBySlug = new Map<string, string>();
  for (const author of SEED_AUTHORS) {
    const record = await prisma.author.upsert({
      where: { slug: author.slug },
      update: {
        penName: author.penName,
        roleTitle: author.roleTitle,
        bio: author.bio,
        isStaff: true,
      },
      create: {
        slug: author.slug,
        penName: author.penName,
        roleTitle: author.roleTitle,
        bio: author.bio,
        isStaff: true,
      },
    });
    authorIdBySlug.set(author.slug, record.id);
  }

  // 3. Upsert Tags & 9 Original Sample Articles
  for (const item of SEED_SAMPLE_ARTICLES) {
    const categoryId = categoryIdBySlug.get(item.categorySlug);
    const authorId = authorIdBySlug.get(item.authorSlug);

    if (!categoryId || !authorId) {
      throw new Error(
        `Missing category (${item.categorySlug}) or author (${item.authorSlug}) for sample article ${item.slug}`
      );
    }

    const bodyMarkdown = item.bodyParagraphs.join("\n\n");
    const publishedAt = new Date(item.publishedAtIso);

    const articleRecord = await prisma.article.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        subtitle: item.subtitle,
        excerpt: item.excerpt,
        bodyMarkdown,
        status: ArticleStatus.PUBLISHED,
        isFeatured: item.isFeatured,
        isTrending: item.isTrending,
        trendingRank: item.trendingRank ?? null,
        isAiAssisted: false,
        isSampleContent: true,
        editorialNote: SAMPLE_EDITORIAL_NOTE,
        coverGradient: item.coverGradient,
        coverLabel: item.coverLabel,
        publishedDisplay: item.publishedDisplay,
        readingTimeMinutes: item.readingTimeMinutes,
        authorId,
        categoryId,
        publishedAt,
      },
      create: {
        slug: item.slug,
        title: item.title,
        subtitle: item.subtitle,
        excerpt: item.excerpt,
        bodyMarkdown,
        status: ArticleStatus.PUBLISHED,
        isFeatured: item.isFeatured,
        isTrending: item.isTrending,
        trendingRank: item.trendingRank ?? null,
        isAiAssisted: false,
        isSampleContent: true,
        editorialNote: SAMPLE_EDITORIAL_NOTE,
        coverGradient: item.coverGradient,
        coverLabel: item.coverLabel,
        publishedDisplay: item.publishedDisplay,
        readingTimeMinutes: item.readingTimeMinutes,
        authorId,
        categoryId,
        publishedAt,
      },
    });

    // Upsert Tags and ArticleTag join rows
    for (const tagSlug of item.tags) {
      const normalizedSlug = tagSlug.trim().toLowerCase();
      const tagName = normalizedSlug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

      const tagRecord = await prisma.tag.upsert({
        where: { slug: normalizedSlug },
        update: {
          name: tagName,
        },
        create: {
          slug: normalizedSlug,
          name: tagName,
          description: `Sample topic tag: ${tagName}`,
        },
      });

      await prisma.articleTag.upsert({
        where: {
          articleId_tagId: {
            articleId: articleRecord.id,
            tagId: tagRecord.id,
          },
        },
        update: {},
        create: {
          articleId: articleRecord.id,
          tagId: tagRecord.id,
        },
      });
    }
  }

  // 4. Upsert Sample Trending Topics
  for (const topic of SEED_TRENDING_TOPICS) {
    const categoryId = categoryIdBySlug.get(topic.categorySlug) ?? null;
    await prisma.trendingTopic.upsert({
      where: { slug: topic.slug },
      update: {
        label: topic.label,
        categoryId,
        score: topic.score,
        velocity: topic.velocity,
        isPinned: topic.isPinned,
      },
      create: {
        slug: topic.slug,
        label: topic.label,
        categoryId,
        score: topic.score,
        velocity: topic.velocity,
        isPinned: topic.isPinned,
      },
    });
  }

  const [
    categoryCount,
    authorCount,
    articleCount,
    sampleArticleCount,
    tagCount,
    articleTagCount,
    trendingTopicCount,
    userCount,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.author.count(),
    prisma.article.count(),
    prisma.article.count({ where: { isSampleContent: true } }),
    prisma.tag.count(),
    prisma.articleTag.count(),
    prisma.trendingTopic.count(),
    prisma.user.count(),
  ]);

  console.log("Seed completed successfully:");
  console.log(`  Categories      : ${categoryCount}`);
  console.log(`  Authors         : ${authorCount}`);
  console.log(`  Articles (total): ${articleCount} (isSampleContent=true: ${sampleArticleCount})`);
  console.log(`  Tags            : ${tagCount}`);
  console.log(`  ArticleTags     : ${articleTagCount}`);
  console.log(`  TrendingTopics  : ${trendingTopicCount}`);
  console.log(`  Users           : ${userCount}`);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
