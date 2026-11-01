const { PrismaClient } = require("@prisma/client");
const http = require("http");

const prisma = new PrismaClient();

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
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
  console.log("=== PHASE 8 SEO VERIFICATION SUITE ===\n");
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

  // 1. Check DB state before test
  const initialArticles = await prisma.article.count();
  const initialUsers = await prisma.user.count();
  const initialComments = await prisma.comment.count();
  const initialBookmarks = await prisma.bookmark.count();
  console.log(`Initial DB State: ${initialArticles} articles, ${initialUsers} users, ${initialComments} comments, ${initialBookmarks} bookmarks`);
  assert(initialArticles === 9, "DB has 9 sample articles");
  assert(initialUsers === 0, "DB has 0 users");

  // 2. Test /sitemap.xml
  console.log("\n--- Testing /sitemap.xml ---");
  const sitemapRes = await get("http://localhost:3000/sitemap.xml");
  assert(sitemapRes.statusCode === 200, `/sitemap.xml returned 200 (got ${sitemapRes.statusCode})`);
  assert(sitemapRes.body.includes("<urlset"), "Sitemap contains <urlset");
  assert(sitemapRes.body.includes("/albums/sample-how-modern-album-rollouts-are-structured"), "Sitemap includes published sample article");
  assert(sitemapRes.body.includes("/music"), "Sitemap includes category route");
  assert(sitemapRes.body.includes("/author/editorial-architecture-desk"), "Sitemap includes author route");
  assert(!sitemapRes.body.includes("/admin"), "Sitemap does NOT include /admin");
  assert(!sitemapRes.body.includes("/api"), "Sitemap does NOT include /api");
  assert(!sitemapRes.body.includes("/login"), "Sitemap does NOT include /login");

  // 3. Test /robots.txt
  console.log("\n--- Testing /robots.txt ---");
  const robotsRes = await get("http://localhost:3000/robots.txt");
  assert(robotsRes.statusCode === 200, `/robots.txt returned 200 (got ${robotsRes.statusCode})`);
  assert(robotsRes.body.includes("User-Agent: *") || robotsRes.body.includes("User-agent: *"), "Robots specifies User-Agent: *");
  assert(robotsRes.body.includes("Disallow: /admin"), "Robots disallows /admin");
  assert(robotsRes.body.includes("Disallow: /api"), "Robots disallows /api");
  assert(robotsRes.body.includes("Disallow: /login"), "Robots disallows /login");
  assert(robotsRes.body.includes("Disallow: /register"), "Robots disallows /register");
  assert(robotsRes.body.includes("Disallow: /profile"), "Robots disallows /profile");
  assert(robotsRes.body.includes("Sitemap: http://localhost:3000/sitemap.xml"), "Robots references sitemap URL");

  // 4. Test /feed.xml
  console.log("\n--- Testing /feed.xml ---");
  const feedRes = await get("http://localhost:3000/feed.xml");
  assert(feedRes.statusCode === 200, `/feed.xml returned 200 (got ${feedRes.statusCode})`);
  assert((feedRes.headers["content-type"] || "").includes("xml"), `Feed content-type is XML (got ${feedRes.headers["content-type"]})`);
  assert(feedRes.body.includes("<rss version=\"2.0\""), "Feed is valid RSS 2.0");
  assert(feedRes.body.includes("<channel>"), "Feed contains channel");
  assert(feedRes.body.includes("<item>"), "Feed contains items");
  assert(feedRes.body.includes("Sample Feature: How a Modern Album Rollout Is Structured"), "Feed contains published article title");
  assert(feedRes.body.includes("<category>"), "Feed items include category");
  assert(feedRes.body.includes("<author>"), "Feed items include author");
  assert(feedRes.body.includes("<pubDate>"), "Feed items include pubDate");

  // 5. Test /rss.xml redirect
  console.log("\n--- Testing /rss.xml redirect ---");
  const rssRes = await get("http://localhost:3000/rss.xml");
  assert(rssRes.statusCode === 308 || rssRes.statusCode === 307, `/rss.xml returns redirect code (got ${rssRes.statusCode})`);
  assert((rssRes.headers["location"] || "").includes("/feed.xml"), `/rss.xml redirects to /feed.xml (got ${rssRes.headers["location"]})`);

  // 6. Test Article Detail Page Structured Data & Metadata
  console.log("\n--- Testing Article Page: Structured Data & Metadata ---");
  const articleRes = await get("http://localhost:3000/albums/sample-how-modern-album-rollouts-are-structured");
  assert(articleRes.statusCode === 200, "Article page returned 200");
  assert(articleRes.body.includes('"@type":"NewsArticle"') || articleRes.body.includes('"@type": "NewsArticle"'), "Article page includes NewsArticle JSON-LD");
  assert(articleRes.body.includes('"@type":"BreadcrumbList"') || articleRes.body.includes('"@type": "BreadcrumbList"'), "Article page includes BreadcrumbList JSON-LD");
  assert(articleRes.body.includes('"@type":"Person"') || articleRes.body.includes('"@type": "Person"'), "Article page includes Person JSON-LD for author");
  assert(articleRes.body.includes('rel="canonical"'), "Article page contains canonical link element");
  assert(articleRes.body.includes('/albums/sample-how-modern-album-rollouts-are-structured'), "Canonical link points to correct article path");
  assert(articleRes.body.includes('property="og:title"') || articleRes.body.includes('name="og:title"'), "Article page contains og:title");
  assert(articleRes.body.includes('name="twitter:card"'), "Article page contains twitter:card");

  // 7. Test Category Page: Structured Data & Metadata
  console.log("\n--- Testing Category Page: Structured Data & Metadata ---");
  const categoryRes = await get("http://localhost:3000/music");
  assert(categoryRes.statusCode === 200, "Category page returned 200");
  assert(categoryRes.body.includes('"@type":"BreadcrumbList"') || categoryRes.body.includes('"@type": "BreadcrumbList"'), "Category page includes BreadcrumbList JSON-LD");
  assert(categoryRes.body.includes('rel="canonical"'), "Category page contains canonical link");
  assert(categoryRes.body.includes('property="og:title"') || articleRes.body.includes('name="og:title"'), "Category page contains OG metadata");

  // 8. Test Author Page: Structured Data & Metadata
  console.log("\n--- Testing Author Page: Structured Data & Metadata ---");
  const authorRes = await get("http://localhost:3000/author/editorial-architecture-desk");
  assert(authorRes.statusCode === 200, "Author page returned 200");
  assert(authorRes.body.includes('"@type":"Person"') || authorRes.body.includes('"@type": "Person"'), "Author page includes Person JSON-LD");
  assert(authorRes.body.includes('"@type":"BreadcrumbList"') || authorRes.body.includes('"@type": "BreadcrumbList"'), "Author page includes BreadcrumbList JSON-LD");
  assert(authorRes.body.includes('rel="canonical"'), "Author page contains canonical link");

  // 9. Test Draft Article Exclusion from Sitemap and Feed
  console.log("\n--- Testing Draft Article Exclusion ---");
  const author = await prisma.author.findFirst();
  const category = await prisma.category.findFirst();
  const testDraftSlug = "test-phase8-draft-article-do-not-index";
  
  const createdDraft = await prisma.article.create({
    data: {
      slug: testDraftSlug,
      title: "Secret Unreleased Draft Article For Phase 8 Test",
      excerpt: "This draft should never appear in sitemap or feed.",
      bodyMarkdown: "Draft content only for automated verification.",
      status: "DRAFT",
      isSampleContent: false,
      authorId: author.id,
      categoryId: category.id,
    },
  });
  console.log(`Created temporary draft article: ${createdDraft.slug} (${createdDraft.id})`);

  try {
    const sitemapWithDraft = await get("http://localhost:3000/sitemap.xml");
    assert(!sitemapWithDraft.body.includes(testDraftSlug), "Draft article does NOT appear in /sitemap.xml");

    const feedWithDraft = await get("http://localhost:3000/feed.xml");
    assert(!feedWithDraft.body.includes(testDraftSlug), "Draft article does NOT appear in /feed.xml");
  } finally {
    await prisma.article.delete({
      where: { id: createdDraft.id },
    });
    console.log(`Cleaned up temporary draft article: ${createdDraft.id}`);
  }

  // 10. Verify DB Cleanup State
  console.log("\n--- Verifying Database State After Cleanup ---");
  const finalArticles = await prisma.article.count();
  const finalPublished = await prisma.article.count({ where: { status: "PUBLISHED" } });
  const finalUsers = await prisma.user.count();
  const finalComments = await prisma.comment.count();
  const finalBookmarks = await prisma.bookmark.count();
  const finalCategories = await prisma.category.count();
  const finalAuthors = await prisma.author.count();

  assert(finalArticles === 9, `Final articles count is 9 (got ${finalArticles})`);
  assert(finalPublished === 9, `Final published count is 9 (got ${finalPublished})`);
  assert(finalUsers === 0, `Final users count is 0 (got ${finalUsers})`);
  assert(finalComments === 0, `Final comments count is 0 (got ${finalComments})`);
  assert(finalBookmarks === 0, `Final bookmarks count is 0 (got ${finalBookmarks})`);
  assert(finalCategories === 9, `Final categories count is 9 (got ${finalCategories})`);
  assert(finalAuthors === 3, `Final authors count is 3 (got ${finalAuthors})`);

  console.log(`\nVerification Complete: ${passed} PASSED, ${failed} FAILED.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
