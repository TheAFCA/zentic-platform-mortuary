-- CreateEnum
CREATE TYPE "TributeBookStatus" AS ENUM ('PROCESSING', 'READY', 'ERROR');

-- AlterTable
ALTER TABLE "ObituaryMessage" ADD COLUMN     "rejectedReason" TEXT;

-- CreateTable
CREATE TABLE "TributeBookGeneration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT,
    "obituaryId" TEXT,
    "generatedBy" TEXT NOT NULL,
    "status" "TributeBookStatus" NOT NULL DEFAULT 'PROCESSING',
    "pdfUrl" TEXT,
    "errorMessage" TEXT,
    "expiresAt" TIMESTAMP(3),
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TributeBookGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TributeBookGeneration_tenantId_idx" ON "TributeBookGeneration"("tenantId");

-- CreateIndex
CREATE INDEX "TributeBookGeneration_tenantId_createdAt_idx" ON "TributeBookGeneration"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "TributeBookGeneration_eventId_idx" ON "TributeBookGeneration"("eventId");

-- CreateIndex
CREATE INDEX "TributeBookGeneration_obituaryId_idx" ON "TributeBookGeneration"("obituaryId");

-- CreateIndex
CREATE INDEX "Message_tenantId_createdAt_idx" ON "Message"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ObituaryMessage_tenantId_createdAt_idx" ON "ObituaryMessage"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "TributeBookGeneration" ADD CONSTRAINT "TributeBookGeneration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TributeBookGeneration" ADD CONSTRAINT "TributeBookGeneration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TributeBookGeneration" ADD CONSTRAINT "TributeBookGeneration_obituaryId_fkey" FOREIGN KEY ("obituaryId") REFERENCES "Obituary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
