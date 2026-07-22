-- Refuerza las consultas aisladas por tenant de agenda e historial de estados.
CREATE INDEX IF NOT EXISTS "Event_tenantId_roomId_scheduledAt_idx"
ON "Event"("tenantId", "roomId", "scheduledAt");

CREATE INDEX IF NOT EXISTS "EventStateTransition_eventId_tenantId_idx"
ON "EventStateTransition"("eventId", "tenantId");
