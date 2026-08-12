-- DropForeignKey
ALTER TABLE "EventStateTransition" DROP CONSTRAINT "EventStateTransition_tenantId_fkey";

-- DropIndex
DROP INDEX "EventStateTransition_createdAt_idx";

-- AlterTable
ALTER TABLE "EventStateTransition" ALTER COLUMN "trigger" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "consentSource" TEXT,
ADD COLUMN     "consentVersion" TEXT;

-- AlterTable
ALTER TABLE "Obituary" ADD COLUMN     "roomId" TEXT,
ADD COLUMN     "serviceAt" TIMESTAMP(3),
ADD COLUMN     "serviceType" TEXT DEFAULT 'VELATORIO';

-- CreateIndex
CREATE INDEX "EventStateTransition_eventId_createdAt_idx" ON "EventStateTransition"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "Obituary_roomId_idx" ON "Obituary"("roomId");

-- AddForeignKey
ALTER TABLE "EventStateTransition" ADD CONSTRAINT "EventStateTransition_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obituary" ADD CONSTRAINT "Obituary_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
