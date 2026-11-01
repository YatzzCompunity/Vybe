import type { CategoryInfo, CategorySlug } from "./types";

/**
 * Single configurable brand name constant.
 * Reads `NEXT_PUBLIC_SITE_NAME` from the environment and defaults to "VYBE".
 * Do NOT hardcode the brand name across components; import `SITE_NAME` from this module.
 */
export const SITE_NAME: string =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "VYBE";

export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

/**
 * Neutral placeholder description (official tagline, logo, and domain are undecided — marked TODO).
 */
export const SITE_DESCRIPTION: string =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION?.trim() ||
  "TODO: Official tagline pending — International music & celebrity news media platform (Phase 1 scaffold placeholder).";

/**
 * Primary navigation categories required by the editorial layout specification:
 * Music, Celebrity, Artists, Albums, Singles, Pop Culture, Trending, Interviews, Reviews.
 */
export const CATEGORIES: readonly CategoryInfo[] = [
  {
    slug: "music",
    name: "Music",
    description:
      "Industry analysis, production workflows, global scenes, and live touring mechanics.",
    accentColor: "from-indigo-600 via-violet-600 to-purple-700",
  },
  {
    slug: "celebrity",
    name: "Celebrity",
    description:
      "Public image architecture, brand partnerships, red-carpet styling, and media literacy.",
    accentColor: "from-rose-600 via-pink-600 to-fuchsia-700",
  },
  {
    slug: "artists",
    name: "Artists",
    description:
      "Craft profiles, creative routines, independent career building, and studio instrumentation.",
    accentColor: "from-amber-500 via-orange-600 to-red-600",
  },
  {
    slug: "albums",
    name: "Albums",
    description:
      "Long-form record sequencing, concept architecture, liner notes, and vinyl mastering.",
    accentColor: "from-emerald-600 via-teal-600 to-cyan-700",
  },
  {
    slug: "singles",
    name: "Singles",
    description:
      "Songwriting hooks, arrangement structures, radio edits, and lead-track rollout strategies.",
    accentColor: "from-sky-500 via-blue-600 to-indigo-700",
  },
  {
    slug: "pop-culture",
    name: "Pop Culture",
    description:
      "Crossovers between soundtracks, fashion, cinema, digital communities, and design.",
    accentColor: "from-fuchsia-600 via-purple-600 to-indigo-700",
  },
  {
    slug: "trending",
    name: "Trending",
    description:
      "High-velocity editorial explainers on emerging audio formats and cultural conversations.",
    accentColor: "from-red-600 via-orange-600 to-amber-600",
  },
  {
    slug: "interviews",
    name: "Interviews",
    description:
      "Long-form conversational formats exploring production philosophy and creative craft.",
    accentColor: "from-teal-600 via-emerald-600 to-green-700",
  },
  {
    slug: "reviews",
    name: "Reviews",
    description:
      "Critical frameworks for evaluating sonic fidelity, lyricism, arrangement, and cohesion.",
    accentColor: "from-violet-600 via-purple-700 to-slate-800",
  },
] as const;

export const CATEGORY_MAP: Record<CategorySlug, CategoryInfo> =
  CATEGORIES.reduce(
    (acc, category) => {
      acc[category.slug] = category;
      return acc;
    },
    {} as Record<CategorySlug, CategoryInfo>
  );
