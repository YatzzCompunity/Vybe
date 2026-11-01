import { getServerSession } from "next-auth";
import type { Role, User } from "@prisma/client";
import prisma from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { ApiValidationError } from "@/lib/api/response";

const ROLE_RANK: Record<Role, number> = {
  READER: 0,
  AUTHOR: 1,
  EDITOR: 2,
  ADMIN: 3,
};

/**
 * Resolve the signed-in user from the session cookie and RE-LOAD it from the DB,
 * so deactivated users and role changes take effect immediately (JWT alone is stale).
 */
export async function getSessionUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  return user && user.isActive ? user : null;
}

/** Throws a 401 ApiValidationError (rendered by handleApiError) when unauthenticated. */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiValidationError("Authentication required.", {
      status: 401,
      code: "UNAUTHORIZED",
    });
  }
  return user;
}

/** Role guard: user must have at least `minRole` (READER < AUTHOR < EDITOR < ADMIN). */
export async function requireRole(minRole: Role): Promise<User> {
  const user = await requireUser();
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    throw new ApiValidationError("You do not have permission to do this.", {
      status: 403,
      code: "FORBIDDEN",
    });
  }
  return user;
}

/**
 * CSRF defense-in-depth: verifies that the `Origin` header matches the request host.
 * Modern browsers automatically attach the `Origin` header on cross-origin POST/PATCH/DELETE requests.
 * If an `Origin` header is present and does not match the target host, the request is rejected with 403 Forbidden.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // Non-browser / same-origin without Origin header
  const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
  if (!host) return;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== host) {
      throw new ApiValidationError("Cross-origin request blocked (CSRF mitigation).", {
        status: 403,
        code: "FORBIDDEN",
      });
    }
  } catch (err) {
    if (err instanceof ApiValidationError) throw err;
    throw new ApiValidationError("Invalid Origin header.", {
      status: 400,
      code: "BAD_REQUEST",
    });
  }
}

/** Per-IP rate limit and CSRF origin verification; throws 429 ApiValidationError when exceeded or 403 on CSRF. */
export function enforceRateLimit(
  request: Request,
  scope: string,
  max: number,
  windowMs: number
): void {
  assertSameOrigin(request);
  const rl = checkRateLimit(request, scope, max, windowMs);
  if (!rl.allowed) {
    throw new ApiValidationError("Too many requests. Please try again later.", {
      status: 429,
      code: "RATE_LIMITED",
      details: { retryAfterSeconds: rl.retryAfterSeconds },
      headers: rl.headers,
    });
  }
}
