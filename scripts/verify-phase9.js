const { PrismaClient } = require("@prisma/client");
const http = require("http");

const prisma = new PrismaClient();

function get(url, options = {}) {
  return new Promise((resolve, reject) => {
    http.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    }).on("error", reject);
  });
}

async function runTests() {
  console.log("=== PHASE 9 PERFORMANCE & CACHING VERIFICATION SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Check initial DB state
  console.log("--- 1. Initial Database Seed State ---");
  const initialArticles = await prisma.article.count({ where: { status: "PUBLISHED" } });
  const initialDrafts = await prisma.article.count({ where: { status: "DRAFT" } });
  const initialUsers = await prisma.user.count();
  const initialComments = await prisma.comment.count();
  const initialBookmarks = await prisma.bookmark.count();
  console.log(`Initial DB State: ${initialArticles} published articles, ${initialDrafts} drafts, ${initialUsers} users, ${initialComments} comments, ${initialBookmarks} bookmarks`);
  assert(initialArticles === 9, "DB has 9 published sample articles");
  assert(initialDrafts === 0, "DB has 0 drafts");
  assert(initialUsers === 0, "DB has 0 users");
  assert(initialComments === 0, "DB has 0 comments");
  assert(initialBookmarks === 0, "DB has 0 bookmarks");

  // 2. (a) Homepage & Public Pages return 200
  console.log("\n--- 2. Public Pages HTTP 200 Verification ---");
  const homeRes = await get("http://localhost:3000/");
  assert(homeRes.statusCode === 200, `GET / returned 200 (got ${homeRes.statusCode})`);
  assert(homeRes.body.includes("VYBE"), "Homepage contains brand VYBE");

  const categoryRes = await get("http://localhost:3000/music");
  assert(categoryRes.statusCode === 200, `GET /music returned 200 (got ${categoryRes.statusCode})`);

  const categoryAliasRes = await get("http://localhost:3000/category/music");
  assert(categoryAliasRes.statusCode === 200, `GET /category/music returned 200 (got ${categoryAliasRes.statusCode})`);

  const articleRes = await get("http://localhost:3000/music/sample-inside-live-touring-production-logistics");
  assert(articleRes.statusCode === 200, `GET /music/sample-inside-live-touring-production-logistics returned 200 (got ${articleRes.statusCode})`);
  assert(articleRes.body.includes("Touring"), "Article page contains article content");

  const authorRes = await get("http://localhost:3000/author/editorial-architecture-desk");
  assert(authorRes.statusCode === 200, `GET /author/editorial-architecture-desk returned 200 (got ${authorRes.statusCode})`);

  const authorAliasRes = await get("http://localhost:3000/authors/editorial-architecture-desk");
  assert(authorAliasRes.statusCode === 200, `GET /authors/editorial-architecture-desk returned 200 (got ${authorAliasRes.statusCode})`);

  const searchRes = await get("http://localhost:3000/search?q=touring");
  assert(searchRes.statusCode === 200, `GET /search?q=touring returned 200 (got ${searchRes.statusCode})`);

  // 3. (b) Public API responses carry Cache-Control headers as intended
  console.log("\n--- 3. Public API Cache-Control Headers ---");
  
  const apiCategoriesRes = await get("http://localhost:3000/api/v1/categories");
  assert(apiCategoriesRes.statusCode === 200, `GET /api/v1/categories returned 200 (got ${apiCategoriesRes.statusCode})`);
  const catCache = apiCategoriesRes.headers["cache-control"] || "";
  assert(
    catCache.includes("s-maxage=3600") && catCache.includes("stale-while-revalidate=86400"),
    `/api/v1/categories carries s-maxage=3600, stale-while-revalidate=86400 (got: '${catCache}')`
  );

  const apiArticlesRes = await get("http://localhost:3000/api/v1/articles");
  assert(apiArticlesRes.statusCode === 200, `GET /api/v1/articles returned 200 (got ${apiArticlesRes.statusCode})`);
  const artCache = apiArticlesRes.headers["cache-control"] || "";
  assert(
    artCache.includes("s-maxage=60") && artCache.includes("stale-while-revalidate=300"),
    `/api/v1/articles carries s-maxage=60, stale-while-revalidate=300 (got: '${artCache}')`
  );

  const apiArticleDetailRes = await get("http://localhost:3000/api/v1/articles/sample-inside-live-touring-production-logistics");
  assert(apiArticleDetailRes.statusCode === 200, `GET /api/v1/articles/[slug] returned 200 (got ${apiArticleDetailRes.statusCode})`);
  const detailCache = apiArticleDetailRes.headers["cache-control"] || "";
  assert(
    detailCache.includes("s-maxage=300") && detailCache.includes("stale-while-revalidate=3600"),
    `/api/v1/articles/[slug] carries s-maxage=300, stale-while-revalidate=3600 (got: '${detailCache}')`
  );

  const apiTrendingRes = await get("http://localhost:3000/api/v1/trending");
  assert(apiTrendingRes.statusCode === 200, `GET /api/v1/trending returned 200 (got ${apiTrendingRes.statusCode})`);
  const trendCache = apiTrendingRes.headers["cache-control"] || "";
  assert(
    trendCache.includes("s-maxage=60") && trendCache.includes("stale-while-revalidate=300"),
    `/api/v1/trending carries s-maxage=60, stale-while-revalidate=300 (got: '${trendCache}')`
  );

  const apiSearchRes = await get("http://localhost:3000/api/v1/search?q=music");
  assert(apiSearchRes.statusCode === 200, `GET /api/v1/search returned 200 (got ${apiSearchRes.statusCode})`);
  const searchCache = apiSearchRes.headers["cache-control"] || "";
  assert(
    searchCache.includes("s-maxage=60") && searchCache.includes("stale-while-revalidate=300"),
    `/api/v1/search carries s-maxage=60, stale-while-revalidate=300 (got: '${searchCache}')`
  );

  const apiCommentsRes = await get("http://localhost:3000/api/v1/articles/sample-inside-live-touring-production-logistics/comments");
  assert(apiCommentsRes.statusCode === 200, `GET /api/v1/articles/[slug]/comments returned 200 (got ${apiCommentsRes.statusCode})`);
  const commentCache = apiCommentsRes.headers["cache-control"] || "";
  assert(
    commentCache.includes("s-maxage=30") && commentCache.includes("stale-while-revalidate=60"),
    `/api/v1/articles/[slug]/comments carries s-maxage=30, stale-while-revalidate=60 (got: '${commentCache}')`
  );

  // 4. (c) Admin routes are NOT publicly cached
  console.log("\n--- 4. Admin & Authenticated Routes Cache Prevention ---");
  const adminPageRes = await get("http://localhost:3000/admin");
  const adminPageCache = adminPageRes.headers["cache-control"] || "";
  assert(
    adminPageCache.includes("no-store") || adminPageCache.includes("no-cache"),
    `/admin page is NOT publicly cached (Cache-Control: '${adminPageCache}')`
  );

  const adminApiArticlesRes = await get("http://localhost:3000/api/v1/admin/articles");
  const adminApiArticlesCache = adminApiArticlesRes.headers["cache-control"] || "";
  assert(
    adminApiArticlesCache.includes("no-store"),
    `/api/v1/admin/articles has Cache-Control: no-store (got: '${adminApiArticlesCache}')`
  );

  const adminApiCategoriesRes = await get("http://localhost:3000/api/v1/admin/categories");
  const adminApiCategoriesCache = adminApiCategoriesRes.headers["cache-control"] || "";
  assert(
    adminApiCategoriesCache.includes("no-store"),
    `/api/v1/admin/categories has Cache-Control: no-store (got: '${adminApiCategoriesCache}')`
  );

  const adminApiLeadsRes = await get("http://localhost:3000/api/v1/admin/leads");
  const adminApiLeadsCache = adminApiLeadsRes.headers["cache-control"] || "";
  assert(
    adminApiLeadsCache.includes("no-store"),
    `/api/v1/admin/leads has Cache-Control: no-store (got: '${adminApiLeadsCache}')`
  );

  const meApiRes = await get("http://localhost:3000/api/v1/me");
  const meApiCache = meApiRes.headers["cache-control"] || "";
  assert(
    meApiCache.includes("no-store"),
    `/api/v1/me has Cache-Control: no-store (got: '${meApiCache}')`
  );

  const bookmarksApiRes = await get("http://localhost:3000/api/v1/bookmarks");
  const bookmarksApiCache = bookmarksApiRes.headers["cache-control"] || "";
  assert(
    bookmarksApiCache.includes("no-store"),
    `/api/v1/bookmarks has Cache-Control: no-store (got: '${bookmarksApiCache}')`
  );

  // 5. (d) Draft article invisibility check
  console.log("\n--- 5. Draft Article Invisibility Check ---");
  const testCategory = await prisma.category.findFirst();
  const testAuthor = await prisma.author.findFirst();
  
  const draftSlug = "test-phase9-perf-secret-draft-article";
  const draftArticle = await prisma.article.create({
    data: {
      slug: draftSlug,
      title: "Secret Unreleased Draft Title For Phase 9 Test",
      excerpt: "This excerpt should never be visible to the public.",
      bodyMarkdown: "Draft secret text.",
      status: "DRAFT",
      categoryId: testCategory.id,
      authorId: testAuthor.id,
    },
  });
  console.log(`Created temporary draft article id: ${draftArticle.id}, slug: ${draftSlug}`);

  try {
    // 5a. Verify not present in public article list
    const pubListRes = await get("http://localhost:3000/api/v1/articles");
    const pubListData = JSON.parse(pubListRes.body);
    const foundInList = (pubListData.data || []).some((a) => a.slug === draftSlug);
    assert(!foundInList, `Draft article '${draftSlug}' is NOT in public GET /api/v1/articles list`);

    // 5b. Verify 404 in public article detail API
    const pubDetailRes = await get(`http://localhost:3000/api/v1/articles/${draftSlug}`);
    assert(pubDetailRes.statusCode === 404, `GET /api/v1/articles/${draftSlug} returns 404 NOT_FOUND (got ${pubDetailRes.statusCode})`);

    // 5c. Verify 404 in public article page
    const pubPageRes = await get(`http://localhost:3000/${testCategory.slug}/${draftSlug}`);
    assert(pubPageRes.statusCode === 404, `GET /${testCategory.slug}/${draftSlug} returns 404 (got ${pubPageRes.statusCode})`);
  } finally {
    // Clean up draft article immediately
    await prisma.article.delete({ where: { id: draftArticle.id } });
    console.log(`Cleaned up temporary draft article: ${draftSlug}`);
  }

  // 6. (e) Images audit on homepage and article page
  console.log("\n--- 6. Image Optimization & Layout Audit ---");
  // Check for any <img> tags in the server rendered HTML
  const homeImgMatches = homeRes.body.match(/<img[^>]*>/gi) || [];
  const articleImgMatches = articleRes.body.match(/<img[^>]*>/gi) || [];
  assert(
    homeImgMatches.length === 0,
    `Homepage contains 0 unoptimized <img> tags (found: ${homeImgMatches.length})`
  );
  assert(
    articleImgMatches.length === 0,
    `Article page contains 0 unoptimized <img> tags (found: ${articleImgMatches.length})`
  );
  assert(
    homeRes.body.includes("aspect-[16/9]") || homeRes.body.includes("aspect-"),
    "Homepage preserves aspect ratio classes for layout shift prevention"
  );
  assert(
    articleRes.body.includes("aspect-[16/9]") || articleRes.body.includes("aspect-"),
    "Article page preserves aspect ratio classes for layout shift prevention"
  );

  // 7. Final database counts verification
  console.log("\n--- 7. Database Counts Seed State Verification ---");
  const finalArticles = await prisma.article.count({ where: { status: "PUBLISHED" } });
  const finalDrafts = await prisma.article.count({ where: { status: "DRAFT" } });
  const finalUsers = await prisma.user.count();
  const finalComments = await prisma.comment.count();
  const finalBookmarks = await prisma.bookmark.count();
  const finalTotalArticles = await prisma.article.count();

  console.log(`Final DB State: ${finalArticles} published articles, ${finalDrafts} drafts, ${finalUsers} users, ${finalComments} comments, ${finalBookmarks} bookmarks`);
  assert(finalArticles === 9, "Final DB has exactly 9 published articles");
  assert(finalDrafts === 0, "Final DB has exactly 0 drafts");
  assert(finalTotalArticles === 9, "Final DB total articles is 9");
  assert(finalUsers === 0, "Final DB has exactly 0 users");
  assert(finalComments === 0, "Final DB has exactly 0 comments");
  assert(finalBookmarks === 0, "Final DB has exactly 0 bookmarks");

  console.log(`\n=== VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
