import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Protects authenticated pages: unauthenticated visitors are redirected to /login.
 * Role checks: /admin routes require STAFF (EDITOR or ADMIN); /admin/users requires ADMIN.
 * API routes enforce their own 401/403 JSON responses.
 * Server components and API endpoints re-verify permissions against the database.
 */
export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const role = req.nextauth.token?.role as string | undefined;

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      const securityHeaders = {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      };
      if (role !== "ADMIN" && role !== "EDITOR") {
        return new NextResponse("Forbidden: Staff access required", {
          status: 403,
          headers: securityHeaders,
        });
      }
      if (pathname.startsWith("/admin/users") && role !== "ADMIN") {
        return new NextResponse("Forbidden: Admin access required", {
          status: 403,
          headers: securityHeaders,
        });
      }
    }
  },
  {
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/profile/:path*", "/admin", "/admin/:path*"],
};

