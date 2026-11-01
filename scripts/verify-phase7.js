/**
 * ============================================================================
 * VYBE Phase 7 Verification Suite
 * ============================================================================
 * Tests:
 * 1. Role guards: AI draft & lead endpoints block unauthenticated (401) and READER (403).
 * 2. Honest failure: Draft generation without AI provider key returns 503 & creates no fake article.
 * 3. Allowlist enforcement: Non-allowlisted lead URLs are rejected (400), allowlisted are accepted (201).
 * 4. Quality checks engine: flags low confidence, unverified claims, duplicates, headings, SEO.
 * 5. Lifecycle & Guardrails: AI-assisted draft is DRAFT, hidden from public API/search, and becomes public ONLY after admin publish.
 * 6. Hard guardrail: automated publish is blocked without human editor/admin.
 * 7. Cleanup: all test data removed, restoring DB to exact seed state (9 articles, 0 users).
 * ============================================================================
 */

const { PrismaClient } = require("@prisma/client");
const { encode } = require("next-auth/jwt");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";
const AUTH_SECRET = process.env.NEXTAUTH_SECRET || "replace-with-generated-random-secret-in-local-env";

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

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Origin: BASE_URL,
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, {
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
  console.log("STARTING PHASE 7 VERIFICATION SUITE");
  console.log("=======================================================\n");

  // Setup test users
  const adminUser = await prisma.user.create({
    data: {
      email: "phase7-admin@vybe.test",
      displayName: "Phase7 Admin",
      role: "ADMIN",
    },
  });
  const readerUser = await prisma.user.create({
    data: {
      email: "phase7-reader@vybe.test",
      displayName: "Phase7 Reader",
      role: "READER",
    },
  });

  const adminCookie = await createSessionCookie(adminUser);
  const readerCookie = await createSessionCookie(readerUser);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Role Guards
    // -------------------------------------------------------------------------
    console.log("[Test 1] Role Guards on AI and Admin Endpoints");

    // 1a: Anonymous request to drafts -> 401
    const anonDraftRes = await apiRequest("/api/v1/admin/ai/drafts", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert(
      anonDraftRes.status === 401,
      `Anonymous POST /api/v1/admin/ai/drafts returned 401 (got ${anonDraftRes.status})`
    );

    // 1b: Reader request to drafts -> 403
    const readerDraftRes = await apiRequest("/api/v1/admin/ai/drafts", {
      method: "POST",
      headers: { Cookie: readerCookie },
      body: JSON.stringify({}),
    });
    assert(
      readerDraftRes.status === 403,
      `READER POST /api/v1/admin/ai/drafts returned 403 Forbidden (got ${readerDraftRes.status})`
    );

    // 1c: Reader request to leads -> 403
    const readerLeadRes = await apiRequest("/api/v1/admin/leads", {
      method: "GET",
      headers: { Cookie: readerCookie },
    });
    assert(
      readerLeadRes.status === 403,
      `READER GET /api/v1/admin/leads returned 403 Forbidden (got ${readerLeadRes.status})`
    );

    // 1d: Reader request to sources -> 403
    const readerSourceRes = await apiRequest("/api/v1/admin/sources", {
      method: "GET",
      headers: { Cookie: readerCookie },
    });
    assert(
      readerSourceRes.status === 403,
      `READER GET /api/v1/admin/sources returned 403 Forbidden (got ${readerSourceRes.status})`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Honest Failure Without Provider API Key
    // -------------------------------------------------------------------------
    console.log("\n[Test 2] Honest Failure When AI Provider Key is Not Configured");

    const articleCountBefore = await prisma.article.count();
    const adminDraftRes = await apiRequest("/api/v1/admin/ai/drafts", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ editorialPrompt: "Test headline" }),
    });

    assert(
      adminDraftRes.status === 503,
      `Admin POST /api/v1/admin/ai/drafts without key returned 503 Service Unavailable (got ${adminDraftRes.status})`
    );
    assert(
      adminDraftRes.body?.error?.code === "AI_PROVIDER_NOT_CONFIGURED",
      `Error code is AI_PROVIDER_NOT_CONFIGURED (got "${adminDraftRes.body?.error?.code}")`
    );
    assert(
      adminDraftRes.body?.error?.message?.includes("TODO: AI provider API key is not configured"),
      `Clear honest error message with TODO present: "${adminDraftRes.body?.error?.message}"`
    );

    const articleCountAfter = await prisma.article.count();
    assert(
      articleCountBefore === articleCountAfter,
      `No fake article was created in the database (count remained ${articleCountAfter})`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Source Allowlist & Lead Ingestion
    // -------------------------------------------------------------------------
    console.log("\n[Test 3] Source Allowlist & Lead Ingestion Enforcement");

    // 3a: Create an allowlisted source as ADMIN
    const createSourceRes = await apiRequest("/api/v1/admin/sources", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        name: "Billboard Official Wire",
        domain: "billboard-verified.com",
        sourceType: "PRESS_RELEASE",
        trustTier: 1,
        isEnabled: true,
      }),
    });
    assert(
      createSourceRes.status === 201,
      `Admin created allowlisted source (HTTP 201, ID: ${createSourceRes.body?.data?.id})`
    );
    const sourceId = createSourceRes.body?.data?.id;

    // 3b: Attempt to ingest a lead from an un-allowlisted domain -> Must be rejected (400)
    const badLeadRes = await apiRequest("/api/v1/admin/leads", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        title: "Leaked Track From Untrusted Source",
        url: "https://pirate-unauthorized-news.org/leaks/song1",
        summary: "An unverified leaked track surfaced on an unauthorized forum.",
      }),
    });
    assert(
      badLeadRes.status === 400,
      `Lead from unauthorized domain rejected with 400 Bad Request (got ${badLeadRes.status})`
    );

    // 3c: Ingest a lead from an allowlisted domain -> Must succeed (201)
    const goodLeadRes = await apiRequest("/api/v1/admin/leads", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        title: "Kendrick Lamar Confirms 2027 Stadium World Tour",
        url: "https://billboard-verified.com/news/kendrick-2027-tour",
        sourceId,
        summary: "Kendrick Lamar announced official global stadium tour dates starting in early 2027.",
        verifiedFacts: "- Tour begins in April 2027\n- 14 European stadium dates confirmed\n- Tickets on sale via official distributor",
        confidenceScore: 0.95,
      }),
    });
    assert(
      goodLeadRes.status === 201,
      `Allowlisted lead created with status NEW (HTTP 201, ID: ${goodLeadRes.body?.data?.id})`
    );
    const leadId = goodLeadRes.body?.data?.id;

    // 3d: Approve the lead
    const approveLeadRes = await apiRequest(`/api/v1/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    assert(
      approveLeadRes.status === 200 && approveLeadRes.body?.data?.status === "APPROVED",
      `Lead status updated to APPROVED`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Quality Check Engine
    // -------------------------------------------------------------------------
    console.log("\n[Test 4] Editorial Quality Check Engine");

    // 4a: Valid high-quality draft check
    const category = await prisma.category.findFirst({ where: { slug: "music" } });
    const qcGoodRes = await apiRequest("/api/v1/admin/ai/quality-check", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        title: "Kendrick Lamar Announces Stadium Tour Across Europe and North America",
        excerpt: "Official dates and production design details revealed for Kendrick Lamar's upcoming 2027 international stadium run.",
        bodyMarkdown: "## Production Architecture\nKendrick Lamar and his creative studio have unveiled the stage architecture for the 2027 international tour.\n\n### Tour Itinerary\nThe tour begins with multiple nights in London and Paris before heading across North America.",
        categoryId: category.id,
        categorySlug: "music",
        tags: ["touring", "kendrick-lamar"],
        sourcesCited: ["Billboard Official Wire"],
        confidenceScore: 0.95,
      }),
    });

    assert(qcGoodRes.status === 200, `Quality check endpoint returned 200 OK`);
    const goodReport = qcGoodRes.body?.data;
    assert(
      goodReport?.passed === true && goodReport?.score >= 80,
      `High-quality draft passed checks with score ${goodReport?.score}/100`
    );
    assert(
      goodReport?.headingHierarchy?.passed === true,
      `Heading hierarchy passed (found ${goodReport?.headingHierarchy?.headingsFound?.length} headings)`
    );
    assert(
      goodReport?.internalLinks?.suggestions?.length > 0,
      `Internal link recommendations generated (${goodReport?.internalLinks?.suggestions?.length} suggestions)`
    );

    // 4b: Deficient draft check (unverified claim, repeated word, low confidence, no source)
    const qcBadRes = await apiRequest("/api/v1/admin/ai/quality-check", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        title: "Rumored Guest Appearances on Tour",
        excerpt: "Short excerpt.",
        bodyMarkdown: "### Premature Subheading\nHere is the the leaked info without any top level section headings and lots of rumors!!!!",
        sourcesCited: [],
        confidenceScore: 0.35,
        unverifiedClaims: ["Rumors circulating on social forums regarding surprise co-headliners"],
      }),
    });

    const badReport = qcBadRes.body?.data;
    assert(
      badReport?.needsReview === true,
      `Deficient draft correctly flagged as needsReview: true`
    );
    assert(
      badReport?.factualAccuracy?.unverifiedClaims?.length > 0,
      `Unverified claims flagged (${badReport?.factualAccuracy?.unverifiedClaims?.length})`
    );
    assert(
      badReport?.grammarSpelling?.issues?.some((i) => i.type === "REPEATED_WORD"),
      `Grammar check detected repeated word ("the the")`
    );
    assert(
      badReport?.headingHierarchy?.issues?.length > 0,
      `Heading hierarchy violation detected (H3 before H2)`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Pipeline Draft Creation, Guardrail & Publication Lifecycle
    // -------------------------------------------------------------------------
    console.log("\n[Test 5] Draft Lifecycle, Guardrails & Publication Flow");

    const author = await prisma.author.findFirst({ where: { isStaff: true } });

    // 5a: Create AI-assisted draft in DRAFT state
    const draftArticle = await prisma.article.create({
      data: {
        slug: "kendrick-lamar-2027-tour-verified-draft",
        title: "Kendrick Lamar 2027 Stadium Tour Confirmed",
        excerpt: "Official dates and production schedule confirmed for Kendrick Lamar's 2027 world tour.",
        bodyMarkdown: "## Verified Tour Itinerary\nThe tour will visit major stadiums across 14 countries.\n\n### Staging Logistics\nFeatures immersive stage lighting and quadraphonic sound arrays.",
        status: "DRAFT",
        isAiAssisted: true,
        publishedAt: null, // Hard guardrail: must be null on creation
        sourceId,
        categoryId: category.id,
        authorId: author.id,
        editorialNote: "AI-assisted draft generated from Billboard lead. Editor approval required.",
        aiMetadataJson: JSON.stringify({
          modelUsed: "gemini-2.5-flash",
          generatedAt: new Date().toISOString(),
          imagePrompt: "Editorial concert photograph with wide lens and ambient neon backlight",
          sourcesCited: ["Billboard Official Wire"],
          unverifiedClaims: [],
          qualityReport: goodReport,
        }),
      },
    });

    assert(
      draftArticle.status === "DRAFT" && draftArticle.publishedAt === null && draftArticle.isAiAssisted === true,
      `AI draft created with status DRAFT, isAiAssisted: true, publishedAt: null`
    );

    // 5b: Verify draft is NOT public via public API
    const publicListRes = await apiRequest("/api/v1/articles");
    const foundInList = publicListRes.body?.data?.some((a) => a.slug === draftArticle.slug);
    assert(
      !foundInList,
      `AI Draft is strictly HIDDEN from public article feed (GET /api/v1/articles)`
    );

    // 5c: Verify draft is NOT accessible via public slug route -> 404
    const publicSlugRes = await apiRequest(`/api/v1/articles/${draftArticle.slug}`);
    assert(
      publicSlugRes.status === 404,
      `Public GET /api/v1/articles/[slug] returned 404 Not Found (got ${publicSlugRes.status})`
    );

    // 5d: Verify draft is NOT found in public search
    const publicSearchRes = await apiRequest(`/api/v1/search?q=Kendrick`);
    const foundInSearch = publicSearchRes.body?.data?.some((a) => a.slug === draftArticle.slug);
    assert(
      !foundInSearch,
      `AI Draft is strictly HIDDEN from public search results`
    );

    // 5e: Verify non-admin / non-staff cannot publish
    const readerPublishRes = await apiRequest(`/api/v1/admin/articles/${draftArticle.id}/publish`, {
      method: "POST",
      headers: { Cookie: readerCookie },
    });
    assert(
      readerPublishRes.status === 403,
      `READER cannot publish AI draft (HTTP 403 Forbidden)`
    );

    // 5f: Publish explicitly via Admin flow
    const adminPublishRes = await apiRequest(`/api/v1/admin/articles/${draftArticle.id}/publish`, {
      method: "POST",
      headers: { Cookie: adminCookie },
    });
    assert(
      adminPublishRes.status === 200,
      `ADMIN explicitly published article via existing publish flow (HTTP 200)`
    );

    const refreshedArticle = await prisma.article.findUnique({ where: { id: draftArticle.id } });
    assert(
      refreshedArticle.status === "PUBLISHED" && refreshedArticle.publishedAt !== null,
      `Article status is now PUBLISHED with valid publishedAt timestamp`
    );

    // 5g: Verify article is NOW public
    const publicSlugAfterPublish = await apiRequest(`/api/v1/articles/${draftArticle.slug}`);
    assert(
      publicSlugAfterPublish.status === 200,
      `Article is now publicly accessible via GET /api/v1/articles/[slug] (HTTP 200)`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Manual Scanner Trigger
    // -------------------------------------------------------------------------
    console.log("\n[Test 6] Manual Pipeline Scan Trigger");

    const scanRes = await apiRequest("/api/v1/admin/ai/scan", {
      method: "POST",
      headers: { Cookie: adminCookie },
    });
    assert(scanRes.status === 200, `POST /api/v1/admin/ai/scan returned 200 OK`);
    assert(
      scanRes.body?.data?.guardrailStatus?.includes("Auto-publish is HARD-LOCKED to false"),
      `Scanner reports auto-publish guardrail is securely locked: "${scanRes.body?.data?.guardrailStatus}"`
    );
    assert(
      scanRes.body?.data?.activeSourcesCount >= 1,
      `Scanner detected active sources (count: ${scanRes.body?.data?.activeSourcesCount})`
    );

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("\n[Test 7] Database Cleanup to Seed State");

    // Delete created article (and its relations)
    if (draftArticle?.id) await prisma.article.delete({ where: { id: draftArticle.id } }).catch(() => {});

    // Delete created lead
    if (leadId) await prisma.lead.delete({ where: { id: leadId } }).catch(() => {});

    // Delete created source
    if (sourceId) await prisma.source.delete({ where: { id: sourceId } }).catch(() => {});

    // Delete test users
    await prisma.user.deleteMany({
      where: {
        id: { in: [adminUser.id, readerUser.id] },
      },
    });

    const finalArticles = await prisma.article.count();
    const finalUsers = await prisma.user.count();
    const finalComments = await prisma.comment.count();
    const finalBookmarks = await prisma.bookmark.count();
    const finalSources = await prisma.source.count();
    const finalLeads = await prisma.lead.count();

    console.log("\nFinal Database State Counts:");
    console.log({
      articles: finalArticles,
      users: finalUsers,
      comments: finalComments,
      bookmarks: finalBookmarks,
      sources: finalSources,
      leads: finalLeads,
    });

    assert(
      finalArticles === 9,
      `Article count returned exactly to 9 seed sample articles (got ${finalArticles})`
    );
    assert(
      finalUsers === 0,
      `User count returned exactly to 0 (got ${finalUsers})`
    );
    assert(
      finalComments === 0,
      `Comment count is 0 (got ${finalComments})`
    );
    assert(
      finalBookmarks === 0,
      `Bookmark count is 0 (got ${finalBookmarks})`
    );
    assert(
      finalSources === 0 && finalLeads === 0,
      `Sources (${finalSources}) and Leads (${finalLeads}) returned to 0`
    );
  } catch (error) {
    console.error("Test execution threw error:", error);
    testsFailed++;
  } finally {
    // Safety cleanup in case of failure mid-run
    await prisma.article.deleteMany({ where: { slug: "kendrick-lamar-2027-tour-verified-draft" } }).catch(() => {});
    await prisma.lead.deleteMany({ where: { url: { contains: "billboard-verified.com" } } }).catch(() => {});
    await prisma.source.deleteMany({ where: { domain: "billboard-verified.com" } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: ["phase7-admin@vybe.test", "phase7-reader@vybe.test"] } } }).catch(() => {});
    await prisma.$disconnect();
  }

  console.log("\n=======================================================");
  console.log(`VERIFICATION SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("=======================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
