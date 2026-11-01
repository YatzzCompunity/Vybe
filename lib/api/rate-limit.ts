import type { NextRequest } from "next/server";

/**
 * Rate Limiting Module (Phase 10 Hardened)
 *
 * Current Architecture & Posture:
 * - Rate limiting defaults to an in-memory sliding bucket store (`Map<string, RateLimitBucket>`).
 * - Buckets track `count` and `resetAtMs` per client IP.
 * - Periodic LRU-style pruning occurs when tracked keys reach 2,000 entries.
 *
 * Limitations of In-Memory Rate Limiting:
 * - In multi-instance deployments (e.g., Kubernetes pods, multiple serverless lambdas),
 *   in-memory counters are local to each process and do NOT coordinate across instances.
 * - Server restarts reset in-memory counters.
 *
 * Optional Redis-backed Rate Limiter (Zero New Dependencies):
 * - For multi-instance production, an HTTP REST Redis integration is supported via:
 *     UPSTASH_REDIS_REST_URL
 *     UPSTASH_REDIS_REST_TOKEN
 * - Uses native Node.js `fetch` (no external Redis npm driver required).
 * - Honest status: UNTESTED in this local VM environment because no live Redis/Upstash instance
 *   is provisioned. The in-memory limiter remains the tested and verified default.
 */

export const WRITE_RATE_LIMIT_MAX = 10;
export const WRITE_RATE_LIMIT_WINDOW_MS = 60_000;

export const AUTH_RATE_LIMIT_MAX = 6;
export const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;

interface RateLimitBucket {
  count: number;
  resetAtMs: number;
}

const MAX_TRACKED_KEYS = 2_000;
const rateLimitStore = new Map<string, RateLimitBucket>();

function pruneExpiredBuckets(nowMs: number): void {
  if (rateLimitStore.size < MAX_TRACKED_KEYS) {
    return;
  }
  rateLimitStore.forEach((bucket, key) => {
    if (bucket.resetAtMs <= nowMs) {
      rateLimitStore.delete(key);
    }
  });
}

/**
 * Check if Redis REST rate limiting is configured via environment variables.
 */
export function isRedisRateLimitConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return Boolean(url && token && !/^(placeholder|todo|changeme)/i.test(url));
}

/**
 * Extract the client IP address from standard reverse-proxy headers.
 */
export function getClientIp(request: NextRequest | Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp.slice(0, 64);
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp.slice(0, 64);
  }

  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtEpochSeconds: number;
  retryAfterSeconds: number;
  headers: Record<string, string>;
  backend: "memory" | "redis";
}

/**
 * Synchronous in-memory rate limiter evaluation.
 */
export function checkRateLimit(
  request: NextRequest | Request,
  scope: string,
  maxRequests: number = WRITE_RATE_LIMIT_MAX,
  windowMs: number = WRITE_RATE_LIMIT_WINDOW_MS
): RateLimitResult {
  const nowMs = Date.now();
  pruneExpiredBuckets(nowMs);

  const clientIp = getClientIp(request);
  const key = `${scope}:${clientIp}`;

  let bucket = rateLimitStore.get(key);
  if (!bucket || bucket.resetAtMs <= nowMs) {
    bucket = {
      count: 0,
      resetAtMs: nowMs + windowMs,
    };
  }

  bucket.count += 1;
  rateLimitStore.set(key, bucket);

  const allowed = bucket.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - bucket.count);
  const resetAtEpochSeconds = Math.ceil(bucket.resetAtMs / 1000);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAtMs - nowMs) / 1000)
  );

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(maxRequests),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetAtEpochSeconds),
  };

  if (!allowed) {
    headers["Retry-After"] = String(retryAfterSeconds);
  }

  return {
    allowed,
    limit: maxRequests,
    remaining,
    resetAtEpochSeconds,
    retryAfterSeconds,
    headers,
    backend: "memory",
  };
}

/**
 * Optional asynchronous Redis-backed rate limiter (Upstash REST API).
 * If Redis is not configured or an error occurs, falls back gracefully to in-memory rate limiting.
 * NOTE: Untested in this VM because no live Redis/Upstash instance is available.
 */
export async function checkRateLimitAsync(
  request: NextRequest | Request,
  scope: string,
  maxRequests: number = WRITE_RATE_LIMIT_MAX,
  windowMs: number = WRITE_RATE_LIMIT_WINDOW_MS
): Promise<RateLimitResult> {
  if (!isRedisRateLimitConfigured()) {
    return checkRateLimit(request, scope, maxRequests, windowMs);
  }

  const url = process.env.UPSTASH_REDIS_REST_URL!.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();
  const clientIp = getClientIp(request);
  const key = `ratelimit:${scope}:${clientIp}`;
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    // Pipeline INCR + EXPIRE via Upstash REST API
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec, "NX"],
        ["TTL", key],
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Upstash REST rate-limit failed with status ${response.status}`);
    }

    const results = (await response.json()) as Array<{ result: unknown }>;
    const currentCount = Number(results[0]?.result ?? 1);
    const ttlSeconds = Math.max(1, Number(results[2]?.result ?? windowSec));
    const nowSec = Math.floor(Date.now() / 1000);
    const resetAtEpochSeconds = nowSec + ttlSeconds;

    const allowed = currentCount <= maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);

    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(maxRequests),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(resetAtEpochSeconds),
    };

    if (!allowed) {
      headers["Retry-After"] = String(ttlSeconds);
    }

    return {
      allowed,
      limit: maxRequests,
      remaining,
      resetAtEpochSeconds,
      retryAfterSeconds: ttlSeconds,
      headers,
      backend: "redis",
    };
  } catch (error) {
    console.error("[RateLimit] Redis rate limit error, falling back to memory:", error);
    return checkRateLimit(request, scope, maxRequests, windowMs);
  }
}
