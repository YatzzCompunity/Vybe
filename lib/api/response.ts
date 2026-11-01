import { NextResponse } from "next/server";

/**
 * Standard security headers applied to all `/api/v1/*` JSON responses.
 */
export const API_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

export interface ApiSuccessEnvelope<T, M = Record<string, unknown>> {
  data: T;
  meta: M;
}

export interface ApiErrorCode {
  code:
    | "VALIDATION_ERROR"
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INVALID_OR_EXPIRED_TOKEN"
    | "RATE_LIMITED"
    | "NOT_IMPLEMENTED"
    | "INTERNAL_SERVER_ERROR";
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  error: ApiErrorCode;
}

/**
 * Typed validation error thrown by input validators in `lib/api/validation.ts`.
 */
export class ApiValidationError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode["code"];
  public readonly details?: Record<string, unknown>;
  public readonly headers?: Record<string, string>;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: ApiErrorCode["code"];
      details?: Record<string, unknown>;
      headers?: Record<string, string>;
    }
  ) {
    super(message);
    this.name = "ApiValidationError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "VALIDATION_ERROR";
    this.details = options?.details;
    this.headers = options?.headers;
  }
}

/**
 * Return a standardized `{ data, meta }` JSON response with security headers.
 */
export function apiSuccess<T, M = Record<string, unknown>>(
  data: T,
  meta: M,
  init?: {
    status?: number;
    headers?: Record<string, string>;
  }
): NextResponse<ApiSuccessEnvelope<T, M>> {
  const headers: Record<string, string> = {
    ...API_SECURITY_HEADERS,
    ...(init?.headers ?? {}),
  };

  return NextResponse.json(
    {
      data,
      meta,
    },
    {
      status: init?.status ?? 200,
      headers,
    }
  );
}

/**
 * Return a standardized `{ error: { code, message, details? } }` JSON response
 * with security headers. Never exposes internal stack traces or DB internals.
 */
export function apiError(
  code: ApiErrorCode["code"],
  message: string,
  status: number,
  options?: {
    details?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): NextResponse<ApiErrorEnvelope> {
  const headers: Record<string, string> = {
    ...API_SECURITY_HEADERS,
    "Cache-Control": "no-store",
    ...(options?.headers ?? {}),
  };

  const errorPayload: ApiErrorCode = {
    code,
    message,
    ...(options?.details ? { details: options.details } : {}),
  };

  return NextResponse.json(
    {
      error: errorPayload,
    },
    {
      status,
      headers,
    }
  );
}

/**
 * Centralized error handler for API Route Handlers.
 * - Maps `ApiValidationError` to its HTTP 4xx status and safe message.
 * - Logs unexpected errors to server stderr only (`console.error`) without
 *   leaking stack traces, SQL queries, or internal details to clients.
 */
export function handleApiError(
  error: unknown,
  context: string,
  extraHeaders?: Record<string, string>
): NextResponse<ApiErrorEnvelope> {
  if (error instanceof ApiValidationError) {
    return apiError(error.code, error.message, error.status, {
      details: error.details,
      headers: { ...(error.headers ?? {}), ...(extraHeaders ?? {}) },
    });
  }

  const safeLogMessage =
    error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error";
  console.error(`[API Error] ${context} — ${safeLogMessage}`);

  return apiError(
    "INTERNAL_SERVER_ERROR",
    "An unexpected error occurred while processing the request.",
    500,
    { headers: extraHeaders }
  );
}
