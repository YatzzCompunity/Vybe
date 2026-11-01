import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { publicArticleWhere } from "@/lib/publication";
import { escapeXml, getBaseUrl } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = getBaseUrl();

  try {
    const articles = await prisma.article.findMany({
      where: publicArticleWhere(),
      include: {
        category: true,
        author: true,
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    const buildDate =
      articles.length > 0 && articles[0].publishedAt
        ? articles[0].publishedAt.toUTCString()
        : new Date().toUTCString();

    const itemsXml = articles
      .map((article) => {
        const articleUrl = `${baseUrl}/${article.category.slug}/${article.slug}`;
        const pubDate = (
          article.publishedAt ?? article.createdAt
        ).toUTCString();

        return `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <description><![CDATA[${article.excerpt}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(article.author.penName)}</author>
      <category><![CDATA[${article.category.name}]]></category>
    </item>`;
      })
      .join("\n");

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`.trim();

    return new NextResponse(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Failed to generate RSS feed:", error);
    return new NextResponse("Internal Server Error generating RSS feed", {
      status: 500,
    });
  }
}
