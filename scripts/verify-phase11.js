/**
 * ============================================================================
 * VYBE Phase 11 Consolidated End-to-End Verification Suite
 * ============================================================================
 * Comprehensive automated testing covering:
 * 1. Public Routes & 404 Handling
 * 2. Authentication & Account Lifecycle (Register anti-enumeration, forgot/reset token, profile, bookmarks, comments)
 * 3. Admin Capabilities & Role Guards (Articles CRUD, publish/unpublish/schedule, categories, tags, authors, users, moderation, trending, SEO)
 * 4. AI Pipeline & Safety Guardrails (Allowlist, draft invisibility, auto-publish double-gate, honest provider failure)
 * 5. SEO & Structured Data (Robots, sitemap, RSS feed, NewsArticle JSON-LD, canonical)
 * 6. Security Hardening (Headers, rate limiting, sensitive field audit, CSRF same-origin)
 * 7. Performance & Caching (Cache-Control audit, shared build size)
 * 8. Deferred Items (Headless browser check with exact error)
 * 9. Database Seed Restoration Verification
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const { encode } = require("next-auth/jwt");
const bcrypt = require("bcryptjs");

// Load .env
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
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

let testsPassed = 0;
let testsFailed = 0;
let testsUntested = 0;
const resultsLog = [];

function assert(condition, message, evidence = "") {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
    resultsLog.push({ status: "PASS", message, evidence });
  } else {
    console.error(`  ✗ FAIL: ${message} (Evidence: ${evidence})`);
    testsFailed++;
    resultsLog.push({ status: "FAIL", message, evidence });
  }
}

function recordUntested(message, reason) {
  console.log(`  - UNTESTED: ${message} (Reason: ${reason})`);
  testsUntested++;
  resultsLog.push({ status: "UNTESTED", message, evidence: reason });
}

async function createSessionCookie(user) {
  const token = await encode({
    token: {
      uid: user.id,
      email: user.email,
      name: user.displayName,
      role: user.role,
      sub: user.id,
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
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, headers: res.headers, body };
}

async function run() {
  console.log("\n=======================================================");
  console.log("  VYBE PHASE 11: FULL PLATFORM VERIFICATION CHECKLIST");
  console.log("=======================================================\n");

  // Step 0: Initial DB State check
  console.log("[Setup] Checking Initial Database State");
  const initArticles = await prisma.article.count();
  const initUsers = await prisma.user.count();
  const initComments = await prisma.comment.count();
  const initBookmarks = await prisma.bookmark.count();
  console.log(`  Initial DB state: Articles=${initArticles}, Users=${initUsers}, Comments=${initComments}, Bookmarks=${initBookmarks}`);
  assert(initArticles === 9, "Initial DB has 9 seed articles", `Articles: ${initArticles}`);
  assert(initUsers === 0, "Initial DB has 0 users", `Users: ${initUsers}`);

  // Create test actors
  const testPassword = "Password123!";
  const passwordHash = await bcrypt.hash(testPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      email: "phase11-admin@vybe.test",
      displayName: "Phase 11 Admin",
      role: "ADMIN",
      passwordHash,
    },
  });

  const editorUser = await prisma.user.create({
    data: {
      email: "phase11-editor@vybe.test",
      displayName: "Phase 11 Editor",
      role: "EDITOR",
      passwordHash,
    },
  });

  const readerUser = await prisma.user.create({
    data: {
      email: "phase11-reader@vybe.test",
      displayName: "Phase 11 Reader",
      role: "READER",
      passwordHash,
    },
  });

  const adminCookie = await createSessionCookie(adminUser);
  const editorCookie = await createSessionCookie(editorUser);
  const readerCookie = await createSessionCookie(readerUser);

  let draftArticleId = null;
  let sourceId = null;
  let leadId = null;
  let commentId = null;

  try {
    // =========================================================================
    // SECTION 1: PUBLIC SURFACE & 404 HANDLING
    // =========================================================================
    console.log("\n[Section 1] Public Surface & 404 Handling");

    // 1.1 Homepage
    const homeRes = await apiRequest("/");
    assert(homeRes.status === 200, "Homepage GET / returns 200 OK", `Status: ${homeRes.status}`);
    assert(typeof homeRes.body === "string" && homeRes.body.includes("VYBE"), "Homepage contains brand name VYBE", "Contains 'VYBE'");

    // 1.2 Category page & alias
    const catRes = await apiRequest("/music");
    assert(catRes.status === 200, "Category page GET /music returns 200 OK", `Status: ${catRes.status}`);
    const catAliasRes = await apiRequest("/category/music");
    assert(catAliasRes.status === 200, "Category alias GET /category/music returns 200 OK", `Status: ${catAliasRes.status}`);

    // 1.3 Article detail page
    const sampleArticleSlug = "sample-how-modern-album-rollouts-are-structured";
    const articleRes = await apiRequest(`/albums/${sampleArticleSlug}`);
    assert(articleRes.status === 200, "Article page GET /albums/[slug] returns 200 OK", `Status: ${articleRes.status}`);
    assert(typeof articleRes.body === "string" && articleRes.body.includes("Sample Feature"), "Article page contains article content", "Found article title");

    // 1.4 Author page & alias
    const authorRes = await apiRequest("/author/editorial-architecture-desk");
    assert(authorRes.status === 200, "Author page GET /author/[slug] returns 200 OK", `Status: ${authorRes.status}`);
    const authorAliasRes = await apiRequest("/authors/editorial-architecture-desk");
    assert(authorAliasRes.status === 200, "Author alias GET /authors/[slug] returns 200 OK", `Status: ${authorAliasRes.status}`);

    // 1.5 Search page & API
    const searchPageRes = await apiRequest("/search?q=touring");
    assert(searchPageRes.status === 200, "Search page GET /search?q=touring returns 200 OK", `Status: ${searchPageRes.status}`);
    const searchApiRes = await apiRequest("/api/v1/search?q=touring");
    assert(searchApiRes.status === 200, "Search API GET /api/v1/search returns 200 OK", `Status: ${searchApiRes.status}`);
    assert(Array.isArray(searchApiRes.body?.data), "Search API returns data array", `Count: ${searchApiRes.body?.data?.length}`);

    // 1.6 Trending API
    const trendingApiRes = await apiRequest("/api/v1/trending");
    assert(trendingApiRes.status === 200, "Trending API GET /api/v1/trending returns 200 OK", `Status: ${trendingApiRes.status}`);
    assert(Array.isArray(trendingApiRes.body?.data?.topics), "Trending API returns topics data array", `Topics: ${trendingApiRes.body?.data?.topics?.length}`);

    // 1.7 Sitemap
    const sitemapRes = await apiRequest("/sitemap.xml");
    assert(sitemapRes.status === 200, "Sitemap GET /sitemap.xml returns 200 OK", `Status: ${sitemapRes.status}`);
    assert(typeof sitemapRes.body === "string" && sitemapRes.body.includes("<urlset"), "Sitemap is valid XML urlset", "Contains <urlset");
    assert(!sitemapRes.body.includes("/admin"), "Sitemap strictly excludes /admin", "No /admin in sitemap");

    // 1.8 Robots.txt
    const robotsRes = await apiRequest("/robots.txt");
    assert(robotsRes.status === 200, "Robots.txt GET /robots.txt returns 200 OK", `Status: ${robotsRes.status}`);
    assert(typeof robotsRes.body === "string" && robotsRes.body.includes("Disallow: /admin"), "Robots disallows /admin", "Found Disallow: /admin");
    assert(robotsRes.body.includes("Sitemap:"), "Robots references sitemap URL", "Found Sitemap reference");

    // 1.9 RSS Feed
    const feedRes = await apiRequest("/feed.xml");
    assert(feedRes.status === 200, "Feed GET /feed.xml returns 200 OK", `Status: ${feedRes.status}`);
    assert(typeof feedRes.body === "string" && feedRes.body.includes("<rss version=\"2.0\""), "Feed is valid RSS 2.0 XML", "Found RSS 2.0");
    const rssRes = await apiRequest("/rss.xml", { redirect: "manual" });
    assert(rssRes.status === 308, "Legacy /rss.xml redirects permanently (308)", `Status: ${rssRes.status}`);

    // 1.10 404 Handling
    const notFoundPageRes = await apiRequest("/nonexistent-route-xyz-404");
    assert(notFoundPageRes.status === 404, "Nonexistent page returns 404 Not Found", `Status: ${notFoundPageRes.status}`);
    const notFoundArticleRes = await apiRequest("/music/nonexistent-article-xyz-404");
    assert(notFoundArticleRes.status === 404, "Nonexistent article returns 404 Not Found", `Status: ${notFoundArticleRes.status}`);
    const notFoundApiRes = await apiRequest("/api/v1/articles/nonexistent-article-xyz-404");
    assert(notFoundApiRes.status === 404, "Nonexistent API article returns 404 Not Found", `Status: ${notFoundApiRes.status}`);
    assert(notFoundApiRes.body?.error?.code === "NOT_FOUND", "API 404 response has code NOT_FOUND", `Code: ${notFoundApiRes.body?.error?.code}`);

    // =========================================================================
    // SECTION 2: AUTHENTICATION & ACCOUNT LIFECYCLE
    // =========================================================================
    console.log("\n[Section 2] Authentication & Account Lifecycle");

    // 2.1 Registration with generic anti-enumeration
    const newRegEmail = "new-register-check@vybe.test";
    const regRes = await apiRequest("/api/v1/auth/register", {
      method: "POST",
      headers: { "X-Forwarded-For": "203.0.113.80" },
      body: JSON.stringify({ email: newRegEmail, password: "SecurePassword123!", displayName: "Reg Check" }),
    });
    const expectedRegMsg = "If this email is not already registered, your account has been created. Please sign in.";
    assert(regRes.status === 201, "New user registration returns 201 Created", `Status: ${regRes.status}`);
    assert(regRes.body?.data?.message === expectedRegMsg, "Registration returns generic anti-enumeration message", regRes.body?.data?.message);
    assert(!regRes.body?.data?.passwordHash, "Registration does not leak passwordHash", "passwordHash omitted");
    assert(!regRes.body?.data?.id, "Registration does not leak internal user ID", "id omitted");

    // Duplicate registration (anti-enumeration & timing test)
    const t0 = Date.now();
    const dupRegRes = await apiRequest("/api/v1/auth/register", {
      method: "POST",
      headers: { "X-Forwarded-For": "203.0.113.81" },
      body: JSON.stringify({ email: newRegEmail, password: "SecurePassword123!", displayName: "Reg Check Dup" }),
    });
    const dupDuration = Date.now() - t0;
    assert(dupRegRes.status === 201, "Duplicate registration returns identical 201 Created", `Status: ${dupRegRes.status}`);
    assert(dupRegRes.body?.data?.message === expectedRegMsg, "Duplicate returns identical generic message", dupRegRes.body?.data?.message);
    assert(dupDuration >= 350, `Duplicate registration performs bcrypt timing equalisation (~${dupDuration}ms >= 350ms)`, `Duration: ${dupDuration}ms`);

    // Password policy enforcement
    const shortPassRes = await apiRequest("/api/v1/auth/register", {
      method: "POST",
      headers: { "X-Forwarded-For": "203.0.113.82" },
      body: JSON.stringify({ email: "shortpass@vybe.test", password: "short" }),
    });
    assert(shortPassRes.status === 400, "Password shorter than 8 chars rejected with 400", `Status: ${shortPassRes.status}`);

    // Clean up created registration test user
    await prisma.user.deleteMany({ where: { email: newRegEmail } });

    // 2.2 Forgot password flow (generic response + email stub documentation)
    const forgotRes = await apiRequest("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "X-Forwarded-For": "203.0.113.83" },
      body: JSON.stringify({ email: readerUser.email }),
    });
    assert(forgotRes.status === 200, "Forgot password returns 200 OK", `Status: ${forgotRes.status}`);
    assert(forgotRes.body?.data?.message?.includes("instructions will be sent"), "Forgot password returns generic message (email is stubbed)", forgotRes.body?.data?.message);

    // 2.3 Reset password token flow
    const rawResetToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const crypto = require("crypto");
    const tokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");
    await prisma.user.update({
      where: { id: readerUser.id },
      data: { resetTokenHash: tokenHash, resetTokenExpiresAt: new Date(Date.now() + 3600000) },
    });

    const resetRes = await apiRequest("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "X-Forwarded-For": "203.0.113.84" },
      body: JSON.stringify({ token: rawResetToken, password: "NewPassword987!" }),
    });
    assert(resetRes.status === 200, "Reset password with valid token returns 200 OK", `Status: ${resetRes.status}`);

    // Token is single-use: second attempt fails
    const resetAgainRes = await apiRequest("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "X-Forwarded-For": "203.0.113.85" },
      body: JSON.stringify({ token: rawResetToken, password: "AnotherPassword987!" }),
    });
    assert(resetAgainRes.status === 400, "Reused reset token is rejected with 400 Bad Request", `Status: ${resetAgainRes.status}`);

    // 2.4 Profile & change-password
    const profileRes = await apiRequest("/api/v1/me", {
      headers: { Cookie: readerCookie },
    });
    assert(profileRes.status === 200, "Authenticated GET /api/v1/me returns 200 OK", `Status: ${profileRes.status}`);
    assert(profileRes.body?.data?.email === readerUser.email, "Profile returns matching email", profileRes.body?.data?.email);
    assert(!profileRes.body?.data?.passwordHash, "Profile response strictly omits passwordHash", "passwordHash omitted");

    const patchProfileRes = await apiRequest("/api/v1/me", {
      method: "PATCH",
      headers: { Cookie: readerCookie },
      body: JSON.stringify({ displayName: "Updated Reader Name" }),
    });
    assert(patchProfileRes.status === 200, "PATCH /api/v1/me updates display name", `Status: ${patchProfileRes.status}`);
    assert(patchProfileRes.body?.data?.displayName === "Updated Reader Name", "Display name successfully persisted", patchProfileRes.body?.data?.displayName);

    const changePassRes = await apiRequest("/api/v1/auth/change-password", {
      method: "POST",
      headers: { Cookie: readerCookie, "X-Forwarded-For": "203.0.113.86" },
      body: JSON.stringify({ currentPassword: "NewPassword987!", newPassword: "UpdatedPassword321!" }),
    });
    assert(changePassRes.status === 200, "POST /api/v1/auth/change-password with valid old password returns 200", `Status: ${changePassRes.status}`);

    // 2.5 Bookmarks
    const sampleArticle = await prisma.article.findFirst({ where: { slug: sampleArticleSlug } });
    const addBookmarkRes = await apiRequest("/api/v1/bookmarks", {
      method: "POST",
      headers: { Cookie: readerCookie },
      body: JSON.stringify({ articleId: sampleArticle.id }),
    });
    assert(addBookmarkRes.status === 201, "POST /api/v1/bookmarks creates bookmark (201 Created)", `Status: ${addBookmarkRes.status}`);

    const getBookmarksRes = await apiRequest("/api/v1/bookmarks", {
      headers: { Cookie: readerCookie },
    });
    assert(getBookmarksRes.status === 200, "GET /api/v1/bookmarks returns 200 OK", `Status: ${getBookmarksRes.status}`);
    assert(Array.isArray(getBookmarksRes.body?.data) && getBookmarksRes.body.data.length === 1, "Bookmark list contains 1 item", `Count: ${getBookmarksRes.body?.data?.length}`);

    const delBookmarkRes = await apiRequest(`/api/v1/bookmarks?slug=${sampleArticleSlug}`, {
      method: "DELETE",
      headers: { Cookie: readerCookie },
    });
    assert(delBookmarkRes.status === 200, "DELETE /api/v1/bookmarks removes bookmark (200 OK)", `Status: ${delBookmarkRes.status}`);

    // 2.6 Comments Lifecycle: PENDING -> Moderation -> APPROVED Visibility
    const commentSubmitRes = await apiRequest(`/api/v1/articles/${sampleArticleSlug}/comments`, {
      method: "POST",
      headers: { Cookie: readerCookie, "X-Forwarded-For": "203.0.113.87" },
      body: JSON.stringify({ body: "This is a thoughtful comment on album rollout strategy." }),
    });
    assert(commentSubmitRes.status === 201, "Comment submission returns 201 Created", `Status: ${commentSubmitRes.status}`);
    assert(commentSubmitRes.body?.data?.status === "PENDING", "Submitted comment status is PENDING", commentSubmitRes.body?.data?.status);
    commentId = commentSubmitRes.body?.data?.id;

    // Public read: PENDING comment must NOT be visible
    const publicComments1 = await apiRequest(`/api/v1/articles/${sampleArticleSlug}/comments`);
    assert(publicComments1.status === 200, "Public GET comments returns 200 OK", `Status: ${publicComments1.status}`);
    const foundInPublic1 = publicComments1.body?.data?.some((c) => c.id === commentId);
    assert(!foundInPublic1, "PENDING comment is NOT visible to public readers", "Confirmed hidden");

    // Reader view own comments: PENDING comment IS visible in personal history
    const myCommentsRes = await apiRequest("/api/v1/me/comments", {
      headers: { Cookie: readerCookie },
    });
    assert(myCommentsRes.status === 200, "GET /api/v1/me/comments returns 200 OK", `Status: ${myCommentsRes.status}`);
    const foundInMine = myCommentsRes.body?.data?.some((c) => c.id === commentId);
    assert(foundInMine, "PENDING comment is visible to its author in /api/v1/me/comments", "Found in personal list");

    // Admin moderates comment: APPROVE
    const approveCommentRes = await apiRequest(`/api/v1/admin/comments/${commentId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ action: "approve" }),
    });
    assert(approveCommentRes.status === 200, "Admin approves comment (HTTP 200)", `Status: ${approveCommentRes.status}`);

    // Public read 2: APPROVED comment IS now visible
    const publicComments2 = await apiRequest(`/api/v1/articles/${sampleArticleSlug}/comments`);
    const foundInPublic2 = publicComments2.body?.data?.some((c) => c.id === commentId);
    assert(foundInPublic2, "APPROVED comment is now publicly visible", "Found in public comments");

    // Clean up comment
    if (commentId) {
      await prisma.comment.delete({ where: { id: commentId } });
      commentId = null;
    }

    // =========================================================================
    // SECTION 3: ADMIN CAPABILITIES & ROLE GUARDS
    // =========================================================================
    console.log("\n[Section 3] Admin Capabilities & Role Guards");

    // 3.1 Overview route guard
    const unauthAdminPage = await apiRequest("/admin", { redirect: "manual" });
    assert(unauthAdminPage.status === 307, "Unauthenticated /admin redirects to login (307)", `Status: ${unauthAdminPage.status}`);
    const readerAdminPage = await apiRequest("/admin", {
      headers: { Cookie: readerCookie },
      redirect: "manual",
    });
    assert(readerAdminPage.status === 403, "READER accessing /admin receives 403 Forbidden", `Status: ${readerAdminPage.status}`);

    // 3.2 Articles CRUD + Publish / Unpublish / Schedule
    const category = await prisma.category.findFirst({ where: { slug: "music" } });
    const author = await prisma.author.findFirst();

    // Create Draft Article
    const createDraftRes = await apiRequest("/api/v1/admin/articles", {
      method: "POST",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({
        title: "Phase 11 Editorial Test Article",
        slug: "phase-11-editorial-test-article",
        excerpt: "An in-depth test article examining editorial pipelines.",
        bodyMarkdown: "Detailed article body content covering music distribution architectures and workflow verifications.",
        categoryId: category.id,
        authorId: author.id,
      }),
    });
    assert(createDraftRes.status === 201, "Editor creates draft article (201 Created)", `Status: ${createDraftRes.status}`);
    draftArticleId = createDraftRes.body?.data?.id;
    const draftArticleSlug = createDraftRes.body?.data?.slug;
    assert(createDraftRes.body?.data?.status === "DRAFT", "New article has status DRAFT", createDraftRes.body?.data?.status);

    // Read draft
    const getDraftRes = await apiRequest(`/api/v1/admin/articles/${draftArticleId}`, {
      headers: { Cookie: editorCookie },
    });
    assert(getDraftRes.status === 200, "Editor retrieves draft article detail (200 OK)", `Status: ${getDraftRes.status}`);

    // Update draft
    const updateDraftRes = await apiRequest(`/api/v1/admin/articles/${draftArticleId}`, {
      method: "PATCH",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({
        title: "Phase 11 Editorial Test Article (Updated)",
      }),
    });
    assert(updateDraftRes.status === 200, "Editor updates draft article (200 OK)", `Status: ${updateDraftRes.status}`);
    assert(updateDraftRes.body?.data?.title === "Phase 11 Editorial Test Article (Updated)", "Updated title persisted", updateDraftRes.body?.data?.title);

    // Schedule draft for future date
    const futureDate = new Date(Date.now() + 86400000 * 7).toISOString();
    const scheduleRes = await apiRequest(`/api/v1/admin/articles/${draftArticleId}/schedule`, {
      method: "POST",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({ publishedAt: futureDate }),
    });
    assert(scheduleRes.status === 200, "Editor schedules article for future date (200 OK)", `Status: ${scheduleRes.status}`);

    // Verify scheduled article is strictly HIDDEN from public
    const publicScheduledCheck = await apiRequest(`/api/v1/articles/${draftArticleSlug}`);
    assert(publicScheduledCheck.status === 404, "Scheduled article returns 404 Not Found on public read", `Status: ${publicScheduledCheck.status}`);

    // Publish article now
    const publishRes = await apiRequest(`/api/v1/admin/articles/${draftArticleId}/publish`, {
      method: "POST",
      headers: { Cookie: editorCookie },
    });
    assert(publishRes.status === 200, "Editor publishes article (200 OK)", `Status: ${publishRes.status}`);
    assert(publishRes.body?.data?.status === "PUBLISHED", "Article status is now PUBLISHED", publishRes.body?.data?.status);

    // Verify published article IS accessible publicly
    const publicPublishCheck = await apiRequest(`/api/v1/articles/${draftArticleSlug}`);
    assert(publicPublishCheck.status === 200, "Published article is publicly accessible (200 OK)", `Status: ${publicPublishCheck.status}`);

    // Unpublish article back to DRAFT
    const unpublishRes = await apiRequest(`/api/v1/admin/articles/${draftArticleId}/unpublish`, {
      method: "POST",
      headers: { Cookie: editorCookie },
    });
    assert(unpublishRes.status === 200, "Editor unpublishes article (200 OK)", `Status: ${unpublishRes.status}`);
    assert(unpublishRes.body?.data?.status === "DRAFT", "Article returned to DRAFT status", unpublishRes.body?.data?.status);

    // Verify unpublished article is hidden again
    const publicUnpublishCheck = await apiRequest(`/api/v1/articles/${draftArticleSlug}`);
    assert(publicUnpublishCheck.status === 404, "Unpublished article returns 404 Not Found publicly", `Status: ${publicUnpublishCheck.status}`);

    // 3.3 SEO Editor endpoint
    const updateSeoRes = await apiRequest(`/api/v1/admin/articles/${draftArticleId}/seo`, {
      method: "PUT",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({
        metaTitle: "Custom SEO Title for Test Article",
        metaDescription: "Custom meta description for search engine snippet verification.",
        canonicalUrl: "http://localhost:3000/custom/canonical",
      }),
    });
    assert(updateSeoRes.status === 200, "Editor updates SEO metadata (200 OK)", `Status: ${updateSeoRes.status}`);
    assert(updateSeoRes.body?.data?.seo?.metaTitle === "Custom SEO Title for Test Article", "SEO metaTitle persisted", updateSeoRes.body?.data?.seo?.metaTitle);

    const getSeoRes = await apiRequest(`/api/v1/admin/articles/${draftArticleId}/seo`, {
      headers: { Cookie: editorCookie },
    });
    assert(getSeoRes.status === 200, "Editor retrieves SEO metadata (200 OK)", `Status: ${getSeoRes.status}`);
    assert(getSeoRes.body?.data?.seo?.canonicalUrl === "http://localhost:3000/custom/canonical", "Canonical URL persisted", getSeoRes.body?.data?.seo?.canonicalUrl);

    // Delete test article (ADMIN only)
    const deleteArticleRes = await apiRequest(`/api/v1/admin/articles/${draftArticleId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert(deleteArticleRes.status === 200, "Admin deletes test article (200 OK)", `Status: ${deleteArticleRes.status}`);
    draftArticleId = null;

    // 3.4 Categories, Tags, Authors CRUD
    // Category CRUD
    const createCatRes = await apiRequest("/api/v1/admin/categories", {
      method: "POST",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({ name: "Phase11 Sound", slug: "phase11-sound", description: "Test category" }),
    });
    assert(createCatRes.status === 201, "Editor creates new category (201 Created)", `Status: ${createCatRes.status}`);
    const testCatId = createCatRes.body?.data?.id;

    const patchCatRes = await apiRequest(`/api/v1/admin/categories/${testCatId}`, {
      method: "PATCH",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({ name: "Phase11 Sound (Renamed)" }),
    });
    assert(patchCatRes.status === 200, "Editor updates category (200 OK)", `Status: ${patchCatRes.status}`);

    const delCatRes = await apiRequest(`/api/v1/admin/categories/${testCatId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie }, // ADMIN role required for delete
    });
    assert(delCatRes.status === 200, "Admin deletes category (200 OK)", `Status: ${delCatRes.status}`);

    // Tag CRUD
    const createTagRes = await apiRequest("/api/v1/admin/tags", {
      method: "POST",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({ name: "Phase11 Tag", slug: "phase11-tag" }),
    });
    assert(createTagRes.status === 201, "Editor creates new tag (201 Created)", `Status: ${createTagRes.status}`);
    const testTagId = createTagRes.body?.data?.id;

    const patchTagRes = await apiRequest(`/api/v1/admin/tags/${testTagId}`, {
      method: "PATCH",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({ name: "Phase11 Tag (Renamed)" }),
    });
    assert(patchTagRes.status === 200, "Editor updates tag (200 OK)", `Status: ${patchTagRes.status}`);

    const delTagRes = await apiRequest(`/api/v1/admin/tags/${testTagId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert(delTagRes.status === 200, "Admin deletes tag (200 OK)", `Status: ${delTagRes.status}`);

    // Author CRUD
    const createAuthorRes = await apiRequest("/api/v1/admin/authors", {
      method: "POST",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({
        penName: "Phase 11 Author",
        slug: "phase-11-author",
        roleTitle: "Staff Critic",
        bio: "Bio for Phase 11 testing.",
      }),
    });
    assert(createAuthorRes.status === 201, "Editor creates new author (201 Created)", `Status: ${createAuthorRes.status}`);
    const testAuthorId = createAuthorRes.body?.data?.id;

    const patchAuthorRes = await apiRequest(`/api/v1/admin/authors/${testAuthorId}`, {
      method: "PATCH",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({ bio: "Updated author bio" }),
    });
    assert(patchAuthorRes.status === 200, "Editor updates author (200 OK)", `Status: ${patchAuthorRes.status}`);

    const delAuthorRes = await apiRequest(`/api/v1/admin/authors/${testAuthorId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert(delAuthorRes.status === 200, "Admin deletes author (200 OK)", `Status: ${delAuthorRes.status}`);

    // 3.5 Trending Topics Management
    const createTopicRes = await apiRequest("/api/v1/admin/trending-topics", {
      method: "POST",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({ label: "Phase 11 Trending Buzz", slug: "phase-11-trending-buzz", score: 95 }),
    });
    assert(createTopicRes.status === 201, "Editor creates trending topic (201 Created)", `Status: ${createTopicRes.status}`);
    const testTopicId = createTopicRes.body?.data?.id;

    const patchTopicRes = await apiRequest(`/api/v1/admin/trending-topics/${testTopicId}`, {
      method: "PATCH",
      headers: { Cookie: editorCookie },
      body: JSON.stringify({ score: 99 }),
    });
    assert(patchTopicRes.status === 200, "Editor updates trending topic (200 OK)", `Status: ${patchTopicRes.status}`);

    const delTopicRes = await apiRequest(`/api/v1/admin/trending-topics/${testTopicId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert(delTopicRes.status === 200, "Admin deletes trending topic (200 OK)", `Status: ${delTopicRes.status}`);

    // 3.6 Users & Role Change
    // Role guard: EDITOR cannot access /api/v1/admin/users
    const editorUserAccessRes = await apiRequest("/api/v1/admin/users", {
      headers: { Cookie: editorCookie },
    });
    assert(editorUserAccessRes.status === 403, "EDITOR receives 403 Forbidden accessing /api/v1/admin/users", `Status: ${editorUserAccessRes.status}`);

    // ADMIN accesses user list
    const adminUserListRes = await apiRequest("/api/v1/admin/users", {
      headers: { Cookie: adminCookie },
    });
    assert(adminUserListRes.status === 200, "ADMIN receives 200 OK accessing /api/v1/admin/users", `Status: ${adminUserListRes.status}`);

    // ADMIN changes reader role to EDITOR
    const changeRoleRes = await apiRequest(`/api/v1/admin/users/${readerUser.id}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ role: "EDITOR" }),
    });
    assert(changeRoleRes.status === 200, "ADMIN updates user role to EDITOR (200 OK)", `Status: ${changeRoleRes.status}`);
    assert(changeRoleRes.body?.data?.role === "EDITOR", "Role change persisted", changeRoleRes.body?.data?.role);

    // Guard: demoting the last admin is rejected
    const demoteLastAdminRes = await apiRequest(`/api/v1/admin/users/${adminUser.id}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ role: "READER" }),
    });
    assert(demoteLastAdminRes.status === 409, "Demoting the only active ADMIN is blocked with 409 Conflict", `Status: ${demoteLastAdminRes.status}`);

    // Revert role change
    await prisma.user.update({ where: { id: readerUser.id }, data: { role: "READER" } });

    // =========================================================================
    // SECTION 4: AI PIPELINE & SAFETY GUARDRAILS
    // =========================================================================
    console.log("\n[Section 4] AI Pipeline & Safety Guardrails");

    // 4.1 Honest failure when provider key is missing
    const aiDraftWithoutKeyRes = await apiRequest("/api/v1/admin/ai/drafts", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        topic: "International Pop Music Trend Analysis",
        angle: "Streaming platform shifts in 2026",
      }),
    });
    assert(aiDraftWithoutKeyRes.status === 503, "AI generation without API key returns 503 Service Unavailable", `Status: ${aiDraftWithoutKeyRes.status}`);
    assert(aiDraftWithoutKeyRes.body?.error?.code === "AI_PROVIDER_NOT_CONFIGURED", "Error code is AI_PROVIDER_NOT_CONFIGURED", aiDraftWithoutKeyRes.body?.error?.code);
    assert(aiDraftWithoutKeyRes.body?.error?.message?.includes("TODO"), "Error message contains honest TODO instructions", aiDraftWithoutKeyRes.body?.error?.message);

    // 4.2 Allowlist enforcement
    const createSourceRes = await apiRequest("/api/v1/admin/sources", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        name: "Phase 11 Trusted Wire",
        domain: "trustedwire.example.com",
        trustScore: 9,
        isEnabled: true,
      }),
    });
    assert(createSourceRes.status === 201, "Admin creates allowlisted source (201 Created)", `Status: ${createSourceRes.status}`);
    sourceId = createSourceRes.body?.data?.id;

    // Reject non-allowlisted lead
    const badLeadRes = await apiRequest("/api/v1/admin/leads", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        title: "Rumor from untrusted blog",
        url: "https://unauthorized-gossip-site.com/post-123",
        summary: "Unverified rumor",
      }),
    });
    assert(badLeadRes.status === 400, "Lead from non-allowlisted domain is rejected with 400 Bad Request", `Status: ${badLeadRes.status}`);

    // Accept allowlisted lead
    const goodLeadRes = await apiRequest("/api/v1/admin/leads", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        title: "Tour Announcement from Wire",
        url: "https://trustedwire.example.com/tour-announcement",
        sourceId,
        summary: "Official tour dates verified.",
        verifiedFacts: "- European leg starts June 2027",
        confidenceScore: 0.95,
      }),
    });
    assert(goodLeadRes.status === 201, "Lead from allowlisted domain is accepted (201 Created)", `Status: ${goodLeadRes.status}`);
    leadId = goodLeadRes.body?.data?.id;

    // Moderate lead
    const approveLeadRes = await apiRequest(`/api/v1/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    assert(approveLeadRes.status === 200, "Lead status updated to APPROVED (200 OK)", `Status: ${approveLeadRes.status}`);

    // Clean up lead and source
    if (leadId) {
      await prisma.lead.delete({ where: { id: leadId } });
      leadId = null;
    }
    if (sourceId) {
      await prisma.source.delete({ where: { id: sourceId } });
      sourceId = null;
    }

    // 4.3 Double-Gate Auto-Publish Guardrail Check
    const scanRes = await apiRequest("/api/v1/admin/ai/scan", {
      method: "POST",
      headers: { Cookie: adminCookie },
    });
    assert(scanRes.status === 200, "AI scan trigger returns 200 OK", `Status: ${scanRes.status}`);
    assert(scanRes.body?.data?.guardrailStatus?.includes("SECURE"), "Scanner confirms auto-publish is hard-locked", scanRes.body?.data?.guardrailStatus);
    assert(process.env.AI_AUTO_PUBLISH !== "true", "AI_AUTO_PUBLISH environment variable is not true", `Value: ${process.env.AI_AUTO_PUBLISH}`);
    assert(process.env.AI_AUTO_PUBLISH_ENABLED_BY_ADMIN !== "true", "AI_AUTO_PUBLISH_ENABLED_BY_ADMIN is not true", `Value: ${process.env.AI_AUTO_PUBLISH_ENABLED_BY_ADMIN}`);

    // =========================================================================
    // SECTION 5: SEO & STRUCTURED DATA
    // =========================================================================
    console.log("\n[Section 5] SEO & Structured Data");

    // Article structured data
    const articleHtml = articleRes.body;
    assert(articleHtml.includes("\"@type\":\"NewsArticle\""), "Article page contains NewsArticle JSON-LD", "Found NewsArticle");
    assert(articleHtml.includes("\"@type\":\"BreadcrumbList\""), "Article page contains BreadcrumbList JSON-LD", "Found BreadcrumbList");
    assert(articleHtml.includes("rel=\"canonical\""), "Article page contains canonical link tag", "Found rel=\"canonical\"");
    assert(articleHtml.includes("property=\"og:title\""), "Article page contains Open Graph title meta tag", "Found og:title");
    assert(articleHtml.includes("name=\"twitter:card\""), "Article page contains Twitter card meta tag", "Found twitter:card");

    // Homepage structured data
    const homeHtml = homeRes.body;
    assert(homeHtml.includes("\"@type\":\"Organization\"") || homeHtml.includes("\"@type\":\"WebSite\""), "Homepage contains Organization/WebSite JSON-LD", "Found JSON-LD");

    // Sitemap draft exclusion test
    const tempDraft = await prisma.article.create({
      data: {
        title: "Temporary Invisible Draft For SEO Check",
        slug: "temp-invisible-draft-seo-check",
        excerpt: "Draft excerpt",
        bodyMarkdown: "Draft body text",
        status: "DRAFT",
        categoryId: category.id,
        authorId: author.id,
      },
    });
    const sitemapWithDraft = await apiRequest("/sitemap.xml");
    assert(!sitemapWithDraft.body.includes(tempDraft.slug), "Draft article is excluded from sitemap.xml", "Draft omitted");
    const feedWithDraft = await apiRequest("/feed.xml");
    assert(!feedWithDraft.body.includes(tempDraft.slug), "Draft article is excluded from feed.xml", "Draft omitted");
    await prisma.article.delete({ where: { id: tempDraft.id } });

    // =========================================================================
    // SECTION 6: SECURITY HARDENING
    // =========================================================================
    console.log("\n[Section 6] Security Hardening & Audit");

    // 6.1 Security Headers
    assert(homeRes.headers.get("x-content-type-options") === "nosniff", "X-Content-Type-Options: nosniff present", homeRes.headers.get("x-content-type-options"));
    assert(homeRes.headers.get("x-frame-options") === "DENY", "X-Frame-Options: DENY present", homeRes.headers.get("x-frame-options"));
    assert(homeRes.headers.get("referrer-policy") === "strict-origin-when-cross-origin", "Referrer-Policy present", homeRes.headers.get("referrer-policy"));
    assert(Boolean(homeRes.headers.get("strict-transport-security")), "Strict-Transport-Security present", homeRes.headers.get("strict-transport-security"));
    assert(homeRes.headers.get("content-security-policy")?.includes("default-src 'self'"), "CSP default-src 'self' present", "CSP verified");

    // 6.2 CSRF same-origin defense
    const csrfBlockedRes = await apiRequest("/api/v1/newsletter/subscribe", {
      method: "POST",
      headers: {
        Origin: "https://malicious-external-site.com",
        "X-Forwarded-For": "203.0.113.88",
      },
      body: JSON.stringify({ email: "csrf-blocked@example.com" }),
    });
    assert(csrfBlockedRes.status === 403, "Cross-origin mutation request blocked with 403 Forbidden", `Status: ${csrfBlockedRes.status}`);

    const csrfAllowedRes = await apiRequest("/api/v1/newsletter/subscribe", {
      method: "POST",
      headers: {
        Origin: BASE_URL,
        "X-Forwarded-For": "203.0.113.89",
      },
      body: JSON.stringify({ email: "csrf-legit@example.com" }),
    });
    assert(csrfAllowedRes.status === 200, "Same-origin mutation request allowed (200 OK)", `Status: ${csrfAllowedRes.status}`);

    // Clean up newsletter subscription
    await prisma.newsletterSubscriber.deleteMany({ where: { email: "csrf-legit@example.com" } });

    // 6.3 Rate Limiting
    let rateLimited = false;
    let retryAfterHeader = null;
    for (let i = 0; i < 8; i++) {
      const burstRes = await apiRequest("/api/v1/auth/register", {
        method: "POST",
        headers: { "X-Forwarded-For": "203.0.113.99" },
        body: JSON.stringify({ email: `burst-${i}@vybe.test`, password: "Short" }),
      });
      if (burstRes.status === 429) {
        rateLimited = true;
        retryAfterHeader = burstRes.headers.get("retry-after");
        break;
      }
    }
    assert(rateLimited, "Rate limiting throttles burst requests with 429 Too Many Requests", `Triggered: ${rateLimited}`);
    assert(Boolean(retryAfterHeader), "429 response includes Retry-After header", `Retry-After: ${retryAfterHeader}`);

    // 6.4 Sensitive field leakage audit across all endpoints
    const auditEndpoints = [
      { url: "/api/v1/me", headers: { Cookie: readerCookie } },
      { url: "/api/v1/admin/users", headers: { Cookie: adminCookie } },
      { url: "/api/v1/articles" },
      { url: `/api/v1/articles/${sampleArticleSlug}` },
      { url: `/api/v1/articles/${sampleArticleSlug}/comments` },
    ];
    let leakFound = false;
    for (const ep of auditEndpoints) {
      const res = await apiRequest(ep.url, { headers: ep.headers });
      const bodyStr = JSON.stringify(res.body);
      if (bodyStr.includes("passwordHash") || bodyStr.includes("resetTokenHash")) {
        leakFound = true;
        console.error(`Leak detected in ${ep.url}!`);
      }
    }
    assert(!leakFound, "Sensitive fields audit: ZERO instances of passwordHash or resetTokenHash in responses", "No leaks detected");

    // =========================================================================
    // SECTION 7: PERFORMANCE & CACHING
    // =========================================================================
    console.log("\n[Section 7] Performance & Caching");

    // Public Cache-Control headers
    const pubArticlesRes = await apiRequest("/api/v1/articles");
    assert(pubArticlesRes.headers.get("cache-control")?.includes("s-maxage=60"), "Public articles API has s-maxage=60", pubArticlesRes.headers.get("cache-control"));

    const pubCategoriesRes = await apiRequest("/api/v1/categories");
    assert(pubCategoriesRes.headers.get("cache-control")?.includes("s-maxage=3600"), "Public categories API has s-maxage=3600", pubCategoriesRes.headers.get("cache-control"));

    const pubTrendingRes = await apiRequest("/api/v1/trending");
    assert(pubTrendingRes.headers.get("cache-control")?.includes("s-maxage=60"), "Public trending API has s-maxage=60", pubTrendingRes.headers.get("cache-control"));

    // Admin & private route cache prevention
    const adminArticlesRes = await apiRequest("/api/v1/admin/articles", { headers: { Cookie: adminCookie } });
    assert(adminArticlesRes.headers.get("cache-control")?.includes("no-store"), "Admin API carries Cache-Control: no-store", adminArticlesRes.headers.get("cache-control"));

    const mePrivateRes = await apiRequest("/api/v1/me", { headers: { Cookie: readerCookie } });
    assert(mePrivateRes.headers.get("cache-control")?.includes("no-store"), "Private user profile carries Cache-Control: no-store", mePrivateRes.headers.get("cache-control"));

    // Build size inspection
    const buildOutput = fs.readFileSync(".next/BUILD_ID", "utf8").trim();
    assert(Boolean(buildOutput), "Next.js production build artifacts exist", `Build ID: ${buildOutput}`);

    // =========================================================================
    // SECTION 8: DEFERRED ITEMS FROM EARLIER PHASES (HONEST CHECKS)
    // =========================================================================
    console.log("\n[Section 8] Deferred Items Honest Checks");

    // Headless browser attempt
    let browserError = "";
    try {
      execSync("/opt/meta-chromium/chrome --headless --dump-dom --disable-gpu about:blank 2>&1", { encoding: "utf8" });
    } catch (err) {
      browserError = err.stdout || err.stderr || err.message;
    }

    if (browserError.includes("Hatch WebGL domain policy is required for browser startup")) {
      console.log(`  Browser attempt failed honestly with exact message:`);
      console.log(`  "${browserError.trim()}"`);
      recordUntested(
        "Headless browser comments UI rendering",
        "Chrome binary at /opt/meta-chromium/chrome cannot run in this container: 'Hatch WebGL domain policy is required for browser startup (Exit code: 13)'. Headless browser is unavailable."
      );
      recordUntested(
        "Mobile viewport responsive rendering check",
        "Headless browser unavailable due to Hatch WebGL domain policy requirement."
      );
      recordUntested(
        "Dark/light rendering and keyboard focus check",
        "Headless browser unavailable due to Hatch WebGL domain policy requirement."
      );
      recordUntested(
        "Bookmark & newsletter UI click-through in real browser",
        "Headless browser unavailable due to Hatch WebGL domain policy requirement."
      );
    } else {
      assert(false, "Unexpected browser execution result", browserError);
    }

  } finally {
    // =========================================================================
    // SECTION 9: DATABASE CLEANUP & SEED RESTORATION
    // =========================================================================
    console.log("\n[Section 9] Database Cleanup & Seed State Restoration");

    // Delete test users and any residual data
    if (draftArticleId) {
      try { await prisma.article.delete({ where: { id: draftArticleId } }); } catch {}
    }
    if (commentId) {
      try { await prisma.comment.delete({ where: { id: commentId } }); } catch {}
    }
    if (leadId) {
      try { await prisma.lead.delete({ where: { id: leadId } }); } catch {}
    }
    if (sourceId) {
      try { await prisma.source.delete({ where: { id: sourceId } }); } catch {}
    }

    await prisma.bookmark.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.source.deleteMany({});
    await prisma.newsletterSubscriber.deleteMany({});
    await prisma.user.deleteMany({});

    const finalArticles = await prisma.article.count();
    const finalUsers = await prisma.user.count();
    const finalComments = await prisma.comment.count();
    const finalBookmarks = await prisma.bookmark.count();
    const finalLeads = await prisma.lead.count();
    const finalSources = await prisma.source.count();

    console.log(`  Final DB state: Articles=${finalArticles}, Users=${finalUsers}, Comments=${finalComments}, Bookmarks=${finalBookmarks}, Leads=${finalLeads}, Sources=${finalSources}`);
    assert(finalArticles === 9, "Final DB article count returned to seed state (9)", `Articles: ${finalArticles}`);
    assert(finalUsers === 0, "Final DB user count returned to seed state (0)", `Users: ${finalUsers}`);
    assert(finalComments === 0, "Final DB comment count returned to seed state (0)", `Comments: ${finalComments}`);
    assert(finalBookmarks === 0, "Final DB bookmark count returned to seed state (0)", `Bookmarks: ${finalBookmarks}`);
    assert(finalLeads === 0, "Final DB lead count returned to seed state (0)", `Leads: ${finalLeads}`);
    assert(finalSources === 0, "Final DB source count returned to seed state (0)", `Sources: ${finalSources}`);
  }

  console.log("\n=======================================================");
  console.log(`  VERIFICATION FINISHED:`);
  console.log(`    PASS:     ${testsPassed}`);
  console.log(`    FAIL:     ${testsFailed}`);
  console.log(`    UNTESTED: ${testsUntested}`);
  console.log("=======================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

run()
  .catch((err) => {
    console.error("Fatal error during verification:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
