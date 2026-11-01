#!/usr/bin/env node

/**
 * ============================================================================
 * VYBE Media Platform — AI Pipeline Manual Scan & Guardrail Audit Script
 * ============================================================================
 * Usage:
 *   node scripts/ai-pipeline-scan.js
 * ============================================================================
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================================");
  console.log("VYBE AI CONTENT PIPELINE — MANUAL SCAN & GUARDRAIL AUDIT");
  console.log("=================================================================");

  const autoPublishEnv = process.env.AI_AUTO_PUBLISH === "true";
  const explicitAdminOverride = process.env.AI_AUTO_PUBLISH_ENABLED_BY_ADMIN === "true";
  const autoPublishPermitted = autoPublishEnv && explicitAdminOverride;

  console.log(`\n[GUARDRAIL STATUS]`);
  console.log(`  AI_AUTO_PUBLISH: ${process.env.AI_AUTO_PUBLISH || "false"}`);
  console.log(`  AI_AUTO_PUBLISH_ENABLED_BY_ADMIN: ${process.env.AI_AUTO_PUBLISH_ENABLED_BY_ADMIN || "false"}`);
  console.log(
    `  Effective Auto-Publish State: ${
      autoPublishPermitted ? "⚠️ PERMITTED (Dual flag override)" : "🔒 LOCKED (False — Human approval required)"
    }`
  );

  const providerKey = process.env.AI_PROVIDER_API_KEY?.trim();
  const hasKey = providerKey && !providerKey.startsWith("your-") && providerKey !== "";
  console.log(`\n[AI PROVIDER]`);
  console.log(`  Provider: ${process.env.AI_PROVIDER || "gemini"}`);
  console.log(`  Model: ${process.env.AI_MODEL_NAME || "gemini-2.5-flash"}`);
  console.log(`  API Key: ${hasKey ? "Configured" : "NOT CONFIGURED (Draft generation will fail honestly with TODO)"}`);

  const [sources, leads, aiArticles] = await Promise.all([
    prisma.source.findMany({ orderBy: { name: "asc" } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.article.findMany({ where: { isAiAssisted: true }, select: { id: true, title: true, status: true } }),
  ]);

  console.log(`\n[ALLOWLIST SOURCES] (Total: ${sources.length})`);
  sources.forEach((s) => {
    console.log(`  - [${s.isEnabled ? "ENABLED" : "DISABLED"}] ${s.name} (${s.domain}) Tier ${s.trustTier}`);
  });

  console.log(`\n[RECENT LEADS] (Showing ${leads.length})`);
  leads.forEach((l) => {
    console.log(`  - [${l.status}] "${l.title}" (${l.url})`);
  });

  console.log(`\n[AI-ASSISTED ARTICLES IN DB] (Total: ${aiArticles.length})`);
  aiArticles.forEach((a) => {
    console.log(`  - [${a.status}] "${a.title}" (ID: ${a.id})`);
  });

  console.log(`\n[HONEST ARCHITECTURAL NOTICE]`);
  console.log(`  Periodic automated background scraping is intentionally disabled.`);
  console.log(`  All leads must be manually entered or ingested through verified allowlisted feeds.`);
  console.log(`  All drafts remain in DRAFT / IN_REVIEW state until explicitly published by an admin.`);
  console.log("=================================================================\n");
}

main()
  .catch((e) => {
    console.error("Scan failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
