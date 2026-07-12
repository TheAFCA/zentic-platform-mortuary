-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "relationship" TEXT,
ADD COLUMN     "serviceDate" TIMESTAMP(3),
ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TenantAccountSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "locale" TEXT NOT NULL DEFAULT 'es',
    "notifyNewLead" BOOLEAN NOT NULL DEFAULT true,
    "notifyPendingMessages" BOOLEAN NOT NULL DEFAULT true,
    "notifyWeeklySummary" BOOLEAN NOT NULL DEFAULT false,
    "requireAccessCodeDefault" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantAccountSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantAccountSettings_tenantId_key" ON "TenantAccountSettings"("tenantId");

-- CreateIndex
CREATE INDEX "Event_tenantId_clientId_idx" ON "Event"("tenantId", "clientId");

-- AddForeignKey
ALTER TABLE "TenantAccountSettings" ADD CONSTRAINT "TenantAccountSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
