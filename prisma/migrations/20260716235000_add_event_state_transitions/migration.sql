-- Add new event statuses
ALTER TYPE "EventStatus" ADD VALUE 'PROVISIONING';
ALTER TYPE "EventStatus" ADD VALUE 'PROVISION_FAILED';

-- Create EventStateTransition model
CREATE TABLE "EventStateTransition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fromStatus" "EventStatus" NOT NULL,
    "toStatus" "EventStatus" NOT NULL,
    "trigger" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventStateTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventStateTransition_tenantId_idx" ON "EventStateTransition"("tenantId");
CREATE INDEX "EventStateTransition_eventId_idx" ON "EventStateTransition"("eventId");
CREATE INDEX "EventStateTransition_createdAt_idx" ON "EventStateTransition"("createdAt");

-- AddForeignKey
ALTER TABLE "EventStateTransition" ADD CONSTRAINT "EventStateTransition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventStateTransition" ADD CONSTRAINT "EventStateTransition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;