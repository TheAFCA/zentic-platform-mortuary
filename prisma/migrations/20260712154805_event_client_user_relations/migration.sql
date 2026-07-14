-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "assignedToId" TEXT;

-- CreateIndex
CREATE INDEX "Event_assignedToId_idx" ON "Event"("assignedToId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
