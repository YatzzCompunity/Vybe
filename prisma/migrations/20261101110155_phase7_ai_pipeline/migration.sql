-- AlterTable
ALTER TABLE "Article" ADD COLUMN "aiMetadataJson" TEXT;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "verifiedFacts" TEXT,
    "confidenceScore" REAL NOT NULL DEFAULT 1.0,
    "convertedArticleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_url_key" ON "Lead"("url");

-- CreateIndex
CREATE INDEX "Lead_sourceId_idx" ON "Lead"("sourceId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
