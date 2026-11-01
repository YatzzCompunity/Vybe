/**
 * ============================================================================
 * VYBE Media Platform — LLM Draft Generation Provider (Provider-Agnostic)
 * ============================================================================
 *
 * Supports Gemini API and OpenAI-compatible API endpoints without external SDK
 * dependencies (native fetch).
 *
 * HONEST CONFIGURATION GUARD:
 * If AI_PROVIDER_API_KEY is not set or retains placeholder values, draft
 * generation MUST fail honestly with an explicit TODO error message. It will
 * NEVER fabricate a fake draft or simulate an LLM response.
 * ============================================================================
 */

import type { DraftGenerationInput, GeneratedDraftOutput } from "./types";

export class AiConfigurationError extends Error {
  constructor(
    message = "TODO: AI provider API key is not configured. Set AI_PROVIDER_API_KEY in environment variables to enable draft generation."
  ) {
    super(message);
    this.name = "AiConfigurationError";
  }
}

export class AiGenerationError extends Error {
  public statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "AiGenerationError";
    this.statusCode = statusCode;
  }
}

/**
 * Checks whether the AI provider API key is configured with a valid, non-placeholder value.
 */
export function isAiProviderConfigured(): boolean {
  const apiKey = process.env.AI_PROVIDER_API_KEY?.trim();
  if (!apiKey) return false;
  if (apiKey === "your-ai-provider-api-key-placeholder") return false;
  if (apiKey.startsWith("your-") && apiKey.endsWith("-placeholder")) return false;
  return true;
}

/**
 * Builds the editorial system prompt for structured draft generation.
 */
function buildSystemPrompt(): string {
  return `You are a professional music, celebrity, artist, and pop culture staff journalist for VYBE (an international media publication).
Your task is to write an ORIGINAL, high-quality, long-form editorial draft based strictly on the provided lead, verified facts, and sources.

CRITICAL EDITORIAL & ETHICAL RULES:
1. NO PLAGIARISM: Write 100% original prose. Do not copy sentences verbatim from sources.
2. NO FABRICATION / NO FAKE NEWS: Present only facts supported by the verified facts or cited sources.
3. RUMOR & SPECULATION DISCLOSURE: If a claim is unverified, emerging, or speculative, you MUST explicitly flag it in the "unverifiedClaims" array and frame it neutrally in prose as unconfirmed or ongoing reporting.
4. STRUCTURED BODY: The body must be valid Markdown with clean '## ' (H2) and '### ' (H3) section headings. Never use '# ' (H1) inside the markdown body (H1 is the article title).
5. ART DIRECTION: Provide an "imagePrompt" describing the desired photographic or illustrative art direction (do not include markdown image tags).
6. OUTPUT FORMAT: Output ONLY a single valid JSON object matching the requested schema. No markdown code blocks around the JSON.`;
}

function buildUserPrompt(input: DraftGenerationInput): string {
  return `Please generate an editorial article draft based on the following verified lead information:

Lead Title: ${input.leadTitle || "Untitled Lead"}
Source Name: ${input.sourceName || "Independent Reporting / Official Release"}
Source URL: ${input.leadUrl || "N/A"}
Summary of Lead: ${input.summary || "N/A"}
Verified Facts / Editor Notes:
${input.verifiedFacts || "No additional verified notes provided by editor. Maintain conservative reporting bounds."}
Target Category: ${input.targetCategorySlug || "music"}
${input.editorialPrompt ? `Editor Instructions: ${input.editorialPrompt}` : ""}

Required JSON Output Schema:
{
  "title": "Compelling, journalistic article headline (50-90 characters)",
  "slugSuggestion": "url-friendly-slug-with-hyphens",
  "subtitle": "Informative subtitle or deck (optional, 60-140 characters)",
  "excerpt": "Concise editorial summary for cards and social previews (120-220 characters)",
  "bodyMarkdown": "Full article body in markdown with multiple sections separated by ## Headings and ### Subheadings. Original journalistic analysis.",
  "categorySlug": "slug of the best matching category (music, celebrity, artists, albums, singles, pop-culture, trending, interviews, reviews)",
  "tags": ["relevant-tag-1", "relevant-tag-2", "relevant-tag-3"],
  "seoSuggestion": {
    "metaTitle": "SEO title (50-65 chars)",
    "metaDescription": "SEO meta description (120-160 chars)",
    "ogTitle": "Open Graph headline (50-80 chars)",
    "ogDescription": "Open Graph description (120-180 chars)"
  },
  "imagePrompt": "Detailed art direction prompt for hero image (e.g. 'Editorial studio portrait of artist with muted neon rim lighting, high-fashion styling')",
  "unverifiedClaims": ["Any unconfirmed rumors or developing claims requiring editorial verification"],
  "sourcesCited": ["${input.sourceName || "Official Source"}"],
  "confidenceScore": 0.95
}`;
}

/**
 * Calls the configured LLM provider to generate a structured draft.
 * If no valid API key is present, throws AiConfigurationError immediately.
 */
export async function callLlmDraftGeneration(
  input: DraftGenerationInput
): Promise<GeneratedDraftOutput> {
  if (!isAiProviderConfigured()) {
    throw new AiConfigurationError();
  }

  const apiKey = process.env.AI_PROVIDER_API_KEY!.trim();
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const model = process.env.AI_MODEL_NAME?.trim() || "gemini-2.5-flash";

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  if (provider === "gemini") {
    return callGemini(apiKey, model, systemPrompt, userPrompt);
  } else if (provider === "openai") {
    return callOpenAI(apiKey, model, systemPrompt, userPrompt);
  } else {
    throw new AiGenerationError(`Unsupported AI provider: ${provider}. Use 'gemini' or 'openai'.`);
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<GeneratedDraftOutput> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemPrompt}\n\n${userPrompt}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AiGenerationError(`Network error connecting to Gemini API: ${msg}`);
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new AiGenerationError(
      `Gemini API error (HTTP ${res.status}): ${errorBody.slice(0, 300)}`,
      res.status
    );
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new AiGenerationError("Gemini returned an empty response.");
  }

  return parseGeneratedJson(rawText, model);
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<GeneratedDraftOutput> {
  const url = "https://api.openai.com/v1/chat/completions";

  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AiGenerationError(`Network error connecting to OpenAI API: ${msg}`);
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new AiGenerationError(
      `OpenAI API error (HTTP ${res.status}): ${errorBody.slice(0, 300)}`,
      res.status
    );
  }

  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new AiGenerationError("OpenAI returned an empty response.");
  }

  return parseGeneratedJson(rawText, model);
}

function parseGeneratedJson(rawText: string, modelUsed: string): GeneratedDraftOutput {
  let cleaned = rawText.trim();
  // Strip Markdown JSON code fence if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```$/, "").trim();
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AiGenerationError("Failed to parse LLM response as valid JSON.");
  }

  const title = String(parsed.title || "Untitled Draft").trim();
  const slugSuggestion = String(
    parsed.slugSuggestion ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
  ).trim();

  const excerpt = String(parsed.excerpt || "").trim();
  const bodyMarkdown = String(parsed.bodyMarkdown || "").trim();
  const tags = Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).trim()) : [];
  const imagePrompt = String(parsed.imagePrompt || "").trim();

  const unverifiedClaims = Array.isArray(parsed.unverifiedClaims)
    ? parsed.unverifiedClaims.map((c) => String(c).trim()).filter(Boolean)
    : [];

  const sourcesCited = Array.isArray(parsed.sourcesCited)
    ? parsed.sourcesCited.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const confidenceScore =
    typeof parsed.confidenceScore === "number"
      ? Math.max(0, Math.min(1, parsed.confidenceScore))
      : 0.9;

  const rawSeo = (typeof parsed.seoSuggestion === "object" && parsed.seoSuggestion !== null
    ? parsed.seoSuggestion
    : {}) as Record<string, unknown>;

  const seoSuggestion = {
    metaTitle: String(rawSeo.metaTitle || title).slice(0, 70),
    metaDescription: String(rawSeo.metaDescription || excerpt).slice(0, 160),
    ogTitle: String(rawSeo.ogTitle || title).slice(0, 100),
    ogDescription: String(rawSeo.ogDescription || excerpt).slice(0, 200),
  };

  return {
    title,
    slugSuggestion,
    subtitle: parsed.subtitle ? String(parsed.subtitle).trim() : undefined,
    excerpt,
    bodyMarkdown,
    categorySlug: parsed.categorySlug ? String(parsed.categorySlug).trim() : undefined,
    tags,
    seoSuggestion,
    imagePrompt,
    unverifiedClaims,
    sourcesCited,
    confidenceScore,
    modelUsed,
  };
}
