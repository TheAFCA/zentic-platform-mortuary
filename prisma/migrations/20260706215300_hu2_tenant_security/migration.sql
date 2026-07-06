-- AlterTable
ALTER TABLE "LeadNote" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "LeadNote_tenantId_idx" ON "LeadNote"("tenantId");

-- CreateIndex
CREATE INDEX "LeadNote_tenantId_createdAt_idx" ON "LeadNote"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Room_tenantId_idx" ON "Room"("tenantId");

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
