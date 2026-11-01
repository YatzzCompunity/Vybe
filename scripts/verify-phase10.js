/**
 * ============================================================================
 * VYBE Phase 10 Verification Suite — Security Hardening & Audit
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { encode } = require("next-auth/jwt");

// Load local environment variables from .env
if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";
const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

async function createSessionCookie(user) {
  const token = await encode({
    token: {
      uid: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.displayName,
    },
    secret: AUTH_SECRET,
  });
  return `next-auth.session-token=${token}`;
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Origin: BASE_URL,
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  let body = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  } else {
    body = await res.text();
  }
  return { status: res.status, headers: res.headers, body };
}

async function run() {
  console.log("\n=======================================================");
  console.log("  PHASE 10: SECURITY HARDENING & AUDIT VERIFICATION");
  console.log("=======================================================\n");

  // --------------------------------------------------------------------------
  // Test 1: Security Headers on Homepage and API responses
  // --------------------------------------------------------------------------
  console.log("[Test 1] Security Headers Audit");

  const homeRes = await fetch(`${BASE_URL}/`);
  assert(homeRes.status === 200, "Homepage responds with 200 OK");
  assert(homeRes.headers.get("x-content-type-options") === "nosniff", "Homepage has X-Content-Type-Options: nosniff");
  assert(homeRes.headers.get("x-frame-options") === "DENY", "Homepage has X-Frame-Options: DENY");
  assert(homeRes.headers.get("referrer-policy") === "strict-origin-when-cross-origin", "Homepage has Referrer-Policy");
  assert(homeRes.headers.get("strict-transport-security")?.includes("max-age="), "Homepage has Strict-Transport-Security (HSTS)");
  assert(homeRes.headers.get("permissions-policy")?.includes("camera=()"), "Homepage has Permissions-Policy");

  const csp = homeRes.headers.get("content-security-policy") || "";
  assert(csp.includes("default-src 'self'"), "CSP specifies default-src 'self'");
  assert(csp.includes("frame-ancestors 'none'"), "CSP specifies frame-ancestors 'none'");
  assert(csp.includes("object-src 'none'"), "CSP specifies object-src 'none'");
  assert(homeRes.headers.get("cross-origin-opener-policy") === "same-origin-allow-popups", "Homepage has Cross-Origin-Opener-Policy");

  const apiRes = await apiRequest("/api/v1/articles");
  assert(apiRes.status === 200, "Public API /api/v1/articles responds with 200 OK");
  assert(apiRes.headers.get("x-content-type-options") === "nosniff", "API has X-Content-Type-Options: nosniff");
  assert(apiRes.headers.get("x-frame-options") === "DENY", "API has X-Frame-Options: DENY");

  // --------------------------------------------------------------------------
  // Test 2: Auth Hardening & Email Anti-Enumeration on Register
  // --------------------------------------------------------------------------
  console.log("\n[Test 2] Registration Email Anti-Enumeration & Payload Leak Audit");

  const testEmail = `sec-test-${Date.now()}@vybe.local`;
  const reg1 = await apiRequest("/api/v1/auth/register", {
    method: "POST",
    headers: { "X-Forwarded-For": "203.0.113.1" },
    body: JSON.stringify({ email: testEmail, password: "StrongPassword123!", displayName: "Sec Test User" }),
  });

  assert(reg1.status === 201, `First registration of new email returns 201 Created (got ${reg1.status})`);
  assert(reg1.body?.data?.message?.includes("If this email is not already registered"), "Registration returns generic anti-enumeration success message");
  assert(reg1.body?.data?.email === testEmail, "Registration returns email in payload");
  assert(!reg1.body?.data?.passwordHash, "No passwordHash returned on registration");
  assert(!reg1.body?.data?.id, "No internal database user ID leaked on registration");

  // Duplicate registration attempt with identical email
  const startDuplicate = Date.now();
  const reg2 = await apiRequest("/api/v1/auth/register", {
    method: "POST",
    headers: { "X-Forwarded-For": "203.0.113.2" },
    body: JSON.stringify({ email: testEmail, password: "DifferentPassword456!", displayName: "Another Name" }),
  });
  const duplicateDurationMs = Date.now() - startDuplicate;

  assert(reg2.status === 201, `Duplicate registration returns identical status code 201 Created (got ${reg2.status})`);
  assert(reg2.body?.data?.message === reg1.body?.data?.message, "Duplicate registration returns exact same generic message");
  assert(duplicateDurationMs >= 40, `Duplicate registration executes dummy bcrypt hash to equalise timing (took ${duplicateDurationMs}ms)`);
  assert(!reg2.body?.data?.passwordHash, "No passwordHash returned on duplicate registration");

  // --------------------------------------------------------------------------
  // Test 3: Password Policy Enforcement
  // --------------------------------------------------------------------------
  console.log("\n[Test 3] Password Policy Enforcement");

  const shortPwdRes = await apiRequest("/api/v1/auth/register", {
    method: "POST",
    headers: { "X-Forwarded-For": "203.0.113.3" },
    body: JSON.stringify({ email: "short@vybe.local", password: "short", displayName: "Short User" }),
  });
  assert(shortPwdRes.status === 400, "Password shorter than 8 chars is rejected with 400 Bad Request");

  const longPwd = "A".repeat(129);
  const longPwdRes = await apiRequest("/api/v1/auth/register", {
    method: "POST",
    headers: { "X-Forwarded-For": "203.0.113.4" },
    body: JSON.stringify({ email: "long@vybe.local", password: longPwd, displayName: "Long User" }),
  });
  assert(longPwdRes.status === 400, "Password longer than 128 chars is rejected with 400 Bad Request");

  // --------------------------------------------------------------------------
  // Test 4: Rate Limiting Enforcement (Auth Endpoints)
  // --------------------------------------------------------------------------
  console.log("\n[Test 4] Rate Limiting Enforcement");

  const rateLimitIp = "198.51.100.42";
  let got429 = false;
  let retryAfterHeader = null;

  for (let i = 0; i < 7; i++) {
    const res = await apiRequest("/api/v1/auth/register", {
      method: "POST",
      headers: { "X-Forwarded-For": rateLimitIp },
      body: JSON.stringify({ email: `burst-${i}@vybe.local`, password: "StrongPassword123!", displayName: `User ${i}` }),
    });
    if (res.status === 429) {
      got429 = true;
      retryAfterHeader = res.headers.get("retry-after");
      break;
    }
  }
  assert(got429, "Auth rate limit kicks in after burst requests (returns 429 Too Many Requests)");
  assert(Boolean(retryAfterHeader), `Rate limit response includes Retry-After header (${retryAfterHeader}s)`);

  // Forgot password endpoint rate limit and anti-enumeration
  const forgotRes = await apiRequest("/api/v1/auth/forgot-password", {
    method: "POST",
    headers: { "X-Forwarded-For": "203.0.113.10" },
    body: JSON.stringify({ email: "nonexistent-user@vybe.local" }),
  });
  assert(forgotRes.status === 200, "Forgot password returns 200 OK");
  assert(forgotRes.body?.data?.message?.includes("instructions will be sent"), "Forgot password returns generic message for non-existent email");

  // --------------------------------------------------------------------------
  // Test 5: CSRF Origin Verification
  // --------------------------------------------------------------------------
  console.log("\n[Test 5] CSRF Origin Verification");

  const csrfBlockedRes = await apiRequest("/api/v1/newsletter/subscribe", {
    method: "POST",
    headers: {
      Origin: "https://evil-attacker-website.com",
      "X-Forwarded-For": "203.0.113.20",
    },
    body: JSON.stringify({ email: "csrf-test@example.com" }),
  });
  assert(csrfBlockedRes.status === 403, `Cross-origin mutation request is rejected with 403 Forbidden (got ${csrfBlockedRes.status})`);

  const csrfValidRes = await apiRequest("/api/v1/newsletter/subscribe", {
    method: "POST",
    headers: {
      Origin: BASE_URL,
      "X-Forwarded-For": "203.0.113.21",
    },
    body: JSON.stringify({ email: "csrf-legit@example.com" }),
  });
  assert(csrfValidRes.status === 200, `Same-origin mutation request is allowed (got ${csrfValidRes.status})`);

  // --------------------------------------------------------------------------
  // Test 6: Role Guards & Unauthenticated Access
  // --------------------------------------------------------------------------
  console.log("\n[Test 6] Admin Role Guards & Unauthorized Access");

  const unauthAdminRes = await apiRequest("/api/v1/admin/articles");
  assert(unauthAdminRes.status === 401, `Unauthenticated request to /api/v1/admin/articles returns 401 Unauthorized (got ${unauthAdminRes.status})`);

  // Create temporary READER user
  const readerUser = await prisma.user.create({
    data: {
      email: "temp-reader@vybe.local",
      displayName: "Temporary Reader",
      role: "READER",
      isActive: true,
    },
  });
  const readerCookie = await createSessionCookie(readerUser);

  const readerAdminRes = await apiRequest("/api/v1/admin/articles", {
    headers: { Cookie: readerCookie },
  });
  assert(readerAdminRes.status === 403, `READER accessing /api/v1/admin/articles returns 403 Forbidden (got ${readerAdminRes.status})`);

  // Create temporary EDITOR user
  const editorUser = await prisma.user.create({
    data: {
      email: "temp-editor@vybe.local",
      displayName: "Temporary Editor",
      role: "EDITOR",
      isActive: true,
    },
  });
  const editorCookie = await createSessionCookie(editorUser);

  const editorUserMgmtRes = await apiRequest("/api/v1/admin/users", {
    headers: { Cookie: editorCookie },
  });
  assert(editorUserMgmtRes.status === 403, `EDITOR accessing ADMIN-only /api/v1/admin/users returns 403 Forbidden (got ${editorUserMgmtRes.status})`);

  // Create temporary ADMIN user
  const adminUser = await prisma.user.create({
    data: {
      email: "temp-admin@vybe.local",
      displayName: "Temporary Admin",
      role: "ADMIN",
      isActive: true,
    },
  });
  const adminCookie = await createSessionCookie(adminUser);

  const adminAccessRes = await apiRequest("/api/v1/admin/articles", {
    headers: { Cookie: adminCookie },
  });
  assert(adminAccessRes.status === 200, `ADMIN accessing /api/v1/admin/articles succeeds with 200 OK (got ${adminAccessRes.status})`);

  // --------------------------------------------------------------------------
  // Test 7: Secret & Hash Leakage Audit in API Responses
  // --------------------------------------------------------------------------
  console.log("\n[Test 7] Secret / Hash / Token Leakage Audit");

  const meRes = await apiRequest("/api/v1/me", {
    headers: { Cookie: readerCookie },
  });
  assert(meRes.status === 200, "GET /api/v1/me responds with 200 OK");
  const meBodyStr = JSON.stringify(meRes.body);
  assert(!meBodyStr.includes("passwordHash"), "No passwordHash in /api/v1/me response");
  assert(!meBodyStr.includes("resetTokenHash"), "No resetTokenHash in /api/v1/me response");

  const adminUsersRes = await apiRequest("/api/v1/admin/users", {
    headers: { Cookie: adminCookie },
  });
  assert(adminUsersRes.status === 200, "GET /api/v1/admin/users responds with 200 OK");
  const adminUsersStr = JSON.stringify(adminUsersRes.body);
  assert(!adminUsersStr.includes("passwordHash"), "No passwordHash in /api/v1/admin/users response");
  assert(!adminUsersStr.includes("resetTokenHash"), "No resetTokenHash in /api/v1/admin/users response");

  // --------------------------------------------------------------------------
  // Test 8: Draft Invisibility & Publication State Isolation
  // --------------------------------------------------------------------------
  console.log("\n[Test 8] Draft Invisibility & Editorial Isolation");

  const author = await prisma.author.findFirst();
  const category = await prisma.category.findFirst();

  const draftSlug = `sec-draft-invis-${Date.now()}`;
  const draftArticle = await prisma.article.create({
    data: {
      slug: draftSlug,
      title: "Secret Unreleased Investigation: Behind the Scenes",
      excerpt: "This is confidential editorial material.",
      bodyMarkdown: "Confidential investigative report content.",
      status: "DRAFT",
      authorId: author.id,
      categoryId: category.id,
    },
  });

  const publicList = await apiRequest("/api/v1/articles");
  const slugsInList = (publicList.body?.data || []).map((a) => a.slug);
  assert(!slugsInList.includes(draftSlug), "Draft article does NOT appear in public article list");

  const draftDetailRes = await apiRequest(`/api/v1/articles/${draftSlug}`);
  assert(draftDetailRes.status === 404, `Public API detail request for draft article returns 404 Not Found (got ${draftDetailRes.status})`);

  // Clean up draft
  await prisma.article.delete({ where: { id: draftArticle.id } });

  // --------------------------------------------------------------------------
  // Test 9: Database Cleanup & Seed State Verification
  // --------------------------------------------------------------------------
  console.log("\n[Test 9] Database Cleanup & Seed State Verification");

  // Remove all test users created in this suite
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          testEmail,
          "temp-reader@vybe.local",
          "temp-editor@vybe.local",
          "temp-admin@vybe.local",
        ],
      },
    },
  });

  // Also remove burst users if any were inserted
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: "burst-",
      },
    },
  });

  // Remove test newsletter subscribers created in suite
  await prisma.newsletterSubscriber.deleteMany({
    where: {
      email: {
        in: ["csrf-test@example.com", "csrf-legit@example.com"],
      },
    },
  });

  const articleCount = await prisma.article.count();
  const userCount = await prisma.user.count();
  const commentCount = await prisma.comment.count();
  const bookmarkCount = await prisma.bookmark.count();

  console.log(`  Current DB counts: Articles=${articleCount}, Users=${userCount}, Comments=${commentCount}, Bookmarks=${bookmarkCount}`);

  assert(articleCount === 9, `Article count returned to seed state (expected 9, got ${articleCount})`);
  assert(userCount === 0, `User count returned to seed state (expected 0, got ${userCount})`);
  assert(commentCount === 0, `Comment count returned to seed state (expected 0, got ${commentCount})`);
  assert(bookmarkCount === 0, `Bookmark count returned to seed state (expected 0, got ${bookmarkCount})`);

  console.log("\n=======================================================");
  console.log(`  VERIFICATION COMPLETE: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("=======================================================\n");

  await prisma.$disconnect();
  if (testsFailed > 0) {
    process.exit(1);
  }
}

run().catch(async (e) => {
  console.error("FATAL in verification runner:", e);
  await prisma.$disconnect();
  process.exit(1);
});
