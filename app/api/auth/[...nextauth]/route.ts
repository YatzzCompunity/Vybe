import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS, checkRateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

type Ctx = { params: { nextauth: string[] } };

/** Strict per-IP rate limit on credential sign-in attempts; everything else passes through. */
export async function POST(request: NextRequest, ctx: Ctx) {
  if (ctx.params.nextauth.join("/") === "callback/credentials") {
    const rl = checkRateLimit(request, "auth:login", AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: { code: "RATE_LIMITED", message: "Too many login attempts. Try again later." } }),
        { status: 429, headers: { "Content-Type": "application/json", ...rl.headers } }
      );
    }
  }
  return handler(request, ctx);
}

export const GET = handler as unknown as (request: NextRequest, ctx: Ctx) => Promise<Response>;
