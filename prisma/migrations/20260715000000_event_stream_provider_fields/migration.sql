-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerStreamId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_providerStreamId_key" ON "Event"("providerStreamId");
