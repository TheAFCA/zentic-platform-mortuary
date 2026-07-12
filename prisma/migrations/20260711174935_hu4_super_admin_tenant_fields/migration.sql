-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "country" TEXT,
ADD COLUMN     "suspendReason" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ImpersonationLog_superAdminId_idx" ON "ImpersonationLog"("superAdminId");
