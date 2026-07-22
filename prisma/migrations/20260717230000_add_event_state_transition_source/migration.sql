-- Añade la columna `source` declarada en el modelo EventStateTransition (schema.prisma)
-- pero nunca creada por una migración: bloqueaba toda transición de estado
-- (incluida SCHEDULED -> PROVISIONING) con un error de columna inexistente.
ALTER TABLE "EventStateTransition" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
