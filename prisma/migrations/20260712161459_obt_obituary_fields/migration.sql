-- AlterTable
ALTER TABLE "Deceased" ADD COLUMN     "birthCity" TEXT,
ADD COLUMN     "deathCity" TEXT;

-- AlterTable
ALTER TABLE "Obituary" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ObituaryMessage" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "iconType" TEXT;

-- CreateIndex
CREATE INDEX "Deceased_tenantId_deathDate_idx" ON "Deceased"("tenantId", "deathDate");
