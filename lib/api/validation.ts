import { NewsletterFrequency } from "@prisma/client";
import { ApiValidationError } from "./response";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 50;
export const MAX_PAGE = 1000;
export const MAX_QUERY_LENGTH = 200;
export const MAX_SLUG_LENGTH = 160;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_DISPLAY_NAME_LENGTH = 2;
export const MAX_DISPLAY_NAME_LENGTH = 80;
export const MAX_AVATAR_URL_LENGTH = 500;
export const MIN_COMMENT_LENGTH = 2;
export const MAX_COMMENT_LENGTH = 2000;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/;
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Validate and normalize `page` and `limit` query parameters.
 * - `page` defaults to 1, must be a positive integer <= 1000.
 * - `limit` defaults to `defaultLimit` (12), must be a positive integer, and is capped at `MAX_LIMIT` (50).
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit: number = DEFAULT_LIMIT
): PaginationParams {
  const rawPage = searchParams.get("page");
  const rawLimit = searchParams.get("limit");

  let page = DEFAULT_PAGE;
  if (rawPage !== null && rawPage.trim() !== "") {
    const trimmed = rawPage.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new ApiValidationError(
        "Invalid 'page' parameter: must be a positive integer."
      );
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_PAGE) {
      throw new ApiValidationError(
        `Invalid 'page' parameter: must be an integer between 1 and ${MAX_PAGE}.`
      );
    }
    page = parsed;
  }

  let limit = defaultLimit;
  if (rawLimit !== null && rawLimit.trim() !== "") {
    const trimmed = rawLimit.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new ApiValidationError(
        "Invalid 'limit' parameter: must be a positive integer."
      );
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new ApiValidationError(
        "Invalid 'limit' parameter: must be at least 1."
      );
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Validate an optional or required URL/query slug (`category`, `tag`, `[slug]`).
 */
export function validateSlugParam(
  rawValue: string | null | undefined,
  fieldName: string,
  required: true
): string;
export function validateSlugParam(
  rawValue: string | null | undefined,
  fieldName: string,
  required?: false
): string | undefined;
export function validateSlugParam(
  rawValue: string | null | undefined,
  fieldName: string,
  required: boolean = false
): string | undefined {
  if (rawValue === null || rawValue === undefined || rawValue.trim() === "") {
    if (required) {
      throw new ApiValidationError(
        `Parameter '${fieldName}' is required and cannot be empty.`
      );
    }
    return undefined;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized.length > MAX_SLUG_LENGTH || !SLUG_REGEX.test(normalized)) {
    throw new ApiValidationError(
      `Invalid '${fieldName}' parameter: must be a lowercase alphanumeric slug (e.g. 'music' or 'album-rollout').`
    );
  }

  return normalized;
}

/**
 * Validate search query string `q`.
 */
export function validateSearchQuery(
  rawQuery: string | null | undefined,
  required: true
): string;
export function validateSearchQuery(
  rawQuery: string | null | undefined,
  required?: false
): string | undefined;
export function validateSearchQuery(
  rawQuery: string | null | undefined,
  required: boolean = false
): string | undefined {
  if (rawQuery === null || rawQuery === undefined || rawQuery.trim() === "") {
    if (required) {
      throw new ApiValidationError(
        "Query parameter 'q' is required and must be a non-empty string."
      );
    }
    return undefined;
  }

  const trimmed = rawQuery.trim();
  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new ApiValidationError(
      `Query parameter 'q' exceeds maximum length of ${MAX_QUERY_LENGTH} characters.`
    );
  }

  if (CONTROL_CHAR_REGEX.test(trimmed)) {
    throw new ApiValidationError(
      "Query parameter 'q' contains invalid control characters."
    );
  }

  return trimmed;
}

/**
 * Safely parse a JSON object body from a Request.
 */
export async function parseJsonBody(
  request: Request
): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Body is not a JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new ApiValidationError(
      "Request body must be a valid JSON object.",
      { code: "BAD_REQUEST", status: 400 }
    );
  }
}

/**
 * Validate a user password (`8..128` characters).
 */
export function validatePassword(
  rawPassword: unknown,
  fieldName: string = "password"
): string {
  if (typeof rawPassword !== "string") {
    throw new ApiValidationError(`Field '${fieldName}' is required.`);
  }

  if (
    rawPassword.length < MIN_PASSWORD_LENGTH ||
    rawPassword.length > MAX_PASSWORD_LENGTH
  ) {
    throw new ApiValidationError(
      `Field '${fieldName}' must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`
    );
  }

  if (CONTROL_CHAR_REGEX.test(rawPassword)) {
    throw new ApiValidationError(
      `Field '${fieldName}' contains invalid control characters.`
    );
  }

  return rawPassword;
}

/**
 * Validate and sanitize a user's `displayName` (`2..80` characters, stripped of HTML tags).
 */
export function validateDisplayName(rawName: unknown): string {
  if (typeof rawName !== "string") {
    throw new ApiValidationError("Field 'displayName' is required.");
  }

  const sanitized = rawName
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    sanitized.length < MIN_DISPLAY_NAME_LENGTH ||
    sanitized.length > MAX_DISPLAY_NAME_LENGTH ||
    CONTROL_CHAR_REGEX.test(sanitized)
  ) {
    throw new ApiValidationError(
      `Field 'displayName' must be between ${MIN_DISPLAY_NAME_LENGTH} and ${MAX_DISPLAY_NAME_LENGTH} characters.`
    );
  }

  return sanitized;
}

/**
 * Validate an optional `avatarUrl` placeholder (`http://` or `https://`, max 500 chars, or null/empty).
 */
export function validateAvatarUrl(rawUrl: unknown): string | null {
  if (rawUrl === null || rawUrl === undefined || rawUrl === "") {
    return null;
  }

  if (typeof rawUrl !== "string") {
    throw new ApiValidationError(
      "Field 'avatarUrl' must be a valid URL string or null."
    );
  }

  const trimmed = rawUrl.trim();
  if (trimmed === "") {
    return null;
  }

  if (trimmed.length > MAX_AVATAR_URL_LENGTH || CONTROL_CHAR_REGEX.test(trimmed)) {
    throw new ApiValidationError(
      `Field 'avatarUrl' must not exceed ${MAX_AVATAR_URL_LENGTH} characters.`
    );
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
    return parsed.toString();
  } catch {
    throw new ApiValidationError(
      "Field 'avatarUrl' must be a valid http:// or https:// URL."
    );
  }
}

/**
 * Validate and sanitize a reader comment body (`2..2000` characters, stripped of HTML tags).
 */
export function validateCommentBody(rawBody: unknown): string {
  if (typeof rawBody !== "string") {
    throw new ApiValidationError("Comment 'body' is required.");
  }

  const stripped = rawBody
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (
    stripped.length < MIN_COMMENT_LENGTH ||
    stripped.length > MAX_COMMENT_LENGTH
  ) {
    throw new ApiValidationError(
      `Comment 'body' must be between ${MIN_COMMENT_LENGTH} and ${MAX_COMMENT_LENGTH} characters.`
    );
  }

  // Allow newlines (\n) and tabs (\t) in comments, reject other control chars
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(stripped)) {
    throw new ApiValidationError(
      "Comment 'body' contains invalid control characters."
    );
  }

  return stripped;
}

/**
 * Validate a UUID or slug identifier parameter.
 */
export function validateIdOrSlug(
  rawValue: unknown,
  fieldName: string
): string {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    throw new ApiValidationError(
      `Parameter '${fieldName}' is required and must be a non-empty string.`
    );
  }

  const trimmed = rawValue.trim();
  if (
    trimmed.length > 160 ||
    CONTROL_CHAR_REGEX.test(trimmed) ||
    !/^[a-zA-Z0-9_-]+$/.test(trimmed)
  ) {
    throw new ApiValidationError(`Invalid '${fieldName}' identifier.`);
  }

  return trimmed;
}

/**
 * Validate and normalize an email address.
 */
export function validateEmail(rawEmail: unknown): string {
  if (typeof rawEmail !== "string") {
    throw new ApiValidationError("A valid 'email' string is required.");
  }

  const normalized = rawEmail.trim().toLowerCase();
  if (
    normalized.length < 3 ||
    normalized.length > MAX_EMAIL_LENGTH ||
    normalized.includes("..") ||
    CONTROL_CHAR_REGEX.test(normalized) ||
    !EMAIL_REGEX.test(normalized)
  ) {
    throw new ApiValidationError("Please provide a valid email address.");
  }

  return normalized;
}

/**
 * Validate optional `frequencyPreference` field for newsletter subscriptions.
 */
export function validateNewsletterFrequency(
  rawFrequency: unknown
): NewsletterFrequency {
  if (rawFrequency === undefined || rawFrequency === null || rawFrequency === "") {
    return NewsletterFrequency.WEEKLY;
  }

  if (typeof rawFrequency !== "string") {
    throw new ApiValidationError(
      "Invalid 'frequencyPreference': must be one of DAILY, WEEKLY, or BREAKING_ONLY."
    );
  }

  const upper = rawFrequency.trim().toUpperCase();
  if (
    upper === NewsletterFrequency.DAILY ||
    upper === NewsletterFrequency.WEEKLY ||
    upper === NewsletterFrequency.BREAKING_ONLY
  ) {
    return upper;
  }

  throw new ApiValidationError(
    "Invalid 'frequencyPreference': must be one of DAILY, WEEKLY, or BREAKING_ONLY."
  );
}

/**
 * Validate confirmation token query parameter on `GET /api/v1/newsletter/confirm`.
 */
export function validateConfirmationToken(
  rawToken: string | null | undefined
): string {
  if (rawToken === null || rawToken === undefined || rawToken.trim() === "") {
    throw new ApiValidationError(
      "Query parameter 'token' is required.",
      { code: "VALIDATION_ERROR", status: 400 }
    );
  }

  const trimmed = rawToken.trim();
  if (
    trimmed.length > 256 ||
    CONTROL_CHAR_REGEX.test(trimmed) ||
    !/^[a-zA-Z0-9_-]+$/.test(trimmed)
  ) {
    throw new ApiValidationError(
      "The confirmation token is invalid or has expired.",
      { code: "INVALID_OR_EXPIRED_TOKEN", status: 400 }
    );
  }

  return trimmed;
}

