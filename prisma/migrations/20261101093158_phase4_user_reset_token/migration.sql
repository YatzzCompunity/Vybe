-- AlterTable
ALTER TABLE "User" ADD COLUMN "resetTokenExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "resetTokenHash" TEXT;

-- CreateIndex
CREATE INDEX "User_resetTokenHash_idx" ON "User"("resetTokenHash");
