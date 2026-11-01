import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import prisma from "@/lib/db";

/**
 * Google OAuth is enabled ONLY when both env vars hold real-looking values.
 * TODO: supply real GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET from Google Cloud Console.
 */
export function isGoogleConfigured(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return Boolean(id && secret && !/^(todo|changeme|your-|placeholder)/i.test(id));
}

/** Lazily computed valid hash used to equalise timing when the email does not exist. */
let dummyHash: string | null = null;
function getDummyHash(): string {
  if (!dummyHash) dummyHash = bcrypt.hashSync("vybe-timing-equaliser", 12);
  return dummyHash;
}

/**
 * Retrieves and validates the NextAuth secret.
 * Enforces strict cryptographic security in production:
 * - Must be defined and at least 32 characters long.
 * - Must not match known placeholders ("replace-with...", "changeme", etc.).
 * - Fails loudly to prevent running production with insecure or default keys.
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  const isProd = process.env.NODE_ENV === "production";
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  const isPlaceholder = !secret || /^(replace-|todo|changeme|your-|placeholder|default|secret)/i.test(secret);

  if (isProd && !isBuildPhase) {
    if (isPlaceholder || secret.length < 32) {
      throw new Error(
        "[SECURITY FATAL] In production, NEXTAUTH_SECRET (or AUTH_SECRET) must be set to a cryptographically secure random string of at least 32 characters. Do not use default or placeholder secrets. Generate one with `openssl rand -base64 32`."
      );
    }
  }

  if (isBuildPhase && isPlaceholder) {
    return "build-phase-temporary-auth-secret-min-32-chars-long";
  }

  return secret || "vybe-local-dev-fallback-secret-minimum-32-chars";
}

const nextAuthUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
const isHttps = nextAuthUrl.startsWith("https://");
const isProduction = process.env.NODE_ENV === "production";
const useSecureCookies = isHttps || (isProduction && process.env.COOKIE_SECURE === "true");

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: useSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: useSecureCookies ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: useSecureCookies ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password || password.length > 128) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        const hash = user?.passwordHash ?? getDummyHash();
        const ok = await bcrypt.compare(password, hash);
        if (!user || !user.passwordHash || !ok || !user.isActive) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          image: user.avatarUrl,
          role: user.role,
        };
      },
    }),
    ...(isGoogleConfigured()
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") return true;
      // Only verified Google emails are linked/created. New users default to READER.
      const email = profile?.email?.toLowerCase();
      const verified = (profile as { email_verified?: boolean } | undefined)
        ?.email_verified;
      if (!email || !verified) return false;
      let dbUser = await prisma.user.findUnique({ where: { email } });
      if (dbUser && !dbUser.isActive) return false;
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            email,
            displayName: (profile?.name ?? email.split("@")[0]).slice(0, 80),
            emailVerifiedAt: new Date(),
          },
        });
      }
      user.id = dbUser.id;
      (user as { role?: Role }).role = dbUser.role;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: Role }).role ?? "READER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = (token.role as Role) ?? "READER";
      }
      return session;
    },
  },
};
